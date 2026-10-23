-- Test data and temporary links are rolled back; existing accounts are reused.
begin;
do $$declare v_target uuid;begin
  select id into v_target from public.usuarios where tipo='ALUNO' and status_conta='ATIVO' and id<>'05067dea-ec38-4f40-a592-e2bff1275d06' order by id limit 1;
  if v_target is null then raise exception 'O teste requer dois alunos ativos existentes';end if;
  perform set_config('test.model_target',v_target::text,true);
  insert into public.personal_alunos(personal_id,aluno_id,status)
  values('40e247a5-ec08-4c0a-b8f9-62b44c0fcdac','05067dea-ec38-4f40-a592-e2bff1275d06','ATIVO'),('40e247a5-ec08-4c0a-b8f9-62b44c0fcdac',v_target,'ATIVO')
  on conflict(personal_id,aluno_id) do update set status='ATIVO';
end;$$;
select set_config('request.jwt.claim.sub','40e247a5-ec08-4c0a-b8f9-62b44c0fcdac',true);
select set_config('request.jwt.claims','{"sub":"40e247a5-ec08-4c0a-b8f9-62b44c0fcdac","role":"authenticated"}',true);
set local role authenticated;
do $$
declare v_source uuid;v_model uuid;v_copy uuid;v_second uuid;v_bad uuid;v_ex uuid;v_items jsonb;v_snapshot jsonb;v_count integer;v_basic uuid;v_basic_model uuid;v_basic_copy uuid;
begin
  select id into strict v_ex from public.exercicios where nome='Supino Reto' and grupo_muscular='Peito';
  v_items=jsonb_build_array(jsonb_build_object('exercicio_id',v_ex,'series',3,'repeticoes','10','descanso_segundos',60,'ordem',0),jsonb_build_object('exercicio_id',v_ex,'series',4,'repeticoes','8','descanso_segundos',90,'ordem',1));
  v_source=public.criar_ficha_com_validade('05067dea-ec38-4f40-a592-e2bff1275d06','Origem do modelo',v_items,current_date+14);
  insert into public.prescricoes_treino(item_treino_id,carga_alvo,duracao_segundos,rpe_alvo,superset,aquecimento,incremento_kg,observacoes)
    select id,20+ordem*5,60,8,'A',1,2.5,'Instrução salva' from public.itens_treino where treino_id=v_source;
  v_model=public.salvar_modelo_de_ficha(v_source,'  Modelo reutilizável  ');
  select itens into strict v_snapshot from public.modelos_treino where id=v_model and personal_id=auth.uid() and titulo='Modelo reutilizável' and quantidade_exercicios=2;
  if exists(select 1 from jsonb_array_elements(v_snapshot) item where item ? 'aluno_id' or item ? 'treino_id' or item ? 'id') then raise exception 'Modelo reteve identificadores da origem';end if;
  perform public.editar_ficha_com_validade(v_source,'Origem alterada',v_items,null,true);
  update public.prescricoes_treino set carga_alvo=99 where item_treino_id in(select id from public.itens_treino where treino_id=v_source);
  if (select itens from public.modelos_treino where id=v_model)<>v_snapshot then raise exception 'Modelo mudou com a origem';end if;
  delete from public.treinos where id=v_source;
  if not exists(select 1 from public.modelos_treino where id=v_model) then raise exception 'Modelo foi excluído com a origem';end if;
  v_copy=public.aplicar_modelo_treino(v_model,current_setting('test.model_target')::uuid,'Ficha do modelo');
  if not exists(select 1 from public.treinos where id=v_copy and aluno_id=current_setting('test.model_target')::uuid and personal_id=auth.uid() and not ativo and valida_ate is null) then raise exception 'Aplicação incorreta';end if;
  if (select count(*) from public.itens_treino where treino_id=v_copy)<>2 then raise exception 'Itens incompletos';end if;
  if not exists(select 1 from public.itens_treino i join public.prescricoes_treino p on p.item_treino_id=i.id where i.treino_id=v_copy and i.ordem=0 and i.series=3 and i.repeticoes='10' and i.descanso_segundos=60 and p.carga_alvo=20 and p.duracao_segundos=60 and p.rpe_alvo=8 and p.superset='A' and p.aquecimento=1 and p.incremento_kg=2.5 and p.observacoes='Instrução salva') then raise exception 'Prescrição não preservada';end if;
  if not exists(select 1 from public.itens_treino i join public.prescricoes_treino p on p.item_treino_id=i.id where i.treino_id=v_copy and i.ordem=1 and i.series=4 and p.carga_alvo=25) then raise exception 'Exercícios repetidos foram confundidos';end if;
  update public.prescricoes_treino set carga_alvo=77 where item_treino_id in(select id from public.itens_treino where treino_id=v_copy);
  v_second=public.aplicar_modelo_treino(v_model,current_setting('test.model_target')::uuid,null);
  if not exists(select 1 from public.itens_treino i join public.prescricoes_treino p on p.item_treino_id=i.id where i.treino_id=v_second and i.ordem=0 and p.carga_alvo=20) then raise exception 'Cópia alterou modelo';end if;
  if (select itens from public.modelos_treino where id=v_model)<>v_snapshot then raise exception 'Snapshot alterado';end if;
  v_basic=public.criar_ficha_atomica('05067dea-ec38-4f40-a592-e2bff1275d06','Ficha básica',v_items);
  v_basic_model=public.salvar_modelo_de_ficha(v_basic,'Modelo básico');
  v_basic_copy=public.aplicar_modelo_treino(v_basic_model,current_setting('test.model_target')::uuid,'Aplicação básica');
  if not exists(select 1 from public.itens_treino i join public.prescricoes_treino p on p.item_treino_id=i.id where i.treino_id=v_basic_copy and p.aquecimento=0 and p.incremento_kg=0 and p.observacoes='' and p.carga_alvo is null and p.rpe_alvo is null) then raise exception 'Prescrição padrão incorreta';end if;
  select count(*) into v_count from public.treinos where personal_id=auth.uid();
  begin perform public.aplicar_modelo_treino(v_model,gen_random_uuid(),'Não salvar');raise exception 'Destino não vinculado aceito';exception when insufficient_privilege then null;end;
  update public.personal_alunos set status='INATIVO' where personal_id=auth.uid() and aluno_id=current_setting('test.model_target')::uuid;
  begin perform public.aplicar_modelo_treino(v_model,current_setting('test.model_target')::uuid,'Não salvar');raise exception 'Vínculo inativo aceito';exception when insufficient_privilege then null;end;
  update public.personal_alunos set status='ATIVO' where personal_id=auth.uid() and aluno_id=current_setting('test.model_target')::uuid;
  insert into public.modelos_treino(personal_id,titulo,itens) values(auth.uid(),'Exercício inexistente',jsonb_build_array(jsonb_build_object('exercicio_id',gen_random_uuid(),'series',3,'repeticoes','10','descanso_segundos',60,'ordem',0))) returning id into v_bad;
  begin perform public.aplicar_modelo_treino(v_bad,current_setting('test.model_target')::uuid,'Não salvar');raise exception 'Exercício inexistente aceito';exception when foreign_key_violation then null;end;
  if (select count(*) from public.treinos where personal_id=auth.uid())<>v_count then raise exception 'Ficha parcial após falha';end if;
  begin update public.modelos_treino set titulo='Alteração direta' where id=v_model;raise exception 'Modelo imutável foi alterado';exception when insufficient_privilege then null;end;
  perform set_config('test.model_id',v_model::text,true);
  perform set_config('test.model_copy',v_copy::text,true);
