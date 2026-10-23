create table public.exercicios_favoritos (
  personal_id uuid not null references public.usuarios(id) on delete cascade,
  exercicio_id uuid not null references public.exercicios(id) on delete cascade,
  criado_em timestamptz not null default now(),
  primary key (personal_id, exercicio_id)
);
create index exercicios_favoritos_exercicio_idx on public.exercicios_favoritos(exercicio_id);
alter table public.exercicios_favoritos enable row level security;
revoke all on public.exercicios_favoritos from public, anon, authenticated;
grant select, insert, delete on public.exercicios_favoritos to authenticated;

create policy favoritos_select_proprios on public.exercicios_favoritos for select to authenticated
using (personal_id = (select auth.uid()) and exists (
  select 1 from public.usuarios where id = (select auth.uid()) and tipo = 'PERSONAL' and status_conta = 'ATIVO'
));
create policy favoritos_insert_proprios on public.exercicios_favoritos for insert to authenticated
with check (personal_id = (select auth.uid()) and exists (
  select 1 from public.usuarios where id = (select auth.uid()) and tipo = 'PERSONAL' and status_conta = 'ATIVO'
));
create policy favoritos_delete_proprios on public.exercicios_favoritos for delete to authenticated
using (personal_id = (select auth.uid()) and exists (
  select 1 from public.usuarios where id = (select auth.uid()) and tipo = 'PERSONAL' and status_conta = 'ATIVO'
));
