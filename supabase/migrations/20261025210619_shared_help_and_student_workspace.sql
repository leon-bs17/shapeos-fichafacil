-- Shared help desk. Keep aluno_id as the legacy requester key (Aluno or Personal).
alter table public.solicitacoes_suporte add column solicitante_nome text not null default '';
alter table public.solicitacoes_suporte add column solicitante_tipo text not null default 'ALUNO' check(solicitante_tipo in ('ALUNO','PERSONAL','ADMIN'));
alter table public.solicitacoes_suporte add column atualizado_em timestamptz not null default now();
update public.solicitacoes_suporte s set solicitante_nome=u.nome,solicitante_tipo=u.tipo::text from public.usuarios u where u.id=s.aluno_id;
create index suporte_solicitante_criado on public.solicitacoes_suporte(aluno_id,criado_em desc,id desc);
create index suporte_personal_criado on public.solicitacoes_suporte(personal_id,criado_em desc,id desc);
create index suporte_destino_status on public.solicitacoes_suporte(destino,status,criado_em desc);

create function shapeos_private.suporte_acesso(p_solicitante uuid,p_personal uuid,p_destino text)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.usuarios u where u.id=(select auth.uid()) and u.status_conta='ATIVO' and
  (u.id=p_solicitante or (u.tipo='ADMIN' and p_destino='SISTEMA') or
   (u.tipo='PERSONAL' and p_destino='PERSONAL' and u.id=p_personal and exists(select 1 from public.personal_alunos pa where pa.personal_id=u.id and pa.aluno_id=p_solicitante and pa.status='ATIVO'))))
$$;
revoke all on function shapeos_private.suporte_acesso(uuid,uuid,text) from public,anon;
grant execute on function shapeos_private.suporte_acesso(uuid,uuid,text) to authenticated;
drop policy if exists solicitacoes_select_participantes on public.solicitacoes_suporte;
drop policy if exists solicitacoes_insert_aluno on public.solicitacoes_suporte;
create policy suporte_leitura on public.solicitacoes_suporte for select to authenticated using(shapeos_private.suporte_acesso(aluno_id,personal_id,destino));
revoke insert,update,delete on public.solicitacoes_suporte from authenticated;

create table public.suporte_mensagens(
 id uuid primary key default gen_random_uuid(),
 solicitacao_id uuid not null references public.solicitacoes_suporte(id) on delete cascade,
 autor_id uuid references public.usuarios(id) on delete set null,
 autor_nome text not null, autor_tipo text not null check(autor_tipo in('ADMIN','PERSONAL','ALUNO')),
 mensagem text not null check(length(btrim(mensagem)) between 1 and 2000),
 status text check(status in('ABERTO','EM_ATENDIMENTO','RESOLVIDO')),
 criado_em timestamptz not null default now()
);
create index suporte_mensagens_solicitacao on public.suporte_mensagens(solicitacao_id,criado_em,id);
create index suporte_mensagens_autor on public.suporte_mensagens(autor_id,criado_em);
alter table public.suporte_mensagens enable row level security;
revoke all on public.suporte_mensagens from public,anon,authenticated;
grant select on public.suporte_mensagens to authenticated;
create policy suporte_mensagens_leitura on public.suporte_mensagens for select to authenticated using(exists(select 1 from public.solicitacoes_suporte s where s.id=solicitacao_id and shapeos_private.suporte_acesso(s.aluno_id,s.personal_id,s.destino)));

