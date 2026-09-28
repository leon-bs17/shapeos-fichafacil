-- Ciclo de vida de contas administrado pelo painel ADMIN.
-- Usuarios existentes permanecem ATIVO. Novos PERSONAIS entram como PENDENTE.

alter table public.usuarios
  add column if not exists status_conta text not null default 'ATIVO';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'usuarios_status_conta_check'
  ) then
    alter table public.usuarios
      add constraint usuarios_status_conta_check
      check (status_conta in ('ATIVO', 'PENDENTE', 'BLOQUEADO'));
  end if;
end $$;

create table if not exists public.admin_auditoria (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.usuarios(id) on delete restrict,
  usuario_id uuid references public.usuarios(id) on delete set null,
  acao text not null check (
    acao in ('APROVAR_USUARIO', 'BLOQUEAR_USUARIO', 'REATIVAR_USUARIO', 'ALTERAR_TIPO')
  ),
  detalhes jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now()
);

create index if not exists admin_auditoria_criado_em_idx
  on public.admin_auditoria (criado_em desc);
create index if not exists admin_auditoria_usuario_id_idx
  on public.admin_auditoria (usuario_id);

alter table public.admin_auditoria enable row level security;

grant select, insert on public.admin_auditoria to authenticated;
grant all on public.admin_auditoria to service_role;

drop policy if exists "admin_select_auditoria" on public.admin_auditoria;
create policy "admin_select_auditoria"
on public.admin_auditoria for select
to authenticated
using ((select public.eh_admin()));

drop policy if exists "admin_insert_auditoria" on public.admin_auditoria;
create policy "admin_insert_auditoria"
on public.admin_auditoria for insert
to authenticated
with check (
  (select public.eh_admin())
  and admin_id = (select auth.uid())
);

create or replace function public.criar_usuario_autenticado()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tipo public.tipo_usuario;
begin
  v_tipo := coalesce(
    case
      when new.raw_user_meta_data ->> 'tipo' in ('PERSONAL', 'ALUNO')
        then (new.raw_user_meta_data ->> 'tipo')::public.tipo_usuario
    end,
    'PERSONAL'::public.tipo_usuario
  );

  insert into public.usuarios (id, nome, email, tipo, status_conta)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nome', split_part(new.email, '@', 1)),
    new.email,
    v_tipo,
    case when v_tipo = 'PERSONAL' then 'PENDENTE' else 'ATIVO' end
  );

  return new;
end;
$$;

-- A funcao e usada apenas como trigger interno do Auth; nao deve ser RPC publico.
revoke execute on function public.criar_usuario_autenticado() from public, anon, authenticated;
