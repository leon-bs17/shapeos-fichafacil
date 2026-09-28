-- Fecha uma permissao herdada: criar_admin nunca deve ser executavel por anon/PUBLIC.
-- Usuarios autenticados continuam sujeitos a validacao interna de tipo ADMIN.
revoke execute on function public.criar_admin(text, text, text) from public, anon;
grant execute on function public.criar_admin(text, text, text) to authenticated;
