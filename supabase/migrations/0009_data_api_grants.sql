-- Explicit Data API grants for databases created entirely from migrations.
-- PostgreSQL table privileges and RLS are separate layers: grants allow the
-- operation to reach RLS; policies still decide which rows each user may use.

grant usage on schema public to authenticated, service_role;

grant select, update
on table public.usuarios
to authenticated;

grant select, insert, update, delete
on table public.personal_alunos
to authenticated;

grant select, insert, update, delete
on table public.exercicios
to authenticated;

grant select, insert, update, delete
on table public.treinos
to authenticated;

grant select, insert, update, delete
on table public.itens_treino
to authenticated;

grant select, insert, update, delete
on table public.registro_execucao
to authenticated;

grant all privileges
on table
  public.usuarios,
  public.personal_alunos,
  public.exercicios,
  public.treinos,
  public.itens_treino,
  public.registro_execucao
to service_role;
