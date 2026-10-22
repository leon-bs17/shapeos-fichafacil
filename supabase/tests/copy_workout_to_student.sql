-- All test records and temporary links are rolled back. No accounts are created.
begin;
do $$
declare v_target uuid;
begin
  select id into v_target from public.usuarios
    where tipo='ALUNO' and status_conta='ATIVO' and id<>'05067dea-ec38-4f40-a592-e2bff1275d06'
    order by id limit 1;
  if v_target is null then raise exception 'O teste requer dois alunos ativos existentes';end if;
  perform set_config('test.copy_target',v_target::text,true);
  insert into public.personal_alunos(personal_id,aluno_id,status)
    values('40e247a5-ec08-4c0a-b8f9-62b44c0fcdac','05067dea-ec38-4f40-a592-e2bff1275d06','ATIVO'),
          ('40e247a5-ec08-4c0a-b8f9-62b44c0fcdac',v_target,'ATIVO')
    on conflict(personal_id,aluno_id) do update set status='ATIVO';
end;$$;
select set_config('request.jwt.claim.sub','40e247a5-ec08-4c0a-b8f9-62b44c0fcdac',true);
select set_config('request.jwt.claims','{"sub":"40e247a5-ec08-4c0a-b8f9-62b44c0fcdac","role":"authenticated"}',true);
set local role authenticated;
do $$
declare v_source uuid;v_copy uuid;v_ex uuid;v_items jsonb;v_count integer;
begin
  select id into strict v_ex from public.exercicios where nome='Supino Reto' and grupo_muscular='Peito';
  v_items=jsonb_build_array(
    jsonb_build_object('exercicio_id',v_ex,'series',3,'repeticoes','10','descanso_segundos',60,'ordem',0),
    jsonb_build_object('exercicio_id',v_ex,'series',4,'repeticoes','8','descanso_segundos',90,'ordem',1));
  v_source=public.criar_ficha_com_validade('05067dea-ec38-4f40-a592-e2bff1275d06','Origem para duplicação',v_items,current_date+14);
  insert into public.prescricoes_treino(item_treino_id,carga_alvo,duracao_segundos,rpe_alvo,superset,aquecimento,incremento_kg,observacoes)
    select id,20+ordem*5,60,8,'A',1,2.5,'Orientação original' from public.itens_treino where treino_id=v_source;
  v_copy=public.duplicar_ficha_para_aluno(v_source,current_setting('test.copy_target')::uuid,'Ficha adaptável');
  if not exists(select 1 from public.treinos where id=v_copy and aluno_id=current_setting('test.copy_target')::uuid and personal_id=auth.uid() and titulo='Ficha adaptável' and not ativo and valida_ate is null) then raise exception 'Cópia incorreta';end if;
  if not exists(select 1 from public.treinos where id=v_source and aluno_id='05067dea-ec38-4f40-a592-e2bff1275d06' and ativo and valida_ate=current_date+14 and titulo='Origem para duplicação') then raise exception 'Origem alterada';end if;
  if (select count(*) from public.itens_treino where treino_id=v_copy)<>2 then raise exception 'Exercícios não copiados';end if;
  if exists(
    (select i.ordem,i.exercicio_id,i.series,i.repeticoes,i.descanso_segundos,p.carga_alvo,p.duracao_segundos,p.rpe_alvo,p.superset,p.aquecimento,p.incremento_kg,p.observacoes
     from public.itens_treino i join public.prescricoes_treino p on p.item_treino_id=i.id where i.treino_id=v_source)
    except
    (select i.ordem,i.exercicio_id,i.series,i.repeticoes,i.descanso_segundos,p.carga_alvo,p.duracao_segundos,p.rpe_alvo,p.superset,p.aquecimento,p.incremento_kg,p.observacoes
     from public.itens_treino i join public.prescricoes_treino p on p.item_treino_id=i.id where i.treino_id=v_copy)
  ) then raise exception 'Prescrição incompleta';end if;
  if exists(select 1 from public.itens_treino novo join public.itens_treino antigo on novo.id=antigo.id where novo.treino_id=v_copy and antigo.treino_id=v_source) then raise exception 'IDs compartilhados';end if;
  update public.prescricoes_treino set carga_alvo=99 where item_treino_id in(select id from public.itens_treino where treino_id=v_copy and ordem=0);
  if not exists(select 1 from public.prescricoes_treino p join public.itens_treino i on i.id=p.item_treino_id where i.treino_id=v_source and i.ordem=0 and p.carga_alvo=20) then raise exception 'Alteração da cópia afetou origem';end if;
  if exists(select 1 from public.sessoes_treino where treino_id=v_copy) then raise exception 'Histórico indevido na cópia';end if;
  select count(*) into v_count from public.treinos where personal_id=auth.uid();
  begin
    perform public.duplicar_ficha_para_aluno(v_source,gen_random_uuid(),'Destino inválido');
    raise exception 'Destino não vinculado aceito';
  exception when insufficient_privilege then null;end;
  update public.personal_alunos set status='INATIVO' where personal_id=auth.uid() and aluno_id=current_setting('test.copy_target')::uuid;
  begin
    perform public.duplicar_ficha_para_aluno(v_source,current_setting('test.copy_target')::uuid,'Vínculo inativo');
    raise exception 'Vínculo inativo aceito';
  exception when insufficient_privilege then null;end;
  update public.personal_alunos set status='ATIVO' where personal_id=auth.uid() and aluno_id=current_setting('test.copy_target')::uuid;
  begin
    perform public.duplicar_ficha_para_aluno(v_source,current_setting('test.copy_target')::uuid,'ab');
    raise exception 'Título inválido aceito';
  exception when invalid_parameter_value then null;end;
  if (select count(*) from public.treinos where personal_id=auth.uid())<>v_count then raise exception 'Criação parcial após falha';end if;
  perform set_config('test.copy_source',v_source::text,true);
  perform set_config('test.copy_new',v_copy::text,true);
end;$$;
select set_config('request.jwt.claim.sub',current_setting('test.copy_target'),true);
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.copy_target'),'role','authenticated')::text,true);
do $$begin
  if not exists(select 1 from public.treinos where id=current_setting('test.copy_new')::uuid) then raise exception 'Destino não lê sua cópia';end if;
  if exists(select 1 from public.treinos where id=current_setting('test.copy_source')::uuid) then raise exception 'Destino acessou ficha de origem';end if;
  begin
    perform public.duplicar_ficha_para_aluno(current_setting('test.copy_source')::uuid,auth.uid(),'Proibido');
    raise exception 'Outro usuário duplicou a origem';
  exception when insufficient_privilege then null;end;
end;$$;
reset role;
do $$begin
  if exists(select 1 from pg_proc where pronamespace='public'::regnamespace and proname='duplicar_ficha_para_aluno' and (prosecdef or has_function_privilege('anon',oid,'execute'))) then raise exception 'Permissão insegura';end if;
end;$$;
rollback;
select 'PASS: cópia para outro aluno, prescrição completa, registros independentes, origem preservada, permissões e rollback' as resultado;
