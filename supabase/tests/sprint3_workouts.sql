-- Uses the existing example.invalid demo accounts. All changes are rolled back.
begin;
insert into public.personal_alunos(personal_id,aluno_id,status)
values('40e247a5-ec08-4c0a-b8f9-62b44c0fcdac','05067dea-ec38-4f40-a592-e2bff1275d06','ATIVO')
on conflict(personal_id,aluno_id) do update set status='ATIVO';
select set_config('request.jwt.claim.sub','40e247a5-ec08-4c0a-b8f9-62b44c0fcdac',true);
select set_config('request.jwt.claims','{"sub":"40e247a5-ec08-4c0a-b8f9-62b44c0fcdac","role":"authenticated"}',true);
set local role authenticated;
do $$
declare v_id uuid;v_copy uuid;v_ex uuid;v_item uuid;v_items jsonb;v_count integer;
begin
 select id into strict v_ex from public.exercicios where nome='Supino Reto' and grupo_muscular='Peito';
 v_items=jsonb_build_array(jsonb_build_object('exercicio_id',v_ex,'series',3,'repeticoes','10','descanso_segundos',60,'ordem',0));
 v_id=public.criar_ficha_atomica('05067dea-ec38-4f40-a592-e2bff1275d06','Validação Sprint 3',v_items);
 select id into strict v_item from public.itens_treino where treino_id=v_id;
 insert into public.prescricoes_treino(item_treino_id,carga_alvo,observacoes)values(v_item,20,'Preservar prescrição');
 perform public.editar_ficha_atomica(v_id,'Validação editada',v_items);
 if not exists(select 1 from public.itens_treino where id=v_item and treino_id=v_id) then raise exception 'ID não preservado';end if;
 if not exists(select 1 from public.prescricoes_treino where item_treino_id=v_item and carga_alvo=20) then raise exception 'Prescrição perdida';end if;
 v_copy=public.duplicar_ficha_atomica(v_id);
 if not exists(select 1 from public.treinos where id=v_copy and ativo=false)then raise exception 'Cópia não criada';end if;
 if not exists(select 1 from public.prescricoes_treino p join public.itens_treino i on i.id=p.item_treino_id where i.treino_id=v_copy and carga_alvo=20)then raise exception 'Prescrição não copiada';end if;
 select count(*) into v_count from public.treinos where personal_id=auth.uid();
 begin
  perform public.criar_ficha_atomica('05067dea-ec38-4f40-a592-e2bff1275d06','Ficha inválida',jsonb_build_array(jsonb_build_object('exercicio_id',gen_random_uuid(),'series',3,'repeticoes','10','descanso_segundos',60,'ordem',0)));
  raise exception 'Exercício inexistente foi aceito';
 exception when foreign_key_violation then null;end;
 if (select count(*) from public.treinos where personal_id=auth.uid())<>v_count then raise exception 'Criação parcial';end if;
 begin perform public.editar_ficha_atomica(v_id,'Não salvar','[]'::jsonb);raise exception 'Ficha vazia aceita';exception when invalid_parameter_value then null;end;
 if not exists(select 1 from public.treinos where id=v_id and titulo='Validação editada')then raise exception 'Edição parcial';end if;
 perform set_config('test.sprint3_workout',v_id::text,true);
end;$$;
select set_config('request.jwt.claim.sub','05067dea-ec38-4f40-a592-e2bff1275d06',true);
select set_config('request.jwt.claims','{"sub":"05067dea-ec38-4f40-a592-e2bff1275d06","role":"authenticated"}',true);
do $$begin
 if not exists(select 1 from public.treinos where id=current_setting('test.sprint3_workout')::uuid)then raise exception 'Aluno não lê a própria ficha';end if;
 begin perform public.editar_ficha_atomica(current_setting('test.sprint3_workout')::uuid,'Proibido','[]'::jsonb);raise exception 'Aluno alterou ficha';exception when insufficient_privilege then null;end;
end;$$;
select 'PASS: criar, editar, duplicar, preservar prescrição, rollback e permissão do aluno' as resultado;
rollback;
