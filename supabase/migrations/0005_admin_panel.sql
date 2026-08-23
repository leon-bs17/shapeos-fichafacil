-- =============================================================
-- 0005_admin_panel: Add ADMIN role, seed admins, RLS policies
-- =============================================================

-- 1. Add ADMIN to the enum
ALTER TYPE public.tipo_usuario ADD VALUE IF NOT EXISTS 'ADMIN';

-- 2. Function to create admin users (security definer)
CREATE OR REPLACE FUNCTION public.criar_admin(
  p_email text,
  p_nome text,
  p_senha text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Only admins can create admins
  IF NOT EXISTS (
    SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND tipo = 'ADMIN'
  ) AND auth.uid() IS NOT NULL THEN
    RAISE EXCEPTION 'Apenas administradores podem criar novos admins';
  END IF;

  -- Create auth user
  v_user_id := gen_random_uuid();

  INSERT INTO auth.users (
    id, email, encrypted_password, email_confirmed_at,
    raw_user_meta_data, created_at, updated_at, confirmation_token_new
  ) VALUES (
    v_user_id,
    p_email,
    crypt(p_senha, gen_salt('bf', 10)),
    now(),
    jsonb_build_object('nome', p_nome, 'tipo', 'ADMIN'),
    now(),
    now(),
    ''
  );

  -- Create usuario record
  INSERT INTO public.usuarios (id, nome, email, tipo)
  VALUES (v_user_id, p_nome, p_email, 'ADMIN');

  RETURN v_user_id;
END;
$$;

-- 3. Function to check if current user is admin
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

-- 4. RLS policies for ADMIN access

-- ADMIN can read ALL usuarios
DROP POLICY IF EXISTS "admin_select_all_usuarios" ON public.usuarios;
CREATE POLICY "admin_select_all_usuarios"
ON public.usuarios FOR SELECT
TO authenticated
USING (public.eh_admin());

-- ADMIN can update ANY usuario
DROP POLICY IF EXISTS "admin_update_all_usuarios" ON public.usuarios;
CREATE POLICY "admin_update_all_usuarios"
ON public.usuarios FOR UPDATE
TO authenticated
USING (public.eh_admin())
WITH CHECK (public.eh_admin());

-- ADMIN can read ALL personal_alunos
DROP POLICY IF EXISTS "admin_select_all_vinculos" ON public.personal_alunos;
CREATE POLICY "admin_select_all_vinculos"
ON public.personal_alunos FOR SELECT
TO authenticated
USING (public.eh_admin());

-- ADMIN can manage ALL exercicios
DROP POLICY IF EXISTS "admin_manage_all_exercicios" ON public.exercicios;
CREATE POLICY "admin_manage_all_exercicios"
ON public.exercicios FOR ALL
TO authenticated
USING (public.eh_admin())
WITH CHECK (public.eh_admin());

-- ADMIN can read ALL treinos
DROP POLICY IF EXISTS "admin_select_all_treinos" ON public.treinos;
CREATE POLICY "admin_select_all_treinos"
ON public.treinos FOR SELECT
TO authenticated
USING (public.eh_admin());

-- ADMIN can read ALL itens_treino
DROP POLICY IF EXISTS "admin_select_all_itens" ON public.itens_treino;
CREATE POLICY "admin_select_all_itens"
ON public.itens_treino FOR SELECT
TO authenticated
USING (public.eh_admin());

-- ADMIN can read ALL registro_execucao
DROP POLICY IF EXISTS "admin_select_all_registros" ON public.registro_execucao;
CREATE POLICY "admin_select_all_registros"
ON public.registro_execucao FOR SELECT
TO authenticated
USING (public.eh_admin());

-- 5. Seed the 3 admin users
-- Temporary password: Admin@123456 (admins should change via Supabase dashboard)
DO $$
DECLARE
  v_id1 uuid := 'a1b2c3d4-e5f6-7890-abcd-ef1234567001';
  v_id2 uuid := 'a1b2c3d4-e5f6-7890-abcd-ef1234567002';
  v_id3 uuid := 'a1b2c3d4-e5f6-7890-abcd-ef1234567003';
BEGIN
  -- Admin 1: Leonardo
  INSERT INTO auth.users (
    id, email, encrypted_password, email_confirmed_at,
    raw_user_meta_data, created_at, updated_at, confirmation_token_new
  ) VALUES (
    v_id1,
    'leonardosousa1725@gmail.com',
    crypt('Admin@123456', gen_salt('bf', 10)),
    now(),
    jsonb_build_object('nome', 'Leonardo Sousa', 'tipo', 'ADMIN'),
    now(), now(), ''
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.usuarios (id, nome, email, tipo)
  VALUES (v_id1, 'Leonardo Sousa', 'leonardosousa1725@gmail.com', 'ADMIN')
  ON CONFLICT (id) DO NOTHING;

  -- Admin 2: Abraao
  INSERT INTO auth.users (
    id, email, encrypted_password, email_confirmed_at,
    raw_user_meta_data, created_at, updated_at, confirmation_token_new
  ) VALUES (
    v_id2,
    'abraaolima1718@gmail.com',
    crypt('Admin@123456', gen_salt('bf', 10)),
    now(),
    jsonb_build_object('nome', 'Abraao Lima', 'tipo', 'ADMIN'),
    now(), now(), ''
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.usuarios (id, nome, email, tipo)
  VALUES (v_id2, 'Abraao Lima', 'abraaolima1718@gmail.com', 'ADMIN')
  ON CONFLICT (id) DO NOTHING;

  -- Admin 3: Davi
  INSERT INTO auth.users (
    id, email, encrypted_password, email_confirmed_at,
    raw_user_meta_data, created_at, updated_at, confirmation_token_new
  ) VALUES (
    v_id3,
    'davi.lima7d@gmail.com',
    crypt('Admin@123456', gen_salt('bf', 10)),
    now(),
    jsonb_build_object('nome', 'Davi Lima', 'tipo', 'ADMIN'),
    now(), now(), ''
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.usuarios (id, nome, email, tipo)
  VALUES (v_id3, 'Davi Lima', 'davi.lima7d@gmail.com', 'ADMIN')
  ON CONFLICT (id) DO NOTHING;
END $$;
