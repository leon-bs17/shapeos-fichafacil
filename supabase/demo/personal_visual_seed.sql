-- Manual, opt-in demonstration data for the Personal shown in the design review.
-- No passwords, identities, invitations or outbound messages are created.
-- Do not include this file in automatic migrations or automatic production seeds.
do $demo$
declare
  v_owner uuid := 'f0291878-1c10-4fc8-b4cb-4a2db7a717e8';
  v_marker text := 'shapeos-personal-visual-v1';
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
  v_ana uuid; v_bruno uuid; v_carla uuid;
  v_lower uuid; v_upper uuid; v_full uuid;
  v_student uuid; v_workout uuid; v_session uuid; v_item uuid;
  v_offset integer; v_index integer := 0; v_num integer;
  v_start timestamptz; v_prescription jsonb; v_sets jsonb;
  v_record record; v_exercise record;
begin
  perform pg_advisory_xact_lock(hashtextextended(v_marker || v_owner::text, 0));
  if not exists (select 1 from public.usuarios where id=v_owner and nome='Personal Teste' and tipo='PERSONAL' and status_conta='ATIVO') then
    raise exception 'Target Personal must be the verified active Personal Teste account';
  end if;
  if exists (select 1 from auth.users where raw_app_meta_data->>'demo_seed'=v_marker and raw_app_meta_data->>'demo_owner'=v_owner::text) then
    raise exception 'This demonstration dataset already exists; do not overwrite reviewed data';
  end if;
  if exists (select 1 from auth.users where email in ('ana.visual@demo.shapeos.invalid','bruno.visual@demo.shapeos.invalid','carla.visual@demo.shapeos.invalid')) then
    raise exception 'Demo address already exists; inspect before continuing';
  end if;
  if (select count(*) from public.exercicios where nome in ('Agachamento Livre','Supino Reto','Remada Baixa','Cadeira Extensora','Abdominal Supra')) <> 5 then
    raise exception 'Expected exercise catalogue not available or ambiguous';
  end if;

  -- The existing auth trigger creates public.usuarios with tipo ALUNO.
  -- Non-login placeholders satisfy the existing FK to auth.users.
  insert into auth.users(id,email,aud,role,encrypted_password,banned_until,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
  values(gen_random_uuid(),'ana.visual@demo.shapeos.invalid','authenticated','authenticated',null,'infinity',
    jsonb_build_object('demo_seed',v_marker,'demo_owner',v_owner),
    '{"nome":"Ana Beatriz Silva · Demonstração","tipo":"ALUNO"}',now(),now()) returning id into v_ana;
  insert into auth.users(id,email,aud,role,encrypted_password,banned_until,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
  values(gen_random_uuid(),'bruno.visual@demo.shapeos.invalid','authenticated','authenticated',null,'infinity',
    jsonb_build_object('demo_seed',v_marker,'demo_owner',v_owner),
    '{"nome":"Bruno Henrique Costa · Demonstração","tipo":"ALUNO"}',now(),now()) returning id into v_bruno;
  insert into auth.users(id,email,aud,role,encrypted_password,banned_until,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
  values(gen_random_uuid(),'carla.visual@demo.shapeos.invalid','authenticated','authenticated',null,'infinity',
    jsonb_build_object('demo_seed',v_marker,'demo_owner',v_owner),
    '{"nome":"Carla Oliveira · Demonstração","tipo":"ALUNO"}',now(),now()) returning id into v_carla;
  update public.usuarios set criado_em=(v_today-70)::timestamp at time zone 'America/Sao_Paulo' where id=v_ana;
  update public.usuarios set criado_em=(v_today-45)::timestamp at time zone 'America/Sao_Paulo' where id=v_bruno;
  update public.usuarios set criado_em=(v_today-1)::timestamp at time zone 'America/Sao_Paulo' where id=v_carla;
  insert into public.personal_alunos(personal_id,aluno_id,status,criado_em,proxima_avaliacao_em)
  values(v_owner,v_ana,'ATIVO',(v_today-70)::timestamp at time zone 'America/Sao_Paulo',v_today+14),
        (v_owner,v_bruno,'ATIVO',(v_today-45)::timestamp at time zone 'America/Sao_Paulo',v_today-2),
        (v_owner,v_carla,'ATIVO',(v_today-1)::timestamp at time zone 'America/Sao_Paulo',null);
  insert into public.treinos(personal_id,aluno_id,titulo,ativo,criado_em,valida_ate)
  values(v_owner,v_ana,'Treino A · Membros inferiores · Demonstração',true,(v_today-65)::timestamp at time zone 'America/Sao_Paulo',v_today+40) returning id into v_lower;
  insert into public.treinos(personal_id,aluno_id,titulo,ativo,criado_em,valida_ate)
  values(v_owner,v_ana,'Treino B · Membros superiores · Demonstração',true,(v_today-65)::timestamp at time zone 'America/Sao_Paulo',v_today+40) returning id into v_upper;
  insert into public.treinos(personal_id,aluno_id,titulo,ativo,criado_em,valida_ate)
  values(v_owner,v_bruno,'Treino completo · Revisão próxima · Demonstração',true,(v_today-40)::timestamp at time zone 'America/Sao_Paulo',v_today+3) returning id into v_full;
  for v_record in select id,aluno_id from public.treinos where id in(v_lower,v_upper,v_full) loop
    v_num := 0;
    for v_exercise in select id,nome from public.exercicios
      where nome = any(case when v_record.id=v_lower then array['Agachamento Livre','Cadeira Extensora','Abdominal Supra']
        when v_record.id=v_upper then array['Supino Reto','Remada Baixa','Abdominal Supra']
        else array['Agachamento Livre','Supino Reto','Remada Baixa'] end)
      order by case nome when 'Agachamento Livre' then 1 when 'Supino Reto' then 1 when 'Cadeira Extensora' then 2 when 'Remada Baixa' then 2 else 3 end, nome loop
      v_num := v_num + 1;
      insert into public.itens_treino(treino_id,exercicio_id,series,repeticoes,descanso_segundos,ordem)
      values(v_record.id,v_exercise.id,3,'10–12',60,v_num) returning id into v_item;
      insert into public.prescricoes_treino(item_treino_id,carga_alvo,rpe_alvo,incremento_kg,aquecimento,observacoes)
      values(v_item,case when v_exercise.nome='Abdominal Supra' then 0 else 20+v_num*5 end,7,2,0,'Dados fictícios para revisão do layout; não é uma prescrição real.');
    end loop;
  end loop;
  foreach v_offset in array array[42,35,28,21,14,10,7,5,3,1] loop
    v_index := v_index+1; v_student:=v_ana;
    v_workout:=case when v_index%2=0 then v_upper else v_lower end;
    v_start:=((v_today-v_offset)+time '08:00') at time zone 'America/Sao_Paulo';
    select jsonb_agg(jsonb_build_object('id',i.id,'exercicio_id',i.exercicio_id,'nome',e.nome,'grupo_muscular',e.grupo_muscular,'video_url',e.video_url,'series',i.series,'repeticoes',i.repeticoes,'descanso_segundos',i.descanso_segundos,'ordem',i.ordem,'config',to_jsonb(p)) order by i.ordem)
      into v_prescription from public.itens_treino i join public.exercicios e on e.id=i.exercicio_id join public.prescricoes_treino p on p.item_treino_id=i.id where i.treino_id=v_workout;
    select jsonb_agg(jsonb_build_object('id',gen_random_uuid(),'item_id',i.id,'carga',case when e.nome='Abdominal Supra' then 0 else 16+i.ordem*5+v_index end,'reps',12,'segundos',null,'rpe',7,'aquecimento',false,'registrado_em',v_start+make_interval(mins=>g.n*3+i.ordem*9)))
      into v_sets from public.itens_treino i join public.exercicios e on e.id=i.exercicio_id cross join generate_series(1,3) g(n) where i.treino_id=v_workout;
    insert into public.sessoes_treino(id,aluno_id,treino_id,titulo,inicio,fim,status,prescricao,series,observacoes)
    select gen_random_uuid(),v_student,v_workout,titulo,v_start,v_start+interval '45 minutes','CONCLUIDO',v_prescription,v_sets,'Sessão fictícia · Demonstração visual' from public.treinos where id=v_workout;
  end loop;
  foreach v_offset in array array[32,22,12] loop
    v_start:=((v_today-v_offset)+time '18:00') at time zone 'America/Sao_Paulo';
    select jsonb_agg(jsonb_build_object('id',i.id,'exercicio_id',i.exercicio_id,'nome',e.nome,'grupo_muscular',e.grupo_muscular,'series',i.series,'repeticoes',i.repeticoes,'descanso_segundos',i.descanso_segundos,'ordem',i.ordem,'config',to_jsonb(p)) order by i.ordem)
      into v_prescription from public.itens_treino i join public.exercicios e on e.id=i.exercicio_id join public.prescricoes_treino p on p.item_treino_id=i.id where i.treino_id=v_full;
    select jsonb_agg(jsonb_build_object('id',gen_random_uuid(),'item_id',i.id,'carga',20+i.ordem*5,'reps',10,'segundos',null,'rpe',8,'aquecimento',false,'registrado_em',v_start+make_interval(mins=>g.n*3+i.ordem*9)))
      into v_sets from public.itens_treino i cross join generate_series(1,3) g(n) where i.treino_id=v_full;
    insert into public.sessoes_treino(id,aluno_id,treino_id,titulo,inicio,fim,status,prescricao,series,observacoes)
    select gen_random_uuid(),v_bruno,v_full,titulo,v_start,v_start+interval '45 minutes','CONCLUIDO',v_prescription,v_sets,'Sessão fictícia · Demonstração visual' from public.treinos where id=v_full;
  end loop;
  -- A partial session exercises the "Em andamento" state without future timestamps.
  select prescricao into v_prescription from public.sessoes_treino where aluno_id=v_ana order by inicio desc limit 1;
  insert into public.sessoes_treino(id,aluno_id,treino_id,titulo,inicio,fim,status,prescricao,series,observacoes)
    select gen_random_uuid(),v_ana,v_upper,titulo,now()-interval '20 minutes',null,'EM_ANDAMENTO',v_prescription,
      jsonb_build_array(jsonb_build_object('id',gen_random_uuid(),'item_id',v_prescription->0->>'id','carga',30,'reps',12,'segundos',null,'rpe',7,'aquecimento',false,'registrado_em',now()-interval '10 minutes')),
      'Sessão fictícia em andamento · Demonstração' from public.treinos where id=v_upper;
  insert into public.avaliacoes_fisicas(aluno_id,data,peso,cintura,quadril,braco,observacoes)
  values(v_ana,v_today-60,72.5,81,101,30,'Avaliação fictícia · Demonstração'),
        (v_ana,v_today-30,71.8,79,100,30.5,'Avaliação fictícia · Demonstração'),
        (v_ana,v_today-5,71.2,78,99.5,31,'Avaliação fictícia · Demonstração'),
        (v_bruno,v_today-40,84,91,103,34,'Avaliação fictícia · Demonstração');
  insert into public.agenda_treino(aluno_id,treino_id,data)
    select aluno_id,treino_id,(inicio at time zone 'America/Sao_Paulo')::date from public.sessoes_treino
    where aluno_id=v_ana and status='CONCLUIDO' and (inicio at time zone 'America/Sao_Paulo')::date in (v_today-3,v_today-1);
  insert into public.agenda_treino(aluno_id,treino_id,data)
  values(v_ana,v_lower,v_today+1),(v_ana,v_upper,v_today+3),(v_bruno,v_full,v_today+2);
end
$demo$;
