-- =============================================================
-- 0008_admin_policies: configure ADMIN after enum commit
-- =============================================================
-- 0005 only adds the enum value so PostgreSQL can commit it first.
-- This migration is idempotent and can also be applied safely to databases
-- where the old 0005 had already configured these objects.

create or replace function public.eh_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.usuarios
    where id = auth.uid()
      and tipo = 'ADMIN'
  );
$$;

drop policy if exists "admin_select_all_usuarios" on public.usuarios;
create policy "admin_select_all_usuarios"
on public.usuarios for select
to authenticated
using (public.eh_admin());

drop policy if exists "admin_update_all_usuarios" on public.usuarios;
create policy "admin_update_all_usuarios"
on public.usuarios for update
to authenticated
using (public.eh_admin())
with check (public.eh_admin());

drop policy if exists "admin_select_all_vinculos" on public.personal_alunos;
create policy "admin_select_all_vinculos"
on public.personal_alunos for select
to authenticated
using (public.eh_admin());

drop policy if exists "admin_manage_all_exercicios" on public.exercicios;
create policy "admin_manage_all_exercicios"
on public.exercicios for all
to authenticated
using (public.eh_admin())
with check (public.eh_admin());

drop policy if exists "admin_select_all_treinos" on public.treinos;
create policy "admin_select_all_treinos"
on public.treinos for select
to authenticated
using (public.eh_admin());

drop policy if exists "admin_select_all_itens" on public.itens_treino;
create policy "admin_select_all_itens"
on public.itens_treino for select
to authenticated
using (public.eh_admin());

drop policy if exists "admin_select_all_registros" on public.registro_execucao;
create policy "admin_select_all_registros"
on public.registro_execucao for select
to authenticated
using (public.eh_admin());

revoke all on function public.eh_admin() from public;
grant execute on function public.eh_admin() to authenticated;
