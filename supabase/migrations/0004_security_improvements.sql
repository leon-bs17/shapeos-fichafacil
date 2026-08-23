-- W2: Proteger tabela exercicios melhorias
-- 1. UPDATE agora exige que seja PERSONAL
-- 2. DELETE restrito ao criador que seja PERSONAL

-- Drop the existing update policy
drop policy if exists "exercicios_update_criador" on public.exercicios;

-- Re-create with PERSONAL check
create policy "exercicios_update_criador"
on public.exercicios for update
to authenticated
using (
  criado_por = auth.uid()
  and public.auth_tipo_usuario() = 'PERSONAL'
)
with check (
  criado_por = auth.uid()
  and public.auth_tipo_usuario() = 'PERSONAL'
);

-- Add DELETE policy (only creator PERSONAL can delete)
drop policy if exists "exercicios_delete_criador" on public.exercicios;

create policy "exercicios_delete_criador"
on public.exercicios for delete
to authenticated
using (
  criado_por = auth.uid()
  and public.auth_tipo_usuario() = 'PERSONAL'
);
