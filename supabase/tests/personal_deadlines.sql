-- Existing example.invalid test accounts; every data change is rolled back.
begin;
insert into public.personal_alunos(personal_id,aluno_id,status)
values('40e247a5-ec08-4c0a-b8f9-62b44c0fcdac','05067dea-ec38-4f40-a592-e2bff1275d06','ATIVO')
on conflict(personal_id,aluno_id) do update set status='ATIVO';
select set_config('request.jwt.claim.sub','40e247a5-ec08-4c0a-b8f9-62b44c0fcdac',true);
select set_config('request.jwt.claims','{"sub":"40e247a5-ec08-4c0a-b8f9-62b44c0fcdac","role":"authenticated"}',true);
set local role authenticated;
do $$
declare v_id uuid;v_copy uuid;v_ex uuid;v_items jsonb;v_count integer;
begin
  select id into strict v_ex from public.exercicios where nome='Supino Reto' and grupo_muscular='Peito';
  v_items=jsonb_build_array(jsonb_build_object('exercicio_id',v_ex,'series',3,'repeticoes','10','descanso_segundos',60,'ordem',0));
  v_id=public.criar_ficha_com_validade('05067dea-ec38-4f40-a592-e2bff1275d06','Ficha com prazo',v_items,current_date+7);
  if not exists(select 1 from public.treinos where id=v_id and valida_ate=current_date+7) then raise exception 'Validade não persistida';end if;
  perform public.editar_ficha_com_validade(v_id,'Edição anterior compatível',v_items,null,false);
  if not exists(select 1 from public.treinos where id=v_id and valida_ate=current_date+7) then raise exception 'Prazo perdido em cliente antigo';end if;
  perform public.editar_ficha_com_validade(v_id,'Ficha sem prazo',v_items,null,true);
  if not exists(select 1 from public.treinos where id=v_id and valida_ate is null) then raise exception 'Prazo não foi removido';end if;
  begin
    perform public.editar_ficha_com_validade(v_id,'Não persistir edição',v_items,'infinity'::date,true);
    raise exception 'Prazo inválido aceito';
  exception when check_violation then null;end;
  if not exists(select 1 from public.treinos where id=v_id and titulo='Ficha sem prazo' and valida_ate is null) then raise exception 'Edição parcial';end if;
  select count(*) into v_count from public.treinos where personal_id=auth.uid();
  begin
    perform public.criar_ficha_com_validade('05067dea-ec38-4f40-a592-e2bff1275d06','Não persistir criação',v_items,'infinity'::date);
    raise exception 'Prazo inválido aceito';
  exception when check_violation then null;end;
  if (select count(*) from public.treinos where personal_id=auth.uid())<>v_count then raise exception 'Criação parcial';end if;
  perform public.editar_ficha_com_validade(v_id,'Ficha renovada',v_items,current_date+30,true);
  v_copy=public.duplicar_ficha_atomica(v_id);
  if not exists(select 1 from public.treinos where id=v_copy and not ativo and valida_ate is null) then raise exception 'Cópia herdou prazo antigo';end if;
  perform public.agendar_avaliacao_shapeos('05067dea-ec38-4f40-a592-e2bff1275d06',current_date+3);
  if not exists(select 1 from public.personal_alunos where personal_id=auth.uid() and aluno_id='05067dea-ec38-4f40-a592-e2bff1275d06' and proxima_avaliacao_em=current_date+3) then raise exception 'Agendamento não persistido';end if;
  perform public.agendar_avaliacao_shapeos('05067dea-ec38-4f40-a592-e2bff1275d06',null);
  if not exists(select 1 from public.personal_alunos where personal_id=auth.uid() and aluno_id='05067dea-ec38-4f40-a592-e2bff1275d06' and proxima_avaliacao_em is null) then raise exception 'Agendamento não removido';end if;
  begin
    perform public.agendar_avaliacao_shapeos(gen_random_uuid(),current_date);
    raise exception 'Aluno não vinculado aceito';
  exception when insufficient_privilege then null;end;
  update public.personal_alunos set status='INATIVO' where personal_id=auth.uid() and aluno_id='05067dea-ec38-4f40-a592-e2bff1275d06';
  begin
    perform public.agendar_avaliacao_shapeos('05067dea-ec38-4f40-a592-e2bff1275d06',current_date);
    raise exception 'Vínculo inativo aceito';
  exception when insufficient_privilege then null;end;
  update public.personal_alunos set status='ATIVO' where personal_id=auth.uid() and aluno_id='05067dea-ec38-4f40-a592-e2bff1275d06';
  perform set_config('test.dates_workout',v_id::text,true);
end;$$;
select set_config('request.jwt.claim.sub','05067dea-ec38-4f40-a592-e2bff1275d06',true);
select set_config('request.jwt.claims','{"sub":"05067dea-ec38-4f40-a592-e2bff1275d06","role":"authenticated"}',true);
do $$
begin
  if not exists(select 1 from public.treinos where id=current_setting('test.dates_workout')::uuid and valida_ate=current_date+30) then raise exception 'Aluno não lê validade';end if;
  begin
    perform public.agendar_avaliacao_shapeos(auth.uid(),current_date);
    raise exception 'Aluno alterou agendamento';
  exception when insufficient_privilege then null;end;
  begin
    perform public.editar_ficha_com_validade(current_setting('test.dates_workout')::uuid,'Proibido','[]'::jsonb,current_date,true);
    raise exception 'Aluno alterou validade';
  exception when insufficient_privilege then null;end;
end;$$;
reset role;
do $$begin
  if exists(select 1 from pg_proc where pronamespace='public'::regnamespace and proname in ('criar_ficha_com_validade','editar_ficha_com_validade','agendar_avaliacao_shapeos') and (prosecdef or has_function_privilege('anon',oid,'execute'))) then
    raise exception 'Permissão insegura nas novas funções';
  end if;
end;$$;
rollback;
select 'PASS: validade, renovação, remoção, compatibilidade, cópia, atomicidade, agenda e permissões; alterações de teste revertidas' as resultado;
