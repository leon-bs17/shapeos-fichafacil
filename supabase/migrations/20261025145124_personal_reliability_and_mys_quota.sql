-- Keep privilege-bearing implementations outside the REST-exposed schema.
-- ALTER preserves function OIDs referenced by existing RLS policies.
create schema if not exists shapeos_private;
revoke all on schema shapeos_private from public;
grant usage on schema shapeos_private to authenticated, service_role, anon;
do $migration$
declare f record; calls text; volatility text; sig text;
begin
 for f in select p.oid,p.proname,p.pronargs,p.provolatile,
   pg_get_function_arguments(p.oid) args,
   pg_get_function_identity_arguments(p.oid) identity_args,
   pg_get_function_result(p.oid) result
   from pg_proc p join pg_namespace n on n.oid=p.pronamespace
   where n.nspname='public' and p.prosecdef and p.proname in
   ('auth_tipo_usuario','eh_admin','eh_personal_autenticado','eh_personal_do','tipo_de','cadastro_shapeos_aberto','admin_control','salvar_sessao_shapeos')
 loop
  sig:=format('%I(%s)',f.proname,f.identity_args);
  execute 'alter function public.'||sig||' set schema shapeos_private';
  execute 'revoke all on function shapeos_private.'||sig||' from public, anon, authenticated';
  execute 'grant execute on function shapeos_private.'||sig||' to authenticated, service_role';
  select coalesce(string_agg('$'||i,','),'') into calls from generate_series(1,f.pronargs) i;
  volatility:=case f.provolatile when 's' then 'stable' when 'i' then 'immutable' else 'volatile' end;
  execute format('create function public.%I(%s) returns %s language sql %s security invoker set search_path=public,pg_temp as %L',
   f.proname,f.args,f.result,volatility,format('select shapeos_private.%I(%s)',f.proname,calls));
  execute 'revoke all on function public.'||sig||' from public, anon, authenticated';
  execute 'grant execute on function public.'||sig||' to authenticated, service_role';
  if f.proname='cadastro_shapeos_aberto' then
   execute 'grant execute on function shapeos_private.'||sig||' to anon';
   execute 'grant execute on function public.'||sig||' to anon';
  end if;
 end loop;
 if to_regprocedure('public.criar_admin(text,text,text)') is not null then
  revoke execute on function public.criar_admin(text,text,text) from public,anon,authenticated;
 end if;
 if to_regprocedure('public.auto_confirm_new_auth_user()') is not null then
  alter function public.auto_confirm_new_auth_user() security invoker;
  revoke execute on function public.auto_confirm_new_auth_user() from public,anon,authenticated;
 end if;
end $migration$;

-- Active access, rather than only a role label, is required for Personal helpers.
create or replace function shapeos_private.eh_personal_autenticado()
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select exists(select 1 from public.usuarios where id=auth.uid() and tipo='PERSONAL' and status_conta='ATIVO')
$$;
-- The role lookup is only needed for self, administrators, or linked students.
create or replace function shapeos_private.tipo_de(usuario uuid)
returns public.tipo_usuario language sql stable security definer set search_path=public,pg_temp as $$
 select u.tipo from public.usuarios u where u.id=usuario and
 (u.id=auth.uid() or public.eh_admin() or
  (public.eh_personal_autenticado() and exists(select 1 from public.personal_alunos pa where pa.personal_id=auth.uid() and pa.aluno_id=u.id)))
$$;
revoke all on function shapeos_private.eh_personal_autenticado(),shapeos_private.tipo_de(uuid) from public,anon;

create table shapeos_private.mys_cotas (
 chave text primary key,
 periodo timestamptz not null,
 quantidade integer not null check(quantidade>=0)
);
alter table shapeos_private.mys_cotas enable row level security;
revoke all on shapeos_private.mys_cotas from public,anon,authenticated;

create function shapeos_private.consumir_cota_mys()
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
 uid uuid:=auth.uid(); current_time_at timestamptz:=clock_timestamp();
 minute_start timestamptz; day_start timestamptz; next_day timestamptz;
 keys text[]; starts timestamptz[]; limits integer[]:=array[8,100,1000];
 reasons text[]:=array['minuto','dia','global']; used integer; i integer;
begin
 if uid is null or not exists(select 1 from public.usuarios where id=uid and tipo in ('ADMIN','PERSONAL') and status_conta='ATIVO') then
  raise exception 'Conta ativa de administrador ou personal necessária' using errcode='42501';
 end if;
 -- One short transaction lock makes all three checks and increments atomic.
 perform pg_advisory_xact_lock(139724783);
 current_time_at:=clock_timestamp();
 minute_start:=date_trunc('minute',current_time_at);
 day_start:=date_trunc('day',current_time_at at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo';
 next_day:=(date_trunc('day',current_time_at at time zone 'America/Sao_Paulo')+interval '1 day') at time zone 'America/Sao_Paulo';
 keys:=array['minute:'||uid,'day:'||uid,'global:day'];
 starts:=array[minute_start,day_start,day_start];
 for i in 1..3 loop
  select quantidade into used from shapeos_private.mys_cotas where chave=keys[i] and periodo=starts[i];
  if coalesce(used,0)>=limits[i] then
   return jsonb_build_object('permitido',false,'motivo',reasons[i],
    'retry_after',greatest(1,ceil(extract(epoch from (case when i=1 then minute_start+interval '1 minute' else next_day end-current_time_at)))));
  end if;
 end loop;
 for i in 1..3 loop
  insert into shapeos_private.mys_cotas(chave,periodo,quantidade) values(keys[i],starts[i],1)
  on conflict(chave) do update set periodo=excluded.periodo,
   quantidade=case when mys_cotas.periodo=excluded.periodo then mys_cotas.quantidade+1 else 1 end;
 end loop;
 return jsonb_build_object('permitido',true);
end $$;
revoke all on function shapeos_private.consumir_cota_mys() from public,anon;
grant execute on function shapeos_private.consumir_cota_mys() to authenticated;
create function public.consumir_cota_mys()
returns jsonb language sql volatile security invoker set search_path=public,pg_temp as $$
 select shapeos_private.consumir_cota_mys()
$$;
revoke all on function public.consumir_cota_mys() from public,anon;
grant execute on function public.consumir_cota_mys() to authenticated;
