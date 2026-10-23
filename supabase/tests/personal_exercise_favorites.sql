begin;
do $$declare v_personal uuid; v_student uuid; begin
  select id into strict v_personal from public.usuarios where tipo='PERSONAL' and status_conta='ATIVO' order by id limit 1;
  select id into strict v_student from public.usuarios where tipo='ALUNO' and status_conta='ATIVO' order by id limit 1;
  perform set_config('test.favorite_personal',v_personal::text,true);
  perform set_config('test.favorite_student',v_student::text,true);
  perform set_config('request.jwt.claim.sub',v_personal::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',v_personal,'role','authenticated')::text,true);
end;$$;
set local role authenticated;
do $$declare v_ex uuid; begin
  insert into public.exercicios(nome,grupo_muscular,equipamento,criado_por)
    values('Teste favorito '||gen_random_uuid(),'Peito','Halteres',auth.uid()) returning id into v_ex;
  perform set_config('test.favorite_exercise',v_ex::text,true);
  insert into public.exercicios_favoritos(personal_id,exercicio_id) values(auth.uid(),v_ex) on conflict do nothing;
  insert into public.exercicios_favoritos(personal_id,exercicio_id) values(auth.uid(),v_ex) on conflict do nothing;
  if (select count(*) from public.exercicios_favoritos where exercicio_id=v_ex)<>1 then raise exception 'Favorito duplicado ou ausente';end if;
  begin insert into public.exercicios_favoritos(personal_id,exercicio_id) values(current_setting('test.favorite_student')::uuid,v_ex);raise exception 'Dono forjado aceito';exception when insufficient_privilege then null;end;
  begin update public.exercicios_favoritos set personal_id=current_setting('test.favorite_student')::uuid where exercicio_id=v_ex;raise exception 'UPDATE permitido';exception when insufficient_privilege then null;end;
end;$$;
select set_config('request.jwt.claim.sub',current_setting('test.favorite_student'),true);
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.favorite_student'),'role','authenticated')::text,true);
do $$declare v_count integer;begin
  if exists(select 1 from public.exercicios_favoritos) then raise exception 'Aluno leu favoritos privados';end if;
  begin insert into public.exercicios_favoritos(personal_id,exercicio_id) values(auth.uid(),current_setting('test.favorite_exercise')::uuid);raise exception 'Aluno favoritou';exception when insufficient_privilege then null;end;
  delete from public.exercicios_favoritos where exercicio_id=current_setting('test.favorite_exercise')::uuid;
  get diagnostics v_count=row_count;
  if v_count<>0 then raise exception 'Aluno removeu favorito de outra conta';end if;
end;$$;
reset role;
update public.usuarios set status_conta='BLOQUEADO' where id=current_setting('test.favorite_personal')::uuid;
select set_config('request.jwt.claim.sub',current_setting('test.favorite_personal'),true);
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.favorite_personal'),'role','authenticated')::text,true);
set local role authenticated;
do $$begin
  if exists(select 1 from public.exercicios_favoritos) then raise exception 'Conta bloqueada leu favoritos';end if;
  begin insert into public.exercicios_favoritos(personal_id,exercicio_id) values(auth.uid(),current_setting('test.favorite_exercise')::uuid);raise exception 'Conta bloqueada favoritou';exception when insufficient_privilege then null;end;
end;$$;
reset role;
update public.usuarios set status_conta='ATIVO' where id=current_setting('test.favorite_personal')::uuid;
set local role authenticated;
do $$declare v_ex uuid:=current_setting('test.favorite_exercise')::uuid;begin
  delete from public.exercicios_favoritos where personal_id=auth.uid() and exercicio_id=v_ex;
  delete from public.exercicios_favoritos where personal_id=auth.uid() and exercicio_id=v_ex;
  insert into public.exercicios_favoritos(personal_id,exercicio_id) values(auth.uid(),v_ex);
  delete from public.exercicios where id=v_ex;
  if exists(select 1 from public.exercicios_favoritos where exercicio_id=v_ex) then raise exception 'Favorito órfão após exclusão';end if;
end;$$;
reset role;
do $$begin
  if not exists(select 1 from pg_class where oid='public.exercicios_favoritos'::regclass and relrowsecurity) then raise exception 'RLS desativada';end if;
  if has_table_privilege('anon','public.exercicios_favoritos','select') or has_table_privilege('authenticated','public.exercicios_favoritos','update') then raise exception 'Privilégios incorretos';end if;
end;$$;
rollback;
select 'PASS: favoritos idempotentes, dono protegido, aluno e conta bloqueada recusados, remoção, cascade, RLS e rollback' as resultado;