create function shapeos_private.abrir_suporte(p_id uuid,p_destino text,p_personal uuid,p_assunto text,p_mensagem text)
returns uuid language plpgsql security definer set search_path='' as $$
declare u public.usuarios%rowtype; existing public.solicitacoes_suporte%rowtype;
begin
 select * into u from public.usuarios where id=auth.uid() and status_conta='ATIVO' and tipo in('ALUNO','PERSONAL');
 if not found then raise exception 'Somente Alunos e Personais ativos podem abrir solicitações' using errcode='42501';end if;
 if p_id is null or p_destino is null or p_destino not in('PERSONAL','SISTEMA') or p_assunto is null or length(btrim(p_assunto)) not between 3 and 120 or p_mensagem is null or length(btrim(p_mensagem)) not between 10 and 2000 then raise exception 'Revise assunto e mensagem' using errcode='22023';end if;
 if (p_destino='SISTEMA' and p_personal is not null) or (p_destino='PERSONAL' and (u.tipo<>'ALUNO' or p_personal is null or not exists(select 1 from public.personal_alunos pa join public.usuarios trainer on trainer.id=pa.personal_id where pa.aluno_id=u.id and pa.personal_id=p_personal and pa.status='ATIVO' and trainer.tipo='PERSONAL' and trainer.status_conta='ATIVO'))) then raise exception 'Destino sem permissão ou vínculo inativo' using errcode='42501';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('suporte:'||u.id::text,0));
 select * into existing from public.solicitacoes_suporte where id=p_id;
 if found then
  if existing.aluno_id=u.id and existing.destino=p_destino and existing.personal_id is not distinct from p_personal and existing.assunto=btrim(p_assunto) and existing.mensagem=btrim(p_mensagem) then return p_id;end if;
  raise exception 'Identificador já utilizado; revise a solicitação' using errcode='22023';
 end if;
 if (select count(*) from public.solicitacoes_suporte where aluno_id=u.id and criado_em>now()-interval '1 day')>=20 then raise exception 'Limite diário de solicitações atingido' using errcode='22023';end if;
 insert into public.solicitacoes_suporte(id,aluno_id,destino,personal_id,assunto,mensagem,solicitante_nome,solicitante_tipo)
 values(p_id,u.id,p_destino,p_personal,btrim(p_assunto),btrim(p_mensagem),u.nome,u.tipo::text);
 return p_id;
end $$;

create function shapeos_private.responder_suporte(p_id uuid,p_mensagem text,p_status text,p_mensagem_id uuid)
returns void language plpgsql security definer set search_path='' as $$
declare s public.solicitacoes_suporte%rowtype; u public.usuarios%rowtype; handler boolean; next_status text; content text;
begin
 select * into u from public.usuarios where id=auth.uid() and status_conta='ATIVO';
 if not found then raise exception 'Conta sem acesso' using errcode='42501';end if;
 select * into s from public.solicitacoes_suporte where id=p_id for update;
 if not found or not shapeos_private.suporte_acesso(s.aluno_id,s.personal_id,s.destino) then raise exception 'Solicitação fora do seu acesso' using errcode='42501';end if;
 handler=(u.tipo='ADMIN' and s.destino='SISTEMA') or (u.tipo='PERSONAL' and s.destino='PERSONAL' and s.personal_id=u.id);
 if p_status is not null and (not handler or p_status not in('ABERTO','EM_ATENDIMENTO','RESOLVIDO')) then raise exception 'Somente o responsável pode alterar o status' using errcode='42501';end if;
 if p_mensagem_id is null or length(coalesce(btrim(p_mensagem),''))>2000 then raise exception 'Escreva uma resposta ou altere o status' using errcode='22023';end if;
 next_status=coalesce(p_status,case when not handler and s.status='RESOLVIDO' then 'ABERTO' else s.status end);
 content=coalesce(nullif(btrim(p_mensagem),''),'Status alterado para '||case next_status when 'ABERTO' then 'Aberto' when 'EM_ATENDIMENTO' then 'Em atendimento' else 'Resolvido' end||'.');
 if exists(select 1 from public.suporte_mensagens where id=p_mensagem_id) then
  if exists(select 1 from public.suporte_mensagens where id=p_mensagem_id and solicitacao_id=p_id and autor_id=u.id and mensagem=content and status is not distinct from p_status) then return;end if;
  raise exception 'Resposta já utilizada' using errcode='22023';
 end if;
 if coalesce(btrim(p_mensagem),'')='' and (p_status is null or p_status=s.status) then raise exception 'Escreva uma resposta ou altere o status' using errcode='22023';end if;
 if (select count(*) from public.suporte_mensagens where autor_id=u.id and criado_em>now()-interval '1 hour')>=60 then raise exception 'Aguarde antes de enviar mais respostas' using errcode='22023';end if;
 insert into public.suporte_mensagens(id,solicitacao_id,autor_id,autor_nome,autor_tipo,mensagem,status) values(p_mensagem_id,p_id,u.id,u.nome,u.tipo::text,content,p_status);
 update public.solicitacoes_suporte set status=next_status,atualizado_em=now() where id=p_id;
