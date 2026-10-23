create table public.personal_lembretes (
  id uuid primary key default gen_random_uuid(),
  personal_id uuid not null references public.usuarios(id) on delete cascade,
  titulo text not null check(char_length(btrim(titulo)) between 3 and 120),
  descricao text not null default '' check(char_length(descricao)<=1000),
  data date not null check(data between date '0001-01-01' and date '9999-12-31'),
  concluido boolean not null default false,
  concluido_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index personal_lembretes_semana_idx on public.personal_lembretes(personal_id,data,id);
alter table public.personal_lembretes enable row level security;
revoke all on public.personal_lembretes from public,anon,authenticated;
grant select,delete on public.personal_lembretes to authenticated;
grant insert(id,personal_id,titulo,descricao,data) on public.personal_lembretes to authenticated;
grant update(titulo,descricao,data,concluido) on public.personal_lembretes to authenticated;
create policy lembretes_proprios on public.personal_lembretes for all to authenticated
using(personal_id=(select auth.uid()) and exists(select 1 from public.usuarios u where u.id=(select auth.uid()) and u.tipo='PERSONAL' and u.status_conta='ATIVO'))
with check(personal_id=(select auth.uid()) and exists(select 1 from public.usuarios u where u.id=(select auth.uid()) and u.tipo='PERSONAL' and u.status_conta='ATIVO'));
create function public.atualizar_lembrete_personal() returns trigger language plpgsql security invoker set search_path='' as $$
begin
  new.atualizado_em=now();
  if tg_op='INSERT' then new.concluido_em=null;
  elsif new.concluido and not old.concluido then new.concluido_em=now();
  elsif not new.concluido then new.concluido_em=null;
  else new.concluido_em=old.concluido_em;end if;
  return new;
end;$$;
revoke all on function public.atualizar_lembrete_personal() from public,anon,authenticated;
create trigger atualizar_lembrete_personal before insert or update on public.personal_lembretes for each row execute function public.atualizar_lembrete_personal();
