-- Runs against the configured project in one rollback-only transaction.
begin;
create temporary table fitness_test_results(test text,passed boolean);
grant insert,select on fitness_test_results to authenticated,anon;
select set_config('test.aluno',gen_random_uuid()::text,true),set_config('test.outro',gen_random_uuid()::text,true),set_config('test.personal',gen_random_uuid()::text,true),set_config('test.treino',gen_random_uuid()::text,true),set_config('test.item',gen_random_uuid()::text,true),set_config('test.session',gen_random_uuid()::text,true),set_config('test.serie',gen_random_uuid()::text,true),set_config('test.exercicio',gen_random_uuid()::text,true);
insert into auth.users(id,email,raw_user_meta_data) select current_setting('test.aluno')::uuid,'fitness-test-'||current_setting('test.aluno')||'@example.invalid','{"tipo":"ALUNO","nome":"Teste aluno"}'::jsonb;
insert into auth.users(id,email,raw_user_meta_data) select current_setting('test.outro')::uuid,'fitness-test-'||current_setting('test.outro')||'@example.invalid','{"tipo":"ALUNO","nome":"Teste isolado"}'::jsonb;
insert into auth.users(id,email,raw_user_meta_data) select current_setting('test.personal')::uuid,'fitness-test-'||current_setting('test.personal')||'@example.invalid','{"tipo":"PERSONAL","nome":"Teste personal"}'::jsonb;
update public.usuarios set status_conta='ATIVO' where id=current_setting('test.personal')::uuid;
insert into public.personal_alunos(personal_id,aluno_id) values(current_setting('test.personal')::uuid,current_setting('test.aluno')::uuid);
insert into public.exercicios(id,nome,grupo_muscular) values(current_setting('test.exercicio')::uuid,'Exercício teste '||current_setting('test.exercicio'),'peito');
insert into public.treinos(id,aluno_id,personal_id,titulo) values(current_setting('test.treino')::uuid,current_setting('test.aluno')::uuid,current_setting('test.personal')::uuid,'Ficha teste');
insert into public.itens_treino(id,treino_id,exercicio_id,series,repeticoes,ordem) values(current_setting('test.item')::uuid,current_setting('test.treino')::uuid,current_setting('test.exercicio')::uuid,3,'8-12',0);
select set_config('test.payload',jsonb_build_object('id',current_setting('test.session'),'treino_id',current_setting('test.treino'),'inicio',now()-interval '10 minutes','status','EM_ANDAMENTO','series',jsonb_build_array(jsonb_build_object('id',current_setting('test.serie'),'item_id',current_setting('test.item'),'carga',20,'reps',12,'segundos',null,'rpe',8,'aquecimento',false,'registrado_em',now()-interval '5 minutes')))::text,true);
set local role authenticated;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.aluno'),'role','authenticated')::text,true);
select public.salvar_sessao_shapeos(current_setting('test.payload')::jsonb);
select public.salvar_sessao_shapeos(current_setting('test.payload')::jsonb);
insert into fitness_test_results select 'retry does not duplicate series',count(*)=1 from public.registro_execucao where id=current_setting('test.serie')::uuid;
insert into fitness_test_results select 'student sees own session',count(*)=1 from public.sessoes_treino where id=current_setting('test.session')::uuid;
do $$begin
 begin
 perform public.salvar_sessao_shapeos(jsonb_set(current_setting('test.payload')::jsonb,'{series,0,carga}','-10'));
 insert into fitness_test_results values('negative load rejected',false);
 exception when others then insert into fitness_test_results values('negative load rejected',true);end;
 begin
 perform public.salvar_sessao_shapeos(jsonb_set(current_setting('test.payload')::jsonb,'{series}','[]'));
 insert into fitness_test_results values('saved series cannot disappear',false);
 exception when others then insert into fitness_test_results values('saved series cannot disappear',true);end;
 begin
 insert into public.prescricoes_treino(item_treino_id,carga_alvo) values(current_setting('test.item')::uuid,30);
 insert into fitness_test_results values('student cannot prescribe',false);
 exception when others then insert into fitness_test_results values('student cannot prescribe',true);end;
 begin
 insert into public.sessoes_treino(id,aluno_id,titulo,inicio,status,prescricao) values(gen_random_uuid(),current_setting('test.aluno')::uuid,'Fake',now(),'EM_ANDAMENTO','[]');
 insert into fitness_test_results values('direct snapshot fabrication denied',false);
 exception when others then insert into fitness_test_results values('direct snapshot fabrication denied',true);end;
end$$;
insert into public.agenda_treino(aluno_id,treino_id,data) values(current_setting('test.aluno')::uuid,current_setting('test.treino')::uuid,current_date);
insert into public.avaliacoes_fisicas(aluno_id,data,peso) values(current_setting('test.aluno')::uuid,current_date,80);
insert into fitness_test_results select 'student schedules and records measurements',exists(select 1 from public.agenda_treino where aluno_id=current_setting('test.aluno')::uuid) and exists(select 1 from public.avaliacoes_fisicas where aluno_id=current_setting('test.aluno')::uuid);
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.outro'),'role','authenticated')::text,true);
insert into fitness_test_results select 'unrelated student sees no session',count(*)=0 from public.sessoes_treino where id=current_setting('test.session')::uuid;
insert into fitness_test_results select 'unrelated student sees no assessment',count(*)=0 from public.avaliacoes_fisicas where aluno_id=current_setting('test.aluno')::uuid;
do $$begin
 begin perform public.salvar_sessao_shapeos(current_setting('test.payload')::jsonb);insert into fitness_test_results values('foreign session write denied',false);exception when others then insert into fitness_test_results values('foreign session write denied',true);end;
 begin insert into public.avaliacoes_fisicas(aluno_id,data,peso) values(current_setting('test.aluno')::uuid,current_date,90);insert into fitness_test_results values('foreign assessment write denied',false);exception when others then insert into fitness_test_results values('foreign assessment write denied',true);end;
end$$;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.personal'),'role','authenticated')::text,true);
insert into fitness_test_results select 'linked personal reads session',count(*)=1 from public.sessoes_treino where id=current_setting('test.session')::uuid;
insert into public.prescricoes_treino(item_treino_id,carga_alvo,superset,incremento_kg) values(current_setting('test.item')::uuid,30,'A',2.5);
insert into fitness_test_results select 'personal can prescribe',count(*)=1 from public.prescricoes_treino where item_treino_id=current_setting('test.item')::uuid;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.aluno'),'role','authenticated')::text,true);
select public.salvar_sessao_shapeos(current_setting('test.payload')::jsonb || jsonb_build_object('status','CONCLUIDO','fim',now()));
select public.salvar_sessao_shapeos(current_setting('test.payload')::jsonb || jsonb_build_object('status','CONCLUIDO','fim',now()));
insert into fitness_test_results select 'completion retry is idempotent',count(*)=1 from public.sessoes_treino where id=current_setting('test.session')::uuid and status='CONCLUIDO';
set local role anon;
do $$begin begin perform public.salvar_sessao_shapeos(current_setting('test.payload')::jsonb);insert into fitness_test_results values('anonymous cannot write',false);exception when others then insert into fitness_test_results values('anonymous cannot write',true);end;end$$;
reset role;
select * from fitness_test_results;
rollback;
