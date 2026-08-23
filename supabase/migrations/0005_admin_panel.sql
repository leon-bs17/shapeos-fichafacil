-- =============================================================
-- 0005_admin_panel: Add ADMIN role, seed admins, RLS policies
-- =============================================================

-- 1. Add ADMIN to the enum
DO $$ BEGIN
  ALTER TYPE public.tipo_usuario ADD VALUE 'ADMIN';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2. Fix trigger to accept ADMIN type
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

-- 3. Function to create admin users (security definer)
CREATE OR REPLACE FUNCTION public.criar_admin(
  p_email text, p_nome text, p_senha text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_user_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND tipo = 'ADMIN') AND auth.uid() IS NOT NULL THEN
    RAISE EXCEPTION 'Apenas administradores podem criar novos admins';
  END IF;
  v_user_id := gen_random_uuid();
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
  VALUES (v_user_id, p_email, crypt(p_senha, gen_salt('bf', 10)), now(), jsonb_build_object('nome', p_nome, 'tipo', 'ADMIN'), now(), now());
  RETURN v_user_id;
END;
$$;

-- 4. Function to check if current user is admin
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

-- 5. RLS policies for ADMIN access
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

-- 6. Seed admin users (update existing or create new)
-- Note: auth.users INSERT triggers criar_usuario_autenticado which auto-creates usuarios row
DO $$
DECLARE
  v_id uuid;
BEGIN
  -- Davi: may already exist as PERSONAL, just update
  UPDATE auth.users SET raw_user_meta_data = raw_user_meta_data || '{"tipo": "ADMIN"}'::jsonb WHERE email = 'davi.lima7d@gmail.com';
  UPDATE public.usuarios SET tipo = 'ADMIN' WHERE email = 'davi.lima7d@gmail.com';

  -- Leonardo: create if not exists
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'leonardosousa1725@gmail.com') THEN
    INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
    VALUES (gen_random_uuid(), 'leonardosousa1725@gmail.com', crypt('Admin@123456', gen_salt('bf', 10)), now(), '{"nome": "Leonardo Sousa", "tipo": "ADMIN"}'::jsonb, now(), now());
  ELSE
    UPDATE auth.users SET raw_user_meta_data = raw_user_meta_data || '{"tipo": "ADMIN"}'::jsonb WHERE email = 'leonardosousa1725@gmail.com';
    UPDATE public.usuarios SET tipo = 'ADMIN' WHERE email = 'leonardosousa1725@gmail.com';
  END IF;

  -- Abraao: create if not exists
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'abraaolima1718@gmail.com') THEN
    INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
    VALUES (gen_random_uuid(), 'abraaolima1718@gmail.com', crypt('Admin@123456', gen_salt('bf', 10)), now(), '{"nome": "Abraao Lima", "tipo": "ADMIN"}'::jsonb, now(), now());
  ELSE
    UPDATE auth.users SET raw_user_meta_data = raw_user_meta_data || '{"tipo": "ADMIN"}'::jsonb WHERE email = 'abraaolima1718@gmail.com';
    UPDATE public.usuarios SET tipo = 'ADMIN' WHERE email = 'abraaolima1718@gmail.com';
  END IF;
END $$;
