-- =============================================================
-- 0005_admin_panel: ADMIN role, RLS policies, admin functions
-- =============================================================
-- NOTA: Os 3 usuarios admin foram criados via GoReal Auth API
-- (supabase.auth.signUp com metadata tipo=ADMIN), NAO via INSERT
-- direto em auth.users. INSERT manual quebra o login porque o
-- GoTrue exige role/aud/app_meta_data/identities preenchidos.

-- 1. Add ADMIN to the enum
DO $$ BEGIN
  ALTER TYPE public.tipo_usuario ADD VALUE 'ADMIN';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2. Trigger aceita ADMIN
CREATE OR REPLACE FUNCTION public.criar_usuario_autenticado()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.usuarios (id, nome, email, tipo)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nome', split_part(new.email, '@', 1)),
    new.email,
    coalesce(
      case
        when new.raw_user_meta_data ->> 'tipo' in ('PERSONAL', 'ALUNO', 'ADMIN')
          then (new.raw_user_meta_data ->> 'tipo')::public.tipo_usuario
      end,
      'ALUNO'
    )
  );
  return new;
end;
$$;

-- 3. Function para verificar se usuario atual e admin
CREATE OR REPLACE FUNCTION public.eh_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND tipo = 'ADMIN'
  );
$$;

-- 4. RLS policies de acesso do ADMIN
DROP POLICY IF EXISTS "admin_select_all_usuarios" ON public.usuarios;
CREATE POLICY "admin_select_all_usuarios" ON public.usuarios FOR SELECT TO authenticated USING (public.eh_admin());

DROP POLICY IF EXISTS "admin_update_all_usuarios" ON public.usuarios;
CREATE POLICY "admin_update_all_usuarios" ON public.usuarios FOR UPDATE TO authenticated USING (public.eh_admin()) WITH CHECK (public.eh_admin());

DROP POLICY IF EXISTS "admin_select_all_vinculos" ON public.personal_alunos;
CREATE POLICY "admin_select_all_vinculos" ON public.personal_alunos FOR SELECT TO authenticated USING (public.eh_admin());

DROP POLICY IF EXISTS "admin_manage_all_exercicios" ON public.exercicios;
CREATE POLICY "admin_manage_all_exercicios" ON public.exercicios FOR ALL TO authenticated USING (public.eh_admin()) WITH CHECK (public.eh_admin());

DROP POLICY IF EXISTS "admin_select_all_treinos" ON public.treinos;
CREATE POLICY "admin_select_all_treinos" ON public.treinos FOR SELECT TO authenticated USING (public.eh_admin());

DROP POLICY IF EXISTS "admin_select_all_itens" ON public.itens_treino;
CREATE POLICY "admin_select_all_itens" ON public.itens_treino FOR SELECT TO authenticated USING (public.eh_admin());

DROP POLICY IF EXISTS "admin_select_all_registros" ON public.registro_execucao;
CREATE POLICY "admin_select_all_registros" ON public.registro_execucao FOR SELECT TO authenticated USING (public.eh_admin());

-- 5. Promover usuario existente a admin (se email ja tem conta)
UPDATE auth.users SET raw_user_meta_data = raw_user_meta_data || '{"tipo": "ADMIN"}'::jsonb
WHERE email = 'davi.lima7d@gmail.com';
UPDATE public.usuarios SET tipo = 'ADMIN' WHERE email = 'davi.lima7d@gmail.com';

-- 6. Novos admins devem ser criados pela Auth API:
--    supabase.auth.signUp({ email, password, options: { data: { nome, tipo: 'ADMIN' } } })
--    depois confirmar email no dashboard ou via admin.updateUserById.
