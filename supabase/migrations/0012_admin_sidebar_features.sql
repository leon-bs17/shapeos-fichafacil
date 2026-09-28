-- Novas funcionalidades administrativas: central de comunicados.
-- Relatorios e saude do sistema usam as tabelas existentes.

create table if not exists public.admin_notificacoes (
  id uuid primary key default gen_random_uuid(),
  titulo text not null check (char_length(titulo) between 3 and 120),
  mensagem text not null check (char_length(mensagem) between 5 and 1500),
  publico text not null default 'TODOS' check (publico in ('TODOS', 'PERSONAL', 'ALUNO')),
  ativa boolean not null default true,
  criado_por uuid not null references public.usuarios(id) on delete restrict,
  criado_em timestamptz not null default now(),
  expira_em timestamptz null
);

create index if not exists admin_notificacoes_criado_em_idx
  on public.admin_notificacoes (criado_em desc);
create index if not exists admin_notificacoes_ativa_idx
  on public.admin_notificacoes (ativa, criado_em desc);

alter table public.admin_notificacoes enable row level security;

grant select, insert, update, delete on public.admin_notificacoes to authenticated;
grant select, insert, update, delete on public.admin_notificacoes to service_role;
revoke all on public.admin_notificacoes from anon;

drop policy if exists "admin_select_notificacoes" on public.admin_notificacoes;
create policy "admin_select_notificacoes"
on public.admin_notificacoes for select
to authenticated
using ((select public.eh_admin()));

drop policy if exists "admin_insert_notificacoes" on public.admin_notificacoes;
create policy "admin_insert_notificacoes"
on public.admin_notificacoes for insert
to authenticated
with check (
  (select public.eh_admin())
  and criado_por = (select auth.uid())
);

drop policy if exists "admin_update_notificacoes" on public.admin_notificacoes;
create policy "admin_update_notificacoes"
on public.admin_notificacoes for update
to authenticated
using ((select public.eh_admin()))
with check ((select public.eh_admin()));

drop policy if exists "admin_delete_notificacoes" on public.admin_notificacoes;
create policy "admin_delete_notificacoes"
on public.admin_notificacoes for delete
to authenticated
using ((select public.eh_admin()));
