create table public.solicitacoes_suporte (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references public.usuarios(id) on delete cascade,
  destino text not null check (destino in ('PERSONAL', 'SISTEMA')),
  personal_id uuid references public.usuarios(id) on delete set null,
  assunto text not null check (char_length(trim(assunto)) between 3 and 120),
  mensagem text not null check (char_length(trim(mensagem)) between 10 and 2000),
  status text not null default 'ABERTO' check (status in ('ABERTO', 'EM_ATENDIMENTO', 'RESOLVIDO')),
  criado_em timestamptz not null default now(),
  constraint solicitacoes_suporte_destino_personal_check check (
    (destino = 'PERSONAL' and personal_id is not null)
    or (destino = 'SISTEMA' and personal_id is null)
  )
);

alter table public.solicitacoes_suporte enable row level security;

create index solicitacoes_suporte_aluno_criado_idx
  on public.solicitacoes_suporte (aluno_id, criado_em desc);
create index solicitacoes_suporte_personal_criado_idx
  on public.solicitacoes_suporte (personal_id, criado_em desc)
  where personal_id is not null;
create index solicitacoes_suporte_destino_status_idx
  on public.solicitacoes_suporte (destino, status);

-- A tabela é exposta somente a usuários autenticados e com privilégio mínimo.
revoke all on table public.solicitacoes_suporte from anon;
revoke update, delete, truncate, references, trigger on table public.solicitacoes_suporte from authenticated;
grant select, insert on table public.solicitacoes_suporte to authenticated;
grant select, insert, update, delete on table public.solicitacoes_suporte to service_role;

create policy solicitacoes_select_participantes
on public.solicitacoes_suporte
for select
to authenticated
using (
  aluno_id = (select auth.uid())
  or personal_id = (select auth.uid())
  or eh_admin()
);

create policy solicitacoes_insert_aluno
on public.solicitacoes_suporte
for insert
to authenticated
with check (
  aluno_id = (select auth.uid())
  and auth_tipo_usuario() = 'ALUNO'::tipo_usuario
  and (
    (destino = 'SISTEMA' and personal_id is null)
    or (
      destino = 'PERSONAL'
      and personal_id is not null
      and exists (
        select 1
        from public.personal_alunos pa
        where pa.aluno_id = (select auth.uid())
          and pa.personal_id = solicitacoes_suporte.personal_id
          and pa.status = 'ATIVO'::status_vinculo
      )
    )
  )
);

comment on table public.solicitacoes_suporte is
  'Chamados de suporte abertos por alunos para o Personal vinculado ou para o suporte do sistema.';
