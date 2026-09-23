-- Product experience: plans, avatars and broadcast notifications.

create type public.plano_usuario as enum ('STARTER', 'PRO', 'DREAM');

alter table public.usuarios
  add column if not exists plano public.plano_usuario not null default 'STARTER',
  add column if not exists avatar_url text;

create or replace function public.criar_usuario_autenticado()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.usuarios (id, nome, email, tipo, plano, avatar_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      new.raw_user_meta_data ->> 'nome',
      split_part(new.email, '@', 1)
    ),
    new.email,
    coalesce(
      case
        when new.raw_user_meta_data ->> 'tipo' in ('PERSONAL', 'ALUNO')
          then (new.raw_user_meta_data ->> 'tipo')::public.tipo_usuario
      end,
      'PERSONAL'
    ),
    'STARTER',
    coalesce(
      new.raw_user_meta_data ->> 'avatar_url',
      new.raw_user_meta_data ->> 'picture'
    )
  );
  return new;
end;
$$;

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
    or new.plano is distinct from old.plano
    or new.criado_em is distinct from old.criado_em
  then
    if current_user not in ('postgres', 'service_role')
      and not coalesce(
        (
          select u.tipo = 'ADMIN'
          from public.usuarios u
          where u.id = auth.uid()
        ),
        false
      )
    then
      raise exception 'Campos sensiveis do usuario nao podem ser alterados';
    end if;
  end if;

  return new;
end;
$$;

create table public.broadcast_mensagens (
  id uuid primary key default gen_random_uuid(),
  titulo text not null check (char_length(trim(titulo)) between 2 and 100),
  mensagem text not null check (char_length(trim(mensagem)) between 2 and 600),
  nivel text not null default 'INFO'
    check (nivel in ('INFO', 'SUCCESS', 'WARNING', 'ERROR')),
  audiencia text not null default 'TODOS'
    check (audiencia in ('TODOS', 'PERSONAL', 'ALUNO', 'ADMIN')),
  ativo boolean not null default true,
  inicio timestamptz not null default now(),
  fim timestamptz,
  criado_por uuid references public.usuarios(id) on delete set null,
  criado_em timestamptz not null default now(),
  constraint broadcast_periodo_valido check (fim is null or fim > inicio)
);

create index idx_broadcast_ativo_inicio
on public.broadcast_mensagens (ativo, inicio desc);

create table public.broadcast_leituras (
  broadcast_id uuid not null references public.broadcast_mensagens(id) on delete cascade,
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  lido_em timestamptz not null default now(),
  primary key (broadcast_id, usuario_id)
);

alter table public.broadcast_mensagens enable row level security;
alter table public.broadcast_leituras enable row level security;

create policy "broadcast_select_destinatarios"
on public.broadcast_mensagens for select
to authenticated
using (
  (
    ativo = true
    and inicio <= now()
    and (fim is null or fim > now())
    and (
      audiencia = 'TODOS'
      or audiencia = public.auth_tipo_usuario()::text
    )
  )
  or public.eh_admin()
);

create policy "broadcast_admin_insert"
on public.broadcast_mensagens for insert
to authenticated
with check (public.eh_admin() and criado_por = auth.uid());

create policy "broadcast_admin_update"
on public.broadcast_mensagens for update
to authenticated
using (public.eh_admin())
with check (public.eh_admin());

create policy "broadcast_admin_delete"
on public.broadcast_mensagens for delete
to authenticated
using (public.eh_admin());

create policy "broadcast_leituras_select_proprias"
on public.broadcast_leituras for select
to authenticated
using (usuario_id = auth.uid() or public.eh_admin());

create policy "broadcast_leituras_insert_proprias"
on public.broadcast_leituras for insert
to authenticated
with check (usuario_id = auth.uid());

create policy "broadcast_leituras_delete_proprias"
on public.broadcast_leituras for delete
to authenticated
using (usuario_id = auth.uid());

grant select on public.broadcast_mensagens to authenticated;
grant select, insert, delete on public.broadcast_leituras to authenticated;
grant all privileges on public.broadcast_mensagens, public.broadcast_leituras to service_role;
