-- Security and consistency hardening.
-- 1) Prevent authenticated users from changing sensitive identity/role fields.
-- 2) Make workout create/edit/duplicate operations atomic.
-- 3) Add a persistent rate limiter for the invite Edge Function.

create or replace function public.proteger_campos_sensiveis_usuario()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if
    new.id is distinct from old.id
    or new.email is distinct from old.email
    or new.tipo is distinct from old.tipo
    or new.criado_em is distinct from old.criado_em
  then
    if current_user not in ('postgres', 'service_role')
      and not public.eh_admin()
    then
      raise exception 'Campos sensiveis do usuario nao podem ser alterados';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists proteger_campos_sensiveis_usuario
on public.usuarios;

create trigger proteger_campos_sensiveis_usuario
before update on public.usuarios
for each row
execute function public.proteger_campos_sensiveis_usuario();

create or replace function public.criar_ficha_atomica(
  p_aluno_id uuid,
  p_titulo text,
  p_itens jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_treino_id uuid;
begin
  if not public.eh_personal_autenticado()
    or not public.eh_personal_do(p_aluno_id)
  then
    raise exception 'Aluno nao vinculado ao personal autenticado';
  end if;

  if nullif(trim(p_titulo), '') is null then
    raise exception 'Titulo da ficha e obrigatorio';
  end if;

  insert into public.treinos (aluno_id, personal_id, titulo)
  values (p_aluno_id, auth.uid(), trim(p_titulo))
  returning id into v_treino_id;

  insert into public.itens_treino (
    treino_id,
    exercicio_id,
    series,
    repeticoes,
    descanso_segundos,
    ordem
  )
  select
    v_treino_id,
    item.exercicio_id,
    item.series,
    item.repeticoes,
    item.descanso_segundos,
    item.ordem
  from jsonb_to_recordset(coalesce(p_itens, '[]'::jsonb)) as item(
    exercicio_id uuid,
    series integer,
    repeticoes text,
    descanso_segundos integer,
    ordem integer
  );

  return v_treino_id;
end;
$$;

create or replace function public.editar_ficha_atomica(
  p_ficha_id uuid,
  p_titulo text,
  p_itens jsonb
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if nullif(trim(p_titulo), '') is null then
    raise exception 'Titulo da ficha e obrigatorio';
  end if;

  if not exists (
    select 1
    from public.treinos
    where id = p_ficha_id
      and personal_id = auth.uid()
  ) then
    raise exception 'Ficha nao encontrada ou sem permissao';
  end if;

  update public.treinos
  set titulo = trim(p_titulo)
  where id = p_ficha_id
    and personal_id = auth.uid();

  delete from public.itens_treino
  where treino_id = p_ficha_id;

  insert into public.itens_treino (
    treino_id,
    exercicio_id,
    series,
    repeticoes,
    descanso_segundos,
    ordem
  )
  select
    p_ficha_id,
    item.exercicio_id,
    item.series,
    item.repeticoes,
    item.descanso_segundos,
    item.ordem
  from jsonb_to_recordset(coalesce(p_itens, '[]'::jsonb)) as item(
    exercicio_id uuid,
    series integer,
    repeticoes text,
    descanso_segundos integer,
    ordem integer
  );
end;
$$;

create or replace function public.duplicar_ficha_atomica(
  p_ficha_id uuid
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_origem public.treinos%rowtype;
  v_nova_id uuid;
begin
  select *
  into v_origem
  from public.treinos
  where id = p_ficha_id
    and personal_id = auth.uid();

  if not found then
    raise exception 'Ficha nao encontrada ou sem permissao';
  end if;

  insert into public.treinos (
    aluno_id,
    personal_id,
    titulo,
    ativo
  )
  values (
    v_origem.aluno_id,
    auth.uid(),
    v_origem.titulo || ' (cópia)',
    false
  )
  returning id into v_nova_id;

  insert into public.itens_treino (
    treino_id,
    exercicio_id,
    series,
    repeticoes,
    descanso_segundos,
    ordem
  )
  select
    v_nova_id,
    exercicio_id,
    series,
    repeticoes,
    descanso_segundos,
    ordem
  from public.itens_treino
  where treino_id = p_ficha_id
  order by ordem;

  return v_nova_id;
end;
$$;

revoke all on function public.criar_ficha_atomica(uuid, text, jsonb)
from public;
revoke all on function public.editar_ficha_atomica(uuid, text, jsonb)
from public;
revoke all on function public.duplicar_ficha_atomica(uuid)
from public;

grant execute on function public.criar_ficha_atomica(uuid, text, jsonb)
to authenticated;
grant execute on function public.editar_ficha_atomica(uuid, text, jsonb)
to authenticated;
grant execute on function public.duplicar_ficha_atomica(uuid)
to authenticated;

create table if not exists public.convite_rate_limit (
  usuario_id uuid primary key references public.usuarios(id) on delete cascade,
  janela_inicio timestamptz not null default now(),
  quantidade integer not null default 0 check (quantidade >= 0)
);

alter table public.convite_rate_limit enable row level security;
revoke all on public.convite_rate_limit from anon, authenticated;

create or replace function public.consumir_limite_convite(
  p_usuario_id uuid,
  p_limite integer default 10,
  p_janela_segundos integer default 60
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_agora timestamptz := clock_timestamp();
  v_inicio timestamptz;
  v_quantidade integer;
begin
  if p_usuario_id is null
    or p_limite < 1
    or p_janela_segundos < 1
  then
    return false;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_usuario_id::text, 0));

  select janela_inicio, quantidade
  into v_inicio, v_quantidade
  from public.convite_rate_limit
  where usuario_id = p_usuario_id
  for update;

  if not found then
    insert into public.convite_rate_limit (
      usuario_id,
      janela_inicio,
      quantidade
    )
    values (p_usuario_id, v_agora, 1);
    return true;
  end if;

  if v_agora - v_inicio >= make_interval(secs => p_janela_segundos) then
    update public.convite_rate_limit
    set janela_inicio = v_agora,
        quantidade = 1
    where usuario_id = p_usuario_id;
    return true;
  end if;

  if v_quantidade >= p_limite then
    return false;
  end if;

  update public.convite_rate_limit
  set quantidade = quantidade + 1
  where usuario_id = p_usuario_id;

  return true;
end;
$$;

revoke all on function public.consumir_limite_convite(uuid, integer, integer)
from public;
grant execute on function public.consumir_limite_convite(uuid, integer, integer)
to service_role;
