-- Reconcile the support table already present in production for new installs.
-- Existing support rows, policies and grants are left unchanged.
do $$begin
 if to_regclass('public.solicitacoes_suporte') is null then
  create table public.solicitacoes_suporte(
   id uuid primary key default gen_random_uuid(),
   aluno_id uuid not null references public.usuarios(id) on delete cascade,
   destino text not null check(destino in('PERSONAL','SISTEMA')),
   personal_id uuid references public.usuarios(id) on delete set null,
   assunto text not null check(length(trim(assunto)) between 3 and 120),
   mensagem text not null check(length(trim(mensagem)) between 10 and 2000),
   status text not null default 'ABERTO' check(status in('ABERTO','EM_ATENDIMENTO','RESOLVIDO')),
   criado_em timestamptz not null default now(),
   check((destino='PERSONAL' and personal_id is not null) or (destino='SISTEMA' and personal_id is null))
  );
  alter table public.solicitacoes_suporte enable row level security;
  revoke all on public.solicitacoes_suporte from anon,authenticated;
  grant select,insert on public.solicitacoes_suporte to authenticated;
  create policy solicitacoes_select_participantes on public.solicitacoes_suporte for select to authenticated
   using(aluno_id=(select auth.uid()) or personal_id=(select auth.uid()) or public.eh_admin());
  create policy solicitacoes_insert_aluno on public.solicitacoes_suporte for insert to authenticated
   with check(aluno_id=(select auth.uid()) and public.auth_tipo_usuario()='ALUNO' and
    ((destino='SISTEMA' and personal_id is null) or
     (destino='PERSONAL' and personal_id is not null and exists(select 1 from public.personal_alunos pa where pa.aluno_id=(select auth.uid()) and pa.personal_id=solicitacoes_suporte.personal_id and pa.status='ATIVO'))));
 end if;
end;$$;
notify pgrst,'reload schema';
