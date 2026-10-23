create table public.personal_comunicados (
  id uuid primary key default gen_random_uuid(),
  envio_id uuid not null,
  personal_id uuid not null references public.usuarios(id) on delete cascade,
  aluno_id uuid not null references public.usuarios(id) on delete cascade,
  remetente_nome text not null,
  aluno_nome text not null,
  titulo text not null check (char_length(btrim(titulo)) between 3 and 120),
  mensagem text not null check (char_length(btrim(mensagem)) between 1 and 4000),
  criado_em timestamptz not null default now(),
  unique (personal_id,envio_id,aluno_id)
);
create index personal_comunicados_aluno_idx on public.personal_comunicados(aluno_id,criado_em desc,id desc);
create index personal_comunicados_envio_idx on public.personal_comunicados(personal_id,criado_em desc,envio_id);
alter table public.personal_comunicados enable row level security;
revoke all on public.personal_comunicados from public,anon,authenticated;
grant select on public.personal_comunicados to authenticated;
grant insert(envio_id,personal_id,aluno_id,remetente_nome,aluno_nome,titulo,mensagem) on public.personal_comunicados to authenticated;
create policy personal_comunicados_select on public.personal_comunicados for select to authenticated using (
  ((select auth.uid())=personal_id or (select auth.uid())=aluno_id)
  and exists(select 1 from public.usuarios u where u.id=(select auth.uid()) and u.status_conta='ATIVO')
);
create policy personal_comunicados_insert on public.personal_comunicados for insert to authenticated with check (
  personal_id=(select auth.uid())
  and exists(select 1 from public.usuarios u where u.id=(select auth.uid()) and u.tipo='PERSONAL' and u.status_conta='ATIVO' and u.nome=remetente_nome)
  and exists(select 1 from public.personal_alunos pa join public.usuarios u on u.id=pa.aluno_id where pa.personal_id=(select auth.uid()) and pa.aluno_id=personal_comunicados.aluno_id and pa.status='ATIVO' and u.tipo='ALUNO' and u.status_conta='ATIVO' and u.nome=aluno_nome)
);
create table public.personal_comunicado_leituras (
  comunicado_id uuid primary key references public.personal_comunicados(id) on delete cascade,
  lida_em timestamptz not null default now()
);
alter table public.personal_comunicado_leituras enable row level security;
revoke all on public.personal_comunicado_leituras from public,anon,authenticated;
grant select on public.personal_comunicado_leituras to authenticated;
grant insert(comunicado_id) on public.personal_comunicado_leituras to authenticated;
create policy personal_leituras_select on public.personal_comunicado_leituras for select to authenticated using (
  exists(select 1 from public.personal_comunicados c where c.id=comunicado_id and (c.personal_id=(select auth.uid()) or c.aluno_id=(select auth.uid())))
);
create policy personal_leituras_insert on public.personal_comunicado_leituras for insert to authenticated with check (
  exists(select 1 from public.personal_comunicados c where c.id=comunicado_id and c.aluno_id=(select auth.uid()))
);

