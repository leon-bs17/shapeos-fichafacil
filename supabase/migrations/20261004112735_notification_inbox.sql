-- Received notifications and per-user read receipts.
-- Communicado administration remains in admin_notificacoes.
create table public.notificacao_leituras (
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  notificacao_id uuid not null references public.admin_notificacoes(id) on delete cascade,
  lida_em timestamptz not null default now(),
  primary key (usuario_id, notificacao_id)
);

create index notificacao_leituras_notificacao_idx
  on public.notificacao_leituras (notificacao_id);

alter table public.notificacao_leituras enable row level security;
revoke all on public.notificacao_leituras from anon, authenticated;
grant select, insert on public.notificacao_leituras to authenticated;
grant all on public.notificacao_leituras to service_role;

create policy "leituras_select_proprio"
on public.notificacao_leituras for select to authenticated
using (usuario_id = (select auth.uid()));

-- Keep existing administrative policies; recipients only read active, unexpired
-- communications addressed to their current database profile.
drop policy if exists "destinatario_le_notificacao" on public.admin_notificacoes;
create policy "destinatario_le_notificacao"
on public.admin_notificacoes for select to authenticated
using (
  ativa
  and (expira_em is null or expira_em > now())
  and (publico = 'TODOS' or publico = (select public.auth_tipo_usuario())::text)
  and exists (
    select 1 from public.usuarios u
    where u.id = (select auth.uid()) and u.status_conta = 'ATIVO'
  )
);

create policy "leituras_insert_proprio_destinatario"
on public.notificacao_leituras for insert to authenticated
with check (
  usuario_id = (select auth.uid())
  and exists (
    select 1
    from public.admin_notificacoes n
    join public.usuarios u on u.id = (select auth.uid())
    where n.id = notificacao_id
      and u.status_conta = 'ATIVO'
      and n.ativa
      and (n.expira_em is null or n.expira_em > now())
      and (n.publico = 'TODOS' or n.publico = u.tipo::text)
  )
);

create view public.notificacoes_recebidas
with (security_invoker = true) as
select n.id, n.titulo, n.mensagem, n.criado_em, l.lida_em
from public.admin_notificacoes n
join public.usuarios u
  on u.id = (select auth.uid()) and u.status_conta = 'ATIVO'
left join public.notificacao_leituras l
  on l.notificacao_id = n.id and l.usuario_id = (select auth.uid())
where n.ativa
  and (n.expira_em is null or n.expira_em > now())
  and (n.publico = 'TODOS' or n.publico = u.tipo::text);

revoke all on public.notificacoes_recebidas from anon, authenticated;
grant select on public.notificacoes_recebidas to authenticated, service_role;

-- No elevated privileges: RLS also applies to marking one or all notifications.
-- ON CONFLICT preserves the first read date and makes concurrent reads safe.
create function public.marcar_notificacoes_lidas(p_ids uuid[] default null)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  total integer;
begin
  if (select auth.uid()) is null then
    raise exception 'Sessão não reconhecida' using errcode = '42501';
  end if;

  insert into public.notificacao_leituras (usuario_id, notificacao_id)
  select (select auth.uid()), n.id
  from public.notificacoes_recebidas n
  where n.lida_em is null and (p_ids is null or n.id = any(p_ids))
  on conflict (usuario_id, notificacao_id) do nothing;

  get diagnostics total = row_count;
  return total;
end;
$$;

revoke all on function public.marcar_notificacoes_lidas(uuid[]) from public, anon;
grant execute on function public.marcar_notificacoes_lidas(uuid[]) to authenticated, service_role;
