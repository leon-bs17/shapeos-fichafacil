begin;
do $$declare v_p uuid;v_student uuid;begin
 select id into strict v_p from public.usuarios where tipo='PERSONAL' and status_conta='ATIVO' order by id limit 1;
 select id into strict v_student from public.usuarios where tipo='ALUNO' and status_conta='ATIVO' order by id limit 1;
 perform set_config('test.reminder_personal',v_p::text,true);perform set_config('test.reminder_student',v_student::text,true);perform set_config('test.reminder_id',gen_random_uuid()::text,true);
 perform set_config('request.jwt.claim.sub',v_p::text,true);perform set_config('request.jwt.claims',jsonb_build_object('sub',v_p,'role','authenticated')::text,true);
end;$$;
set local role authenticated;
do $$declare v_id uuid:=current_setting('test.reminder_id')::uuid;v_time timestamptz;begin
 insert into public.personal_lembretes(id,personal_id,titulo,descricao,data) values(v_id,auth.uid(),'Revisar ficha','Descrição privada',current_date);
 insert into public.personal_lembretes(id,personal_id,titulo,descricao,data) values(v_id,auth.uid(),'Revisar ficha','Descrição privada',current_date) on conflict(id) do nothing;
 if (select count(*) from public.personal_lembretes where id=v_id)<>1 then raise exception 'Criação duplicada';end if;
 update public.personal_lembretes set concluido=true where id=v_id;
 select concluido_em into strict v_time from public.personal_lembretes where id=v_id and concluido;
 if v_time is null then raise exception 'Data de conclusão ausente';end if;
 update public.personal_lembretes set titulo='Revisão concluída',data=current_date+1 where id=v_id;
 if (select concluido_em from public.personal_lembretes where id=v_id)<>v_time then raise exception 'Edição mudou a data de conclusão';end if;
 begin update public.personal_lembretes set concluido_em=now()-interval '1 year' where id=v_id;raise exception 'Data forjada aceita';exception when insufficient_privilege then null;end;
 begin update public.personal_lembretes set personal_id=current_setting('test.reminder_student')::uuid where id=v_id;raise exception 'Dono alterado';exception when insufficient_privilege then null;end;
 begin insert into public.personal_lembretes(personal_id,titulo,descricao,data) values(current_setting('test.reminder_student')::uuid,'Forjado','',current_date);raise exception 'Dono forjado aceito';exception when insufficient_privilege then null;end;
 update public.personal_lembretes set concluido=false where id=v_id;
 if not exists(select 1 from public.personal_lembretes where id=v_id and not concluido and concluido_em is null) then raise exception 'Reabertura incorreta';end if;
end;$$;
select set_config('request.jwt.claim.sub',current_setting('test.reminder_student'),true);
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.reminder_student'),'role','authenticated')::text,true);
do $$declare v_count integer;begin
 if exists(select 1 from public.personal_lembretes) then raise exception 'Aluno leu lembrete privado';end if;
 begin insert into public.personal_lembretes(personal_id,titulo,descricao,data) values(auth.uid(),'Aluno criou','',current_date);raise exception 'Aluno criou lembrete';exception when insufficient_privilege then null;end;
 update public.personal_lembretes set titulo='Outra conta' where id=current_setting('test.reminder_id')::uuid;get diagnostics v_count=row_count;if v_count<>0 then raise exception 'Aluno alterou lembrete';end if;
 delete from public.personal_lembretes where id=current_setting('test.reminder_id')::uuid;get diagnostics v_count=row_count;if v_count<>0 then raise exception 'Aluno excluiu lembrete';end if;
end;$$;
reset role;
update public.usuarios set status_conta='BLOQUEADO' where id=current_setting('test.reminder_personal')::uuid;
select set_config('request.jwt.claim.sub',current_setting('test.reminder_personal'),true);
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.reminder_personal'),'role','authenticated')::text,true);
set local role authenticated;
do $$begin
 if exists(select 1 from public.personal_lembretes) then raise exception 'Conta bloqueada leu lembrete';end if;
 begin insert into public.personal_lembretes(personal_id,titulo,descricao,data) values(auth.uid(),'Conta bloqueada','',current_date);raise exception 'Conta bloqueada criou';exception when insufficient_privilege then null;end;
end;$$;
reset role;
update public.usuarios set status_conta='ATIVO' where id=current_setting('test.reminder_personal')::uuid;
set local role authenticated;
delete from public.personal_lembretes where id=current_setting('test.reminder_id')::uuid;
reset role;
do $$begin
 if exists(select 1 from public.personal_lembretes where id=current_setting('test.reminder_id')::uuid) then raise exception 'Exclusão falhou';end if;
 if has_table_privilege('anon','public.personal_lembretes','select') then raise exception 'Acesso anônimo';end if;
end;$$;
rollback;
select 'PASS: lembretes privados, edição, conclusão com horário do servidor, reabertura, dono protegido, aluno/conta bloqueada recusados e rollback' as resultado;