create function public.publicar_comunicado_personal(p_envio_id uuid,p_titulo text,p_mensagem text,p_alunos uuid[])
returns integer language plpgsql security invoker set search_path='' as $$
declare v_uid uuid:=(select auth.uid());v_nome text;v_ids uuid[];v_total integer;v_match integer;
begin
  select nome into v_nome from public.usuarios where id=v_uid and tipo='PERSONAL' and status_conta='ATIVO';
  if v_nome is null then raise exception 'Conta do Personal sem acesso' using errcode='42501';end if;
  if p_envio_id is null or p_titulo is null or char_length(btrim(p_titulo)) not between 3 and 120 or p_mensagem is null or char_length(btrim(p_mensagem)) not between 1 and 4000 then raise exception 'Revise título e mensagem' using errcode='22023';end if;
  select array_agg(distinct id order by id) filter(where id is not null) into v_ids from unnest(p_alunos) id;
  if v_ids is null or cardinality(v_ids) not between 1 and 100 or cardinality(v_ids)<>cardinality(p_alunos) then raise exception 'Selecione de 1 a 100 alunos sem duplicações' using errcode='22023';end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_uid::text||':'||p_envio_id::text,0));
  select count(*),count(*) filter(where aluno_id=any(v_ids) and titulo=btrim(p_titulo) and mensagem=btrim(p_mensagem)) into v_total,v_match from public.personal_comunicados where personal_id=v_uid and envio_id=p_envio_id;
  if v_total>0 then
    if v_total=cardinality(v_ids) and v_match=v_total then return v_total;end if;
    raise exception 'Este envio já foi usado para outro conteúdo' using errcode='22023';
  end if;
  select count(*) into v_total from public.personal_alunos pa join public.usuarios u on u.id=pa.aluno_id where pa.personal_id=v_uid and pa.status='ATIVO' and pa.aluno_id=any(v_ids) and u.tipo='ALUNO' and u.status_conta='ATIVO';
  if v_total<>cardinality(v_ids) then raise exception 'Um destinatário não tem vínculo ativo ou acesso liberado' using errcode='42501';end if;
  insert into public.personal_comunicados(envio_id,personal_id,aluno_id,remetente_nome,aluno_nome,titulo,mensagem)
    select p_envio_id,v_uid,u.id,v_nome,u.nome,btrim(p_titulo),btrim(p_mensagem) from public.usuarios u where u.id=any(v_ids);
  get diagnostics v_total=row_count;
  if v_total<>cardinality(v_ids) then raise exception 'Envio incompleto; nenhuma mensagem foi publicada' using errcode='42501';end if;
  return v_total;
end;$$;
revoke all on function public.publicar_comunicado_personal(uuid,text,text,uuid[]) from public,anon;
grant execute on function public.publicar_comunicado_personal(uuid,text,text,uuid[]) to authenticated;

create view public.personal_comunicados_enviados with(security_invoker=true) as
select c.personal_id,c.envio_id,min(c.titulo) as titulo,min(c.mensagem) as mensagem,min(c.criado_em) as criado_em,count(*)::integer as destinatarios,count(l.lida_em)::integer as leituras,
  jsonb_agg(jsonb_build_object('aluno_id',c.aluno_id,'nome',c.aluno_nome,'lida_em',l.lida_em) order by c.aluno_nome,c.aluno_id) as alunos
from public.personal_comunicados c left join public.personal_comunicado_leituras l on l.comunicado_id=c.id
where c.personal_id=(select auth.uid()) group by c.personal_id,c.envio_id;
revoke all on public.personal_comunicados_enviados from public,anon,authenticated;
grant select on public.personal_comunicados_enviados to authenticated;

create or replace view public.notificacoes_recebidas with(security_invoker=true) as
select n.id,n.titulo,n.mensagem,n.criado_em,l.lida_em from public.admin_notificacoes n
join public.usuarios u on u.id=(select auth.uid()) and u.status_conta='ATIVO'
left join public.notificacao_leituras l on l.notificacao_id=n.id and l.usuario_id=(select auth.uid())
where n.ativa and (n.expira_em is null or n.expira_em>now()) and (n.publico='TODOS' or n.publico=u.tipo::text)
union all
select c.id,c.remetente_nome||' · '||c.titulo,c.mensagem,c.criado_em,l.lida_em from public.personal_comunicados c
left join public.personal_comunicado_leituras l on l.comunicado_id=c.id where c.aluno_id=(select auth.uid());

create or replace function public.marcar_notificacoes_lidas(p_ids uuid[] default null)
returns integer language plpgsql security invoker set search_path='' as $$
declare v_admin integer;v_personal integer;
begin
  if (select auth.uid()) is null then raise exception 'Sessão não reconhecida' using errcode='42501';end if;
  insert into public.notificacao_leituras(usuario_id,notificacao_id)
    select (select auth.uid()),n.id from public.notificacoes_recebidas n where n.lida_em is null and (p_ids is null or n.id=any(p_ids)) and exists(select 1 from public.admin_notificacoes a where a.id=n.id)
    on conflict(usuario_id,notificacao_id) do nothing;
  get diagnostics v_admin=row_count;
  insert into public.personal_comunicado_leituras(comunicado_id)
    select n.id from public.notificacoes_recebidas n where n.lida_em is null and (p_ids is null or n.id=any(p_ids)) and exists(select 1 from public.personal_comunicados c where c.id=n.id and c.aluno_id=(select auth.uid()))
    on conflict(comunicado_id) do nothing;
  get diagnostics v_personal=row_count;
  return v_admin+v_personal;
end;$$;
