-- Execute no SQL Editor do Supabase Dashboard (https://supabase.com/dashboard/project/SEU_PROJECT/sql)

-- 1. Deletar da tabela pública primeiro (FK para auth.users com ON DELETE CASCADE)
DELETE FROM public.usuarios
WHERE email IN (
  'leonardo.redfield1999@gmail.com',
  'yamagikobaiashi@gmail.com',
  'yiboladomaster@gmail.com'
);

-- 2. Deletar do auth.users (isso também limpa identidades, sessions, etc.)
DELETE FROM auth.users
WHERE email IN (
  'leonardo.redfield1999@gmail.com',
  'yamagikobaiashi@gmail.com',
  'yiboladomaster@gmail.com'
);

-- Verificação
SELECT email, tipo FROM public.usuarios
WHERE email IN (
  'leonardo.redfield1999@gmail.com',
  'yamagikobaiashi@gmail.com',
  'yiboladomaster@gmail.com'
);