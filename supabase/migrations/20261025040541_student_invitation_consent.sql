-- Invitations do not grant access. Only the invited student can activate a link.
create schema if not exists shapeos_private;
revoke all on schema shapeos_private from public, anon;
grant usage on schema shapeos_private to authenticated;

create table public.convites_aluno (
  id uuid primary key default gen_random_uuid(),
  personal_id uuid not null references public.usuarios(id) on delete cascade,
  personal_nome text not null,
  email text not null check(email=lower(trim(email)) and email like '%@%'),
  estado text not null default 'PENDENTE' check(estado in ('PENDENTE','ACEITO','RECUSADO','CANCELADO','EXPIRADO')),
  criado_em timestamptz not null default now(),
  expira_em timestamptz not null default now()+interval '24 hours',
  resolvido_em timestamptz,
  aceito_por uuid references public.usuarios(id) on delete set null,
  vinculo_id uuid references public.personal_alunos(id) on delete set null,
  check(expira_em>criado_em and expira_em<=criado_em+interval '24 hours')
);
create unique index convites_aluno_pendente_unico on public.convites_aluno(personal_id,email) where estado='PENDENTE';
create index convites_aluno_destinatario on public.convites_aluno(email,expira_em) where estado='PENDENTE';
create index convites_aluno_aceito_por on public.convites_aluno(aceito_por) where aceito_por is not null;
create index convites_aluno_vinculo on public.convites_aluno(vinculo_id) where vinculo_id is not null;
alter table public.convites_aluno enable row level security;
revoke all on public.convites_aluno from public,anon,authenticated;
grant select on public.convites_aluno to authenticated;
grant select,insert,update on public.convites_aluno to service_role;
create policy convites_leitura_personal on public.convites_aluno for select to authenticated
using(personal_id=(select auth.uid()));
create policy convites_leitura_aluno on public.convites_aluno for select to authenticated
using(exists(select 1 from public.usuarios u where u.id=(select auth.uid()) and u.tipo='ALUNO' and u.status_conta='ATIVO' and lower(u.email)=convites_aluno.email));

-- Keep Admin's privileged workflow; revoke automatic linking by trainers.
drop policy if exists vinculos_insert_personal on public.personal_alunos;
create or replace function shapeos_private.proteger_identidade_vinculo()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
  if current_user not in ('postgres','service_role') and (
    new.id is distinct from old.id or new.personal_id is distinct from old.personal_id
    or new.aluno_id is distinct from old.aluno_id or new.criado_em is distinct from old.criado_em
  ) then raise exception 'Os participantes de um vínculo não podem ser alterados.' using errcode='42501'; end if;
  return new;
end $$;
create trigger proteger_identidade_vinculo before update on public.personal_alunos
for each row execute function shapeos_private.proteger_identidade_vinculo();

create function shapeos_private.responder_convite_aluno(p_convite_id uuid,p_aceitar boolean)
returns uuid language plpgsql security definer set search_path='' as $$
declare
  v_uid uuid:=auth.uid(); v_email text; v_convite public.convites_aluno%rowtype; v_vinculo uuid;
begin
  if v_uid is null or p_aceitar is null then raise exception 'Sessão inválida.' using errcode='42501'; end if;
  select lower(email) into v_email from public.usuarios where id=v_uid and tipo='ALUNO' and status_conta='ATIVO';
  if v_email is null then raise exception 'Apenas a conta de aluno convidada pode responder.' using errcode='42501'; end if;
  select * into v_convite from public.convites_aluno where id=p_convite_id for update;
  if not found or v_convite.email<>v_email then raise exception 'Convite não encontrado para esta conta.' using errcode='42501'; end if;
  if v_convite.estado='ACEITO' and p_aceitar and v_convite.aceito_por=v_uid and v_convite.vinculo_id is not null then return v_convite.vinculo_id; end if;
  if v_convite.estado='RECUSADO' and not p_aceitar then return null; end if;
  if v_convite.estado<>'PENDENTE' or v_convite.expira_em<=clock_timestamp() then raise exception 'Convite inválido ou expirado.'; end if;
  if not exists(select 1 from public.usuarios where id=v_convite.personal_id and tipo='PERSONAL' and status_conta='ATIVO') then raise exception 'O personal deste convite não está ativo.'; end if;
  if not p_aceitar then
    update public.convites_aluno set estado='RECUSADO',resolvido_em=clock_timestamp() where id=p_convite_id;
    return null;
  end if;
  insert into public.personal_alunos(personal_id,aluno_id,status)
  values(v_convite.personal_id,v_uid,'ATIVO')
  on conflict(personal_id,aluno_id) do update set status='ATIVO' returning id into v_vinculo;
  update public.convites_aluno set estado='ACEITO',resolvido_em=clock_timestamp(),aceito_por=v_uid,vinculo_id=v_vinculo where id=p_convite_id;
  return v_vinculo;
end $$;
revoke all on function shapeos_private.responder_convite_aluno(uuid,boolean) from public,anon;
grant execute on function shapeos_private.responder_convite_aluno(uuid,boolean) to authenticated;
create function public.responder_convite_aluno(p_convite_id uuid,p_aceitar boolean)
returns uuid language sql security invoker set search_path='' as $$
  select shapeos_private.responder_convite_aluno(p_convite_id,p_aceitar);
$$;
revoke all on function public.responder_convite_aluno(uuid,boolean) from public,anon;
grant execute on function public.responder_convite_aluno(uuid,boolean) to authenticated;
