-- Fecha uma permissao herdada quando a funcao criar_admin estiver presente.
-- Em ambientes limpos essa funcao pode nao existir, portanto o hardening deve ser idempotente.
do $$
begin
  if to_regprocedure('public.criar_admin(text,text,text)') is not null then
    execute 'revoke execute on function public.criar_admin(text, text, text) from public, anon';
    execute 'grant execute on function public.criar_admin(text, text, text) to authenticated';
  end if;
end
$$;
