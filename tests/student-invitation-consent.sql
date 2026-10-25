-- Run with an administrative SQL connection. All test writes are rolled back.
begin;
do $$
declare
  p uuid; a uuid; b uuid; a_email text; b_email text; invitation uuid; declined uuid; expired uuid; link uuid; duplicate_link uuid;
begin
  select u.id into p from public.usuarios u where tipo='PERSONAL' and status_conta='ATIVO'
    and (select count(*) from public.usuarios s where s.tipo='ALUNO' and s.status_conta='ATIVO'
      and not exists(select 1 from public.personal_alunos pa where pa.personal_id=u.id and pa.aluno_id=s.id))>=2 limit 1;
  select id,email into a,a_email from public.usuarios s where tipo='ALUNO' and status_conta='ATIVO'
    and not exists(select 1 from public.personal_alunos pa where pa.personal_id=p and pa.aluno_id=s.id) limit 1;
  select id,email into b,b_email from public.usuarios s where tipo='ALUNO' and status_conta='ATIVO' and id<>a
    and not exists(select 1 from public.personal_alunos pa where pa.personal_id=p and pa.aluno_id=s.id) limit 1;
  if p is null or a is null or b is null then raise exception 'Insufficient existing fixtures'; end if;
  -- Leave pre-existing pending invitations intact; remove only within this rollback.
  update public.convites_aluno set estado='CANCELADO' where personal_id=p and email in(lower(a_email),lower(b_email)) and estado='PENDENTE';
  insert into public.convites_aluno(personal_id,personal_nome,email) values(p,'Consent regression',lower(a_email)) returning id into invitation;
  insert into public.convites_aluno(personal_id,personal_nome,email) values(p,'Consent regression',lower(b_email)) returning id into declined;

  perform set_config('request.jwt.claims',json_build_object('sub',p,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  begin
    insert into public.personal_alunos(personal_id,aluno_id) values(p,a);
    raise exception 'SECURITY FAILURE: personal inserted a direct link';
  exception when insufficient_privilege then null; end;
  if exists(select 1 from public.usuarios where id=a) then raise exception 'SECURITY FAILURE: personal reads student before consent'; end if;
  begin
    perform public.responder_convite_aluno(invitation,true);
    raise exception 'SECURITY FAILURE: personal accepted for student';
  exception when insufficient_privilege then null; end;
  begin
    update public.convites_aluno set estado='ACEITO' where id=invitation;
    raise exception 'SECURITY FAILURE: direct invitation update';
  exception when insufficient_privilege then null; end;

  perform set_config('request.jwt.claims',json_build_object('sub',b,'role','authenticated')::text,true);
  if exists(select 1 from public.convites_aluno where id=invitation) then raise exception 'SECURITY FAILURE: another student sees invitation'; end if;
  begin
    perform public.responder_convite_aluno(invitation,true);
    raise exception 'SECURITY FAILURE: another student accepted';
  exception when insufficient_privilege then null; end;
  perform public.responder_convite_aluno(declined,false);
  if exists(select 1 from public.personal_alunos where personal_id=p and aluno_id=b) then raise exception 'Decline created a link'; end if;

  perform set_config('request.jwt.claims',json_build_object('sub',a,'role','authenticated')::text,true);
  if not exists(select 1 from public.convites_aluno where id=invitation) then raise exception 'Invited student cannot read invitation'; end if;
  link:=public.responder_convite_aluno(invitation,true);
  duplicate_link:=public.responder_convite_aluno(invitation,true);
  if link is null or link<>duplicate_link then raise exception 'Accept was not idempotent'; end if;
  if not exists(select 1 from public.personal_alunos where id=link and aluno_id=a and personal_id=p and status='ATIVO') then raise exception 'Acceptance did not activate link'; end if;

  perform set_config('request.jwt.claims',json_build_object('sub',p,'role','authenticated')::text,true);
  if not exists(select 1 from public.usuarios where id=a) then raise exception 'Personal cannot see student after consent'; end if;
  begin
    update public.personal_alunos set aluno_id=b where id=link;
    raise exception 'SECURITY FAILURE: participants changed';
  exception when insufficient_privilege then null; end;

  execute 'reset role';
  insert into public.convites_aluno(personal_id,personal_nome,email,criado_em,expira_em)
  values(p,'Expired regression',lower(b_email),now()-interval '2 hours',now()-interval '1 hour') returning id into expired;
  perform set_config('request.jwt.claims',json_build_object('sub',b,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  begin
    perform public.responder_convite_aluno(expired,true);
    raise exception 'SECURITY FAILURE: expired invitation accepted';
  exception when raise_exception then
    if sqlerrm not like 'Convite inválido ou expirado.%' then raise; end if;
  end;
  if exists(select 1 from public.personal_alunos where personal_id=p and aluno_id=b) then raise exception 'Expired invitation created link'; end if;
end $$;
rollback;
