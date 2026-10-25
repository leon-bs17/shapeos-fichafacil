-- Restore the invite-only dependency without replaying unrelated legacy migrations.
create table if not exists public.convite_rate_limit (
  usuario_id uuid primary key references public.usuarios(id) on delete cascade,
  janela_inicio timestamptz not null default now(),
  quantidade integer not null default 0 check (quantidade >= 0)
);

alter table public.convite_rate_limit enable row level security;
revoke all on public.convite_rate_limit from public, anon, authenticated;
grant select, insert, update on public.convite_rate_limit to service_role;

create or replace function public.consumir_limite_convite(
  p_usuario_id uuid,
  p_limite integer default 10,
  p_janela_segundos integer default 60
)
returns boolean
language plpgsql
security invoker
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
from public, anon, authenticated;
grant execute on function public.consumir_limite_convite(uuid, integer, integer)
to service_role;

