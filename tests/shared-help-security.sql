-- Administrative verification; identities, links, messages and quota counters roll back.
begin;
do $$
declare student uuid:=gen_random_uuid(); outsider uuid:=gen_random_uuid(); trainer uuid:=gen_random_uuid(); admin_user uuid:=gen_random_uuid();
 ticket uuid:=gen_random_uuid(); technical uuid:=gen_random_uuid(); trainer_ticket uuid:=gen_random_uuid(); reply uuid:=gen_random_uuid();
 n integer; quota jsonb;
begin
 insert into auth.users(id,email,raw_user_meta_data) values
 (student,student||'@help-test.invalid',jsonb_build_object('nome','Aluno suporte teste','tipo','ALUNO')),
 (outsider,outsider||'@help-test.invalid',jsonb_build_object('nome','Outro aluno teste','tipo','ALUNO')),
 (trainer,trainer||'@help-test.invalid',jsonb_build_object('nome','Personal suporte teste','tipo','PERSONAL')),
 (admin_user,admin_user||'@help-test.invalid',jsonb_build_object('nome','Admin suporte teste','tipo','ALUNO'));
 update public.usuarios set status_conta='ATIVO' where id in(student,outsider,trainer,admin_user);
 update public.usuarios set tipo='ADMIN' where id=admin_user;
 insert into public.personal_alunos(personal_id,aluno_id,status) values(trainer,student,'ATIVO');
 perform set_config('request.jwt.claims',jsonb_build_object('sub',student,'role','authenticated')::text,true);
 execute 'set local role authenticated';
 perform public.abrir_suporte(ticket,'PERSONAL',trainer,'Dúvida sobre a ficha','Tenho uma dúvida sobre este exercício.');
 perform public.abrir_suporte(ticket,'PERSONAL',trainer,'Dúvida sobre a ficha','Tenho uma dúvida sobre este exercício.');
 if (select count(*) from public.solicitacoes_suporte where id=ticket)<>1 then raise exception 'Opening was not idempotent';end if;
 perform public.abrir_suporte(technical,'SISTEMA',null,'Problema técnico','A página não abriu neste navegador.');
 if (select count(*) from public.meus_personais())<>1 then raise exception 'Trainer list missing';end if;
 begin perform public.responder_suporte(ticket,'Tentar resolver por conta própria','RESOLVIDO',gen_random_uuid());raise exception 'Requester changed status';exception when insufficient_privilege then null;end;
 begin insert into public.solicitacoes_suporte(aluno_id,destino,assunto,mensagem,status)values(student,'SISTEMA','Forjado','Status forjado diretamente','RESOLVIDO');raise exception 'Direct writes allowed';exception when insufficient_privilege then null;end;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',trainer,'role','authenticated')::text,true);
 perform public.responder_suporte(ticket,'Recebi sua dúvida e vou ajudar.','EM_ATENDIMENTO',reply);
 perform public.responder_suporte(ticket,'Recebi sua dúvida e vou ajudar.','EM_ATENDIMENTO',reply);
 if (select count(*) from public.suporte_mensagens where solicitacao_id=ticket)<>1 then raise exception 'Reply duplicated';end if;
 if exists(select 1 from public.solicitacoes_suporte where id=technical)then raise exception 'Trainer read technical ticket';end if;
 perform public.abrir_suporte(trainer_ticket,'SISTEMA',null,'Suporte do Personal','Preciso de ajuda técnica na plataforma.');
 begin perform public.abrir_suporte(gen_random_uuid(),'PERSONAL',trainer,'Indevido','Personal não abre dúvida de Aluno.');raise exception 'Personal impersonated Student';exception when insufficient_privilege then null;end;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',outsider,'role','authenticated')::text,true);
 if exists(select 1 from public.solicitacoes_suporte where id=ticket) or exists(select 1 from public.suporte_mensagens where solicitacao_id=ticket) then raise exception 'Outsider read private conversation';end if;
 if exists(select 1 from public.meus_personais())then raise exception 'Outsider listed another trainer';end if;
 begin perform public.responder_suporte(ticket,'Resposta de outra pessoa',null,gen_random_uuid());raise exception 'Outsider replied';exception when insufficient_privilege then null;end;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',admin_user,'role','authenticated')::text,true);
 if exists(select 1 from public.solicitacoes_suporte where id=ticket) or exists(select 1 from public.suporte_mensagens where solicitacao_id=ticket) then raise exception 'Admin read Personal-only conversation';end if;
 if (select count(*) from public.solicitacoes_suporte where id in(technical,trainer_ticket))<>2 then raise exception 'Admin technical inbox missing';end if;
 perform public.responder_suporte(technical,'Problema técnico resolvido.','RESOLVIDO',gen_random_uuid());
 perform set_config('request.jwt.claims',jsonb_build_object('sub',student,'role','authenticated')::text,true);
 if (select status from public.solicitacoes_suporte where id=technical)<>'RESOLVIDO' then raise exception 'Resolution not visible';end if;
 perform public.responder_suporte(technical,'Tenho uma informação adicional.',null,gen_random_uuid());
 if (select status from public.solicitacoes_suporte where id=technical)<>'ABERTO' then raise exception 'Follow-up did not reopen';end if;
 execute 'reset role';
 update public.personal_alunos set status='INATIVO' where personal_id=trainer and aluno_id=student;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',trainer,'role','authenticated')::text,true);
 execute 'set local role authenticated';
 if exists(select 1 from public.solicitacoes_suporte where id=ticket) or exists(select 1 from public.suporte_mensagens where solicitacao_id=ticket) then raise exception 'Revoked trainer still has access';end if;
 execute 'reset role';
 delete from shapeos_private.mys_cotas where chave in('minute:'||student,'day:'||student,'global:day');
 perform set_config('request.jwt.claims',jsonb_build_object('sub',student,'role','authenticated')::text,true);
 execute 'set local role authenticated';
 quota:=public.consumir_cota_mys();if quota->>'permitido'<>'true' then raise exception 'Student Mys quota failed';end if;
 execute 'reset role';
 update public.usuarios set status_conta='BLOQUEADO' where id=student;
 execute 'set local role authenticated';
 if exists(select 1 from public.solicitacoes_suporte where id=technical)then raise exception 'Blocked requester retained access';end if;
 begin perform public.consumir_cota_mys();raise exception 'Blocked student consumed quota';exception when insufficient_privilege then null;end;
 execute 'reset role';
 execute 'set local role anon';
 begin perform public.abrir_suporte(gen_random_uuid(),'SISTEMA',null,'Anônimo','Não deve ser permitido');raise exception 'Anonymous opened a ticket';exception when insufficient_privilege then null;end;
 execute 'reset role';
end $$;
rollback;
