-- Transactional integration test. No fixtures or read receipts survive rollback.
begin isolation level repeatable read;

create temporary table inbox_test_actors as
select id, tipo, row_number() over (partition by tipo order by id) as position
from public.usuarios where status_conta = 'ATIVO';
create temporary table inbox_test_items (kind text, id uuid);
with fixtures as (
  insert into public.admin_notificacoes (titulo, mensagem, publico, ativa, expira_em, criado_por)
  select '__inbox_test_' || v.kind, 'Aviso temporário do teste transacional.', v.publico, v.ativa,
    case when v.kind = 'expired' then now() - interval '1 minute' else null end,
    (select id from inbox_test_actors where tipo = 'ADMIN' and position = 1)
  from (values
    ('all', 'TODOS', true), ('personal', 'PERSONAL', true), ('student', 'ALUNO', true),
    ('paused', 'TODOS', false), ('expired', 'TODOS', true)
  ) v(kind, publico, ativa)
  returning id, titulo
)
insert into inbox_test_items select replace(titulo, '__inbox_test_', ''), id from fixtures;
grant select on inbox_test_actors, inbox_test_items to authenticated;

select set_config('request.jwt.claims', jsonb_build_object('sub', (select id from inbox_test_actors where tipo='ADMIN' and position=1), 'role','authenticated')::text, true);
set local role authenticated;
do $$
begin
  if (select count(*) from public.notificacoes_recebidas where id in (select id from inbox_test_items)) <> 1 then
    raise exception 'Admin inbox must exclude targeted, paused and expired communications';
  end if;
end $$;
reset role;

select set_config('request.jwt.claims', jsonb_build_object('sub', (select id from inbox_test_actors where tipo='PERSONAL' and position=1), 'role','authenticated')::text, true);
set local role authenticated;
do $$
declare
  first_read timestamptz;
  notice_id uuid := (select id from inbox_test_items where kind='all');
begin
  if (select count(*) from public.notificacoes_recebidas where id in (select id from inbox_test_items) and lida_em is null) <> 2 then
    raise exception 'Personal must receive all + personal communications';
  end if;
  if public.marcar_notificacoes_lidas(array[notice_id]) <> 1 then
    raise exception 'Single read must create exactly one receipt';
  end if;
  select lida_em into first_read from public.notificacoes_recebidas where id=notice_id;
  if first_read is null or public.marcar_notificacoes_lidas(array[notice_id]) <> 0 then
    raise exception 'Read must persist and be idempotent';
  end if;
  if (select lida_em from public.notificacoes_recebidas where id=notice_id) is distinct from first_read then
    raise exception 'A second read must preserve the first timestamp';
  end if;
  if (select count(*) from public.notificacoes_recebidas where id in (select id from inbox_test_items) and lida_em is null) <> 1 then
    raise exception 'Unread count must decrease after a successful read';
  end if;
end $$;
reset role;

select set_config('request.jwt.claims', jsonb_build_object('sub', (select id from inbox_test_actors where tipo='PERSONAL' and position=2), 'role','authenticated')::text, true);
set local role authenticated;
do $$
begin
  if (select count(*) from public.notificacao_leituras where notificacao_id in (select id from inbox_test_items)) <> 0 then
    raise exception 'A user must not see another user read receipts';
  end if;
  if (select count(*) from public.notificacoes_recebidas where id in (select id from inbox_test_items) and lida_em is null) <> 2 then
    raise exception 'Reading must not change another user unread count';
  end if;
  if public.marcar_notificacoes_lidas(array[(select id from inbox_test_items where kind='student')]) <> 0 then
    raise exception 'Cannot mark another audience communication';
  end if;
  begin
    insert into public.notificacao_leituras (usuario_id, notificacao_id)
    values ((select id from inbox_test_actors where tipo='PERSONAL' and position=1), (select id from inbox_test_items where kind='personal'));
    raise exception 'Receipt ownership could be forged';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.notificacao_leituras (usuario_id, notificacao_id)
    values (auth.uid(), (select id from inbox_test_items where kind='student'));
    raise exception 'Recipient audience could be bypassed';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

select set_config('request.jwt.claims', jsonb_build_object('sub', (select id from inbox_test_actors where tipo='ALUNO' and position=1), 'role','authenticated')::text, true);
set local role authenticated;
do $$
declare
  expected integer := (select count(*) from public.notificacoes_recebidas where lida_em is null);
begin
  if (select count(*) from public.notificacoes_recebidas where id in (select id from inbox_test_items)) <> 2 then
    raise exception 'Student must receive all + student communications';
  end if;
  if public.marcar_notificacoes_lidas(null) <> expected then
    raise exception 'Mark all must include the entire inbox';
  end if;
  if (select count(*) from public.notificacoes_recebidas where lida_em is null) <> 0 or public.marcar_notificacoes_lidas(null) <> 0 then
    raise exception 'Mark all must clear count and be idempotent';
  end if;
  if (select count(*) from public.notificacao_leituras where notificacao_id in (select id from inbox_test_items)) <> 2 then
    raise exception 'Only the current student read receipts should be visible';
  end if;
end $$;
reset role;

select set_config('request.jwt.claims', jsonb_build_object('sub', gen_random_uuid(), 'role','authenticated')::text, true);
set local role authenticated;
do $$
begin
  if (select count(*) from public.notificacoes_recebidas) <> 0 or public.marcar_notificacoes_lidas(null) <> 0 then
    raise exception 'An account without an active profile must not receive notices';
  end if;
end $$;
reset role;

select set_config('request.jwt.claims', '{}', true);
set local role anon;
do $$
begin
  begin
    perform id from public.notificacoes_recebidas;
    raise exception 'Anonymous inbox access was allowed';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.marcar_notificacoes_lidas(null);
    raise exception 'Anonymous marking was allowed';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
rollback;
select 'PASS: audiences, expiration, read persistence, idempotence, ownership, exact counts and anonymous denial; fixtures rolled back' as verification;