end $$;
revoke all on function shapeos_private.abrir_suporte(uuid,text,uuid,text,text),shapeos_private.responder_suporte(uuid,text,text,uuid) from public,anon;
grant execute on function shapeos_private.abrir_suporte(uuid,text,uuid,text,text),shapeos_private.responder_suporte(uuid,text,text,uuid) to authenticated;
create function public.abrir_suporte(p_id uuid,p_destino text,p_personal uuid,p_assunto text,p_mensagem text) returns uuid language sql volatile security invoker set search_path='' as $$select shapeos_private.abrir_suporte(p_id,p_destino,p_personal,p_assunto,p_mensagem)$$;
create function public.responder_suporte(p_id uuid,p_mensagem text,p_status text,p_mensagem_id uuid) returns void language sql volatile security invoker set search_path='' as $$select shapeos_private.responder_suporte(p_id,p_mensagem,p_status,p_mensagem_id)$$;
revoke all on function public.abrir_suporte(uuid,text,uuid,text,text),public.responder_suporte(uuid,text,text,uuid) from public,anon;
grant execute on function public.abrir_suporte(uuid,text,uuid,text,text),public.responder_suporte(uuid,text,text,uuid) to authenticated;

-- Return only the signed-in student's active trainers; never expose other profiles.
create function shapeos_private.meus_personais() returns table(id uuid,nome text,proxima_avaliacao_em date) language sql stable security definer set search_path='' as $$
 select u.id,u.nome,pa.proxima_avaliacao_em from public.personal_alunos pa join public.usuarios u on u.id=pa.personal_id
 where pa.aluno_id=(select auth.uid()) and pa.status='ATIVO' and u.tipo='PERSONAL' and u.status_conta='ATIVO'
 and exists(select 1 from public.usuarios me where me.id=(select auth.uid()) and me.tipo='ALUNO' and me.status_conta='ATIVO') order by u.nome,u.id
$$;
revoke all on function shapeos_private.meus_personais() from public,anon;
grant execute on function shapeos_private.meus_personais() to authenticated;
create function public.meus_personais() returns table(id uuid,nome text,proxima_avaliacao_em date) language sql stable security invoker set search_path='' as $$select * from shapeos_private.meus_personais()$$;
revoke all on function public.meus_personais() from public,anon;
grant execute on function public.meus_personais() to authenticated;

-- Students use the same atomic, account-scoped quotas.
create or replace function shapeos_private.consumir_cota_mys()
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
 uid uuid:=auth.uid(); current_time_at timestamptz:=clock_timestamp();
 minute_start timestamptz; day_start timestamptz; next_day timestamptz;
 keys text[]; starts timestamptz[]; limits integer[]:=array[8,100,1000];
 reasons text[]:=array['minuto','dia','global']; used integer; i integer;
begin
 if uid is null or not exists(select 1 from public.usuarios where id=uid and tipo in ('ADMIN','PERSONAL','ALUNO') and status_conta='ATIVO') then
  raise exception 'Conta ativa necessária' using errcode='42501';
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

notify pgrst,'reload schema';