end;$$;
select set_config('request.jwt.claim.sub',current_setting('test.model_target'),true);
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.model_target'),'role','authenticated')::text,true);
do $$declare v_rows integer;begin
  if exists(select 1 from public.modelos_treino where id=current_setting('test.model_id')::uuid) then raise exception 'Aluno leu modelo privado';end if;
  begin perform public.aplicar_modelo_treino(current_setting('test.model_id')::uuid,auth.uid(),'Proibido');raise exception 'Aluno aplicou modelo';exception when insufficient_privilege then null;end;
  delete from public.modelos_treino where id=current_setting('test.model_id')::uuid;
  get diagnostics v_rows=row_count;
  if v_rows<>0 then raise exception 'Outro usuário excluiu modelo';end if;
end;$$;
select set_config('request.jwt.claim.sub','40e247a5-ec08-4c0a-b8f9-62b44c0fcdac',true);
select set_config('request.jwt.claims','{"sub":"40e247a5-ec08-4c0a-b8f9-62b44c0fcdac","role":"authenticated"}',true);
do $$begin
  delete from public.modelos_treino where id=current_setting('test.model_id')::uuid;
  if not exists(select 1 from public.treinos where id=current_setting('test.model_copy')::uuid) then raise exception 'Excluir modelo removeu ficha';end if;
end;$$;
reset role;
do $$begin
  if not exists(select 1 from pg_class where oid='public.modelos_treino'::regclass and relrowsecurity) then raise exception 'RLS desativada';end if;
  if has_table_privilege('anon','public.modelos_treino','select') or has_table_privilege('authenticated','public.modelos_treino','update') then raise exception 'Permissões de tabela incorretas';end if;
  if exists(select 1 from pg_proc where pronamespace='public'::regnamespace and proname in ('salvar_modelo_de_ficha','aplicar_modelo_treino') and (prosecdef or has_function_privilege('anon',oid,'execute'))) then raise exception 'Função insegura';end if;
end;$$;
rollback;
select 'PASS: snapshot independente, origem excluída, reuso com prescrição, cópias pausadas, exclusão segura, RLS e rollback' as resultado;
