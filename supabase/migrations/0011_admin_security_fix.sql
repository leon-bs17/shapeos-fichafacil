-- Legacy hosted installations may contain criar_admin; clean installations do not.
do $$ begin
 if to_regprocedure('public.criar_admin(text,text,text)') is not null then
  revoke execute on function public.criar_admin(text,text,text) from public, anon;
  grant execute on function public.criar_admin(text,text,text) to authenticated;
 end if;
end $$;
