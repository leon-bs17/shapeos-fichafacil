create type public.tipo_usuario as enum ('PERSONAL', 'ALUNO');

create type public.status_vinculo as enum ('ATIVO', 'INATIVO');

create table public.usuarios (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null,
  email text not null unique,
  tipo public.tipo_usuario not null default 'ALUNO',
  criado_em timestamptz not null default now()
);

create table public.personal_alunos (
  id uuid primary key default gen_random_uuid(),
  personal_id uuid not null references public.usuarios (id) on delete cascade,
  aluno_id uuid not null references public.usuarios (id) on delete cascade,
  status public.status_vinculo not null default 'ATIVO',
  criado_em timestamptz not null default now(),
  constraint personal_aluno_unico unique (personal_id, aluno_id),
  constraint nao_auto_vinculo check (personal_id <> aluno_id)
);

create index idx_personal_alunos_personal on public.personal_alunos (personal_id);

create index idx_personal_alunos_aluno on public.personal_alunos (aluno_id);

create table public.exercicios (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  grupo_muscular text not null,
  video_url text,
  equipamento text,
  criado_por uuid references public.usuarios (id) on delete set null,
  constraint exercicio_unico unique (nome, grupo_muscular)
);

create index idx_exercicios_grupo on public.exercicios (grupo_muscular);

create table public.treinos (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references public.usuarios (id) on delete cascade,
  personal_id uuid not null references public.usuarios (id) on delete cascade,
  titulo text not null,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

create index idx_treinos_aluno_ativo on public.treinos (aluno_id) where ativo;

create index idx_treinos_personal on public.treinos (personal_id);

create table public.itens_treino (
  id uuid primary key default gen_random_uuid(),
  treino_id uuid not null references public.treinos (id) on delete cascade,
  exercicio_id uuid not null references public.exercicios (id) on delete restrict,
  series integer not null check (series > 0 and series <= 30),
  repeticoes text not null,
  descanso_segundos integer not null default 60 check (descanso_segundos >= 0),
  ordem integer not null check (ordem >= 0),
  constraint item_ordem_unico unique (treino_id, ordem)
);

create index idx_itens_treino_treino on public.itens_treino (treino_id, ordem);

create table public.registro_execucao (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references public.usuarios (id) on delete cascade,
  item_treino_id uuid not null references public.itens_treino (id) on delete cascade,
  carga_utilizada numeric(6, 2),
  repeticoes_feitas integer,
  data_registro timestamptz not null default now()
);

create index idx_registros_aluno_data on public.registro_execucao (aluno_id, data_registro desc);

create index idx_registros_item_data on public.registro_execucao (item_treino_id, data_registro desc);

create or replace function public.criar_usuario_autenticado()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.usuarios (id, nome, email, tipo)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nome', split_part(new.email, '@', 1)),
    new.email,
    coalesce(
      case
        when new.raw_user_meta_data ->> 'tipo' in ('PERSONAL', 'ALUNO')
          then (new.raw_user_meta_data ->> 'tipo')::public.tipo_usuario
      end,
      'ALUNO'
    )
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.criar_usuario_autenticado();
