alter table public.usuarios enable row level security;

alter table public.personal_alunos enable row level security;

alter table public.exercicios enable row level security;

alter table public.treinos enable row level security;

alter table public.itens_treino enable row level security;

alter table public.registro_execucao enable row level security;

create or replace function public.auth_tipo_usuario()
returns public.tipo_usuario
language sql
stable
security definer
set search_path = public
as $$
  select tipo from public.usuarios where id = auth.uid();
$$;

create or replace function public.eh_personal_do(aluno uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.personal_alunos pa
    where pa.aluno_id = eh_personal_do.aluno
      and pa.personal_id = auth.uid()
      and pa.status = 'ATIVO'
  );
$$;

create or replace function public.tipo_de(usuario uuid)
returns public.tipo_usuario
language sql
stable
security definer
set search_path = public
as $$
  select tipo from public.usuarios where id = usuario;
$$;

create or replace function public.eh_personal_autenticado()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select tipo from public.usuarios where id = auth.uid()) = 'PERSONAL',
    false
  );
$$;

create policy "usuarios_select_proprio"
on public.usuarios for select
to authenticated
using (id = auth.uid());

create policy "usuarios_select_vinculados_do_personal"
on public.usuarios for select
to authenticated
using (public.eh_personal_do(id));

create policy "usuarios_update_proprio"
on public.usuarios for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy "vinculos_select_participantes"
on public.personal_alunos for select
to authenticated
using (personal_id = auth.uid() or aluno_id = auth.uid());

create policy "vinculos_insert_personal"
on public.personal_alunos for insert
to authenticated
with check (
  personal_id = auth.uid()
  and public.auth_tipo_usuario() = 'PERSONAL'
  and public.tipo_de(aluno_id) = 'ALUNO'
);

create policy "vinculos_update_personal"
on public.personal_alunos for update
to authenticated
using (personal_id = auth.uid())
with check (personal_id = auth.uid());

create policy "vinculos_delete_personal"
on public.personal_alunos for delete
to authenticated
using (personal_id = auth.uid());

create policy "exercicios_select_autenticados"
on public.exercicios for select
to authenticated
using (true);

create policy "exercicios_insert_personal"
on public.exercicios for insert
to authenticated
with check (
  criado_por = auth.uid()
  and public.auth_tipo_usuario() = 'PERSONAL'
);

create policy "exercicios_update_criador"
on public.exercicios for update
to authenticated
using (criado_por = auth.uid())
with check (criado_por = auth.uid());

create policy "treinos_select_envolvidos"
on public.treinos for select
to authenticated
using (aluno_id = auth.uid() or personal_id = auth.uid());

create policy "treinos_insert_personal"
on public.treinos for insert
to authenticated
with check (
  personal_id = auth.uid()
  and public.auth_tipo_usuario() = 'PERSONAL'
  and public.eh_personal_do(aluno_id)
);

create policy "treinos_update_personal_dono"
on public.treinos for update
to authenticated
using (personal_id = auth.uid())
with check (personal_id = auth.uid());

create policy "treinos_delete_personal_dono"
on public.treinos for delete
to authenticated
using (personal_id = auth.uid());

create policy "itens_select_envolvidos_no_treino"
on public.itens_treino for select
to authenticated
using (
  exists (
    select 1 from public.treinos t
    where t.id = itens_treino.treino_id
      and (t.aluno_id = auth.uid() or t.personal_id = auth.uid())
  )
);

create policy "itens_insert_personal_dono_treino"
on public.itens_treino for insert
to authenticated
with check (
  exists (
    select 1 from public.treinos t
    where t.id = itens_treino.treino_id
      and t.personal_id = auth.uid()
  )
);

create policy "itens_update_personal_dono_treino"
on public.itens_treino for update
to authenticated
using (
  exists (
    select 1 from public.treinos t
    where t.id = itens_treino.treino_id
      and t.personal_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.treinos t
    where t.id = itens_treino.treino_id
      and t.personal_id = auth.uid()
  )
);

create policy "itens_delete_personal_dono_treino"
on public.itens_treino for delete
to authenticated
using (
  exists (
    select 1 from public.treinos t
    where t.id = itens_treino.treino_id
      and t.personal_id = auth.uid()
  )
);

create policy "registros_select_aluno_ou_personal"
on public.registro_execucao for select
to authenticated
using (
  aluno_id = auth.uid()
  or exists (
    select 1
    from public.itens_treino i
    join public.treinos t on t.id = i.treino_id
    where i.id = registro_execucao.item_treino_id
      and t.personal_id = auth.uid()
  )
);

create policy "registros_insert_proprio_aluno"
on public.registro_execucao for insert
to authenticated
with check (
  aluno_id = auth.uid()
  and exists (
    select 1
    from public.itens_treino i
    join public.treinos t on t.id = i.treino_id
    where i.id = registro_execucao.item_treino_id
      and t.aluno_id = auth.uid()
  )
);

create policy "registros_update_proprio_aluno"
on public.registro_execucao for update
to authenticated
using (aluno_id = auth.uid())
with check (aluno_id = auth.uid());

create policy "registros_delete_proprio_aluno"
on public.registro_execucao for delete
to authenticated
using (aluno_id = auth.uid());
