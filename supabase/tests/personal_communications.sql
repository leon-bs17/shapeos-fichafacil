begin;
do $$declare v_p uuid;v_students uuid[];v_admin uuid;v_notice uuid;begin
  select id into strict v_p from public.usuarios where tipo='PERSONAL' and status_conta='ATIVO' order by id limit 1;
  select array_agg(id) into v_students from(select id from public.usuarios where tipo='ALUNO' and status_conta='ATIVO' order by id limit 2) s;
  if cardinality(v_students)<>2 then raise exception 'Teste requer dois alunos ativos';end if;
  perform set_config('test.notice_personal',v_p::text,true);
  perform set_config('test.notice_a',v_students[1]::text,true);perform set_config('test.notice_b',v_students[2]::text,true);
  perform set_config('test.notice_envio',gen_random_uuid()::text,true);
  insert into public.personal_alunos(personal_id,aluno_id,status) select v_p,id,'ATIVO' from unnest(v_students) id on conflict(personal_id,aluno_id) do update set status='ATIVO';
  select id into v_admin from public.usuarios where tipo='ADMIN' limit 1;
  insert into public.admin_notificacoes(titulo,mensagem,publico,ativa,criado_por) values('Teste de compatibilidade','Aviso do Admin preservado','ALUNO',true,coalesce(v_admin,v_p)) returning id into v_notice;
  perform set_config('test.notice_admin',v_notice::text,true);
  perform set_config('request.jwt.claim.sub',v_p::text,true);perform set_config('request.jwt.claims',jsonb_build_object('sub',v_p,'role','authenticated')::text,true);
end;$$;
set local role authenticated;
do $$declare v_ids uuid[]:=array[current_setting('test.notice_a')::uuid,current_setting('test.notice_b')::uuid];v_envio uuid:=current_setting('test.notice_envio')::uuid;v_bad uuid:=gen_random_uuid();v_count integer;begin
  if public.publicar_comunicado_personal(v_envio,'  Orientação de teste  ','  Mensagem de teste  ',v_ids)<>2 then raise exception 'Envio incompleto';end if;
  if public.publicar_comunicado_personal(v_envio,'Orientação de teste','Mensagem de teste',v_ids)<>2 then raise exception 'Repetição falhou';end if;
  if (select count(*) from public.personal_comunicados where envio_id=v_envio)<>2 then raise exception 'Envio duplicado';end if;
  if not exists(select 1 from public.personal_comunicados_enviados where envio_id=v_envio and destinatarios=2 and leituras=0) then raise exception 'Histórico incorreto';end if;
  begin perform public.publicar_comunicado_personal(v_envio,'Outro título','Mensagem de teste',v_ids);raise exception 'Reuso de ID com outro conteúdo aceito';exception when invalid_parameter_value then null;end;
  begin perform public.publicar_comunicado_personal(gen_random_uuid(),'Duplicado','Mensagem',array[v_ids[1],v_ids[1]]);raise exception 'Destinatários repetidos aceitos';exception when invalid_parameter_value then null;end;
  begin perform public.publicar_comunicado_personal(v_bad,'Sem autorização','Mensagem',array[v_ids[1],gen_random_uuid()]);raise exception 'Destino não vinculado aceito';exception when insufficient_privilege then null;end;
  if exists(select 1 from public.personal_comunicados where envio_id=v_bad) then raise exception 'Envio parcial após erro';end if;
  update public.personal_alunos set status='INATIVO' where personal_id=auth.uid() and aluno_id=v_ids[2];
  begin perform public.publicar_comunicado_personal(v_bad,'Vínculo inativo','Mensagem',v_ids);raise exception 'Vínculo inativo aceito';exception when insufficient_privilege then null;end;
  update public.personal_alunos set status='ATIVO' where personal_id=auth.uid() and aluno_id=v_ids[2];
  if public.marcar_notificacoes_lidas(array(select id from public.personal_comunicados where envio_id=v_envio))<>0 then raise exception 'Autor marcou leitura por alunos';end if;
end;$$;
reset role;
do $$begin
  perform set_config('test.notice_message_a',(select id::text from public.personal_comunicados where envio_id=current_setting('test.notice_envio')::uuid and aluno_id=current_setting('test.notice_a')::uuid),true);
  perform set_config('test.notice_message_b',(select id::text from public.personal_comunicados where envio_id=current_setting('test.notice_envio')::uuid and aluno_id=current_setting('test.notice_b')::uuid),true);
end;$$;
select set_config('request.jwt.claim.sub',current_setting('test.notice_a'),true);
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.notice_a'),'role','authenticated')::text,true);
set local role authenticated;
do $$declare v_a uuid:=current_setting('test.notice_message_a')::uuid;v_b uuid:=current_setting('test.notice_message_b')::uuid;begin
  if not exists(select 1 from public.notificacoes_recebidas where id=v_a and mensagem='Mensagem de teste') then raise exception 'Aluno não recebeu comunicado';end if;
  if exists(select 1 from public.notificacoes_recebidas where id=v_b) then raise exception 'Aluno leu comunicado de outro destinatário';end if;
  if exists(select 1 from public.personal_comunicados_enviados) then raise exception 'Aluno leu histórico do Personal';end if;
  if public.marcar_notificacoes_lidas(array[v_a])<>1 or public.marcar_notificacoes_lidas(array[v_a])<>0 then raise exception 'Leitura não idempotente';end if;
  begin insert into public.personal_comunicado_leituras(comunicado_id) values(v_b);raise exception 'Aluno registrou leitura alheia';exception when insufficient_privilege then null;end;
  begin insert into public.personal_comunicado_leituras(comunicado_id,lida_em) values(v_a,now()-interval '1 year');raise exception 'Data de leitura forjada aceita';exception when insufficient_privilege then null;end;
  begin perform public.publicar_comunicado_personal(gen_random_uuid(),'Aluno não publica','Mensagem',array[auth.uid()]);raise exception 'Aluno publicou';exception when insufficient_privilege then null;end;
  perform public.marcar_notificacoes_lidas(null);
  if not exists(select 1 from public.notificacoes_recebidas where id=current_setting('test.notice_admin')::uuid and lida_em is not null) then raise exception 'Aviso do Admin não marcado';end if;
end;$$;
select set_config('request.jwt.claim.sub',current_setting('test.notice_personal'),true);
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.notice_personal'),'role','authenticated')::text,true);
do $$begin
  if not exists(select 1 from public.personal_comunicados_enviados where envio_id=current_setting('test.notice_envio')::uuid and destinatarios=2 and leituras=1) then raise exception 'Personal não recebeu leitura correta';end if;
  begin update public.personal_comunicados set mensagem='Alterada' where envio_id=current_setting('test.notice_envio')::uuid;raise exception 'Comunicado publicado alterado';exception when insufficient_privilege then null;end;
end;$$;
reset role;
do $$begin
  if has_table_privilege('anon','public.personal_comunicados','select') or has_table_privilege('authenticated','public.personal_comunicados','update') then raise exception 'Privilégios incorretos';end if;
  if exists(select 1 from pg_proc where oid='public.publicar_comunicado_personal(uuid,text,text,uuid[])'::regprocedure and (prosecdef or has_function_privilege('anon',oid,'execute'))) then raise exception 'RPC insegura';end if;
end;$$;
rollback;
select 'PASS: envio atômico e idempotente, vínculo ativo, destinatários isolados, leitura real preservada, avisos do Admin, histórico privado e rollback' as resultado;
