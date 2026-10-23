create table public.modelos_treino (
  id uuid primary key default gen_random_uuid(),
  personal_id uuid not null references public.usuarios(id) on delete cascade,
  titulo text not null check (length(trim(titulo)) between 3 and 80),
  itens jsonb not null check (case when jsonb_typeof(itens)='array' then jsonb_array_length(itens) between 1 and 50 else false end),
  quantidade_exercicios integer generated always as (case when jsonb_typeof(itens)='array' then jsonb_array_length(itens) else 0 end) stored,
  criado_em timestamptz not null default now()
);
create index modelos_treino_personal_criado_idx on public.modelos_treino(personal_id,criado_em desc,id desc);
alter table public.modelos_treino enable row level security;
create policy modelos_leitura on public.modelos_treino for select to authenticated
  using (personal_id=(select auth.uid()) and exists(select 1 from public.usuarios where id=(select auth.uid()) and tipo='PERSONAL' and status_conta='ATIVO'));
create policy modelos_criacao on public.modelos_treino for insert to authenticated
  with check (personal_id=(select auth.uid()) and exists(select 1 from public.usuarios where id=(select auth.uid()) and tipo='PERSONAL' and status_conta='ATIVO'));
create policy modelos_exclusao on public.modelos_treino for delete to authenticated
  using (personal_id=(select auth.uid()) and exists(select 1 from public.usuarios where id=(select auth.uid()) and tipo='PERSONAL' and status_conta='ATIVO'));
revoke all on public.modelos_treino from public,anon,authenticated;
grant select,insert,delete on public.modelos_treino to authenticated;

create function public.salvar_modelo_de_ficha(p_ficha_id uuid,p_titulo text)
returns uuid language plpgsql security invoker set search_path=public as $$
declare v_itens jsonb;v_id uuid;
begin
  perform id from public.treinos where id=p_ficha_id and personal_id=auth.uid() for update;
  if not found then raise exception 'Ficha não encontrada ou sem permissão' using errcode='42501';end if;
  select jsonb_agg(jsonb_build_object(
    'exercicio_id',i.exercicio_id,'series',i.series,'repeticoes',i.repeticoes,'descanso_segundos',i.descanso_segundos,'ordem',i.ordem,
    'prescricao',jsonb_build_object('carga_alvo',p.carga_alvo,'duracao_segundos',p.duracao_segundos,'rpe_alvo',p.rpe_alvo,'superset',p.superset,
      'aquecimento',coalesce(p.aquecimento,0),'incremento_kg',coalesce(p.incremento_kg,0),'observacoes',coalesce(p.observacoes,''))) order by i.ordem)
  into v_itens from public.itens_treino i left join public.prescricoes_treino p on p.item_treino_id=i.id where i.treino_id=p_ficha_id;
  perform public.validar_ficha_shapeos(p_titulo,v_itens);
  insert into public.modelos_treino(personal_id,titulo,itens) values(auth.uid(),trim(p_titulo),v_itens) returning id into v_id;
  return v_id;
end;$$;

create function public.aplicar_modelo_treino(p_modelo_id uuid,p_aluno_id uuid,p_titulo text default null)
returns uuid language plpgsql security invoker set search_path=public as $$
declare v_modelo public.modelos_treino%rowtype;v_nova uuid;
begin
  select * into v_modelo from public.modelos_treino where id=p_modelo_id and personal_id=auth.uid();
  if not found then raise exception 'Modelo não encontrado ou sem permissão' using errcode='42501';end if;
  v_nova=public.criar_ficha_atomica(p_aluno_id,coalesce(p_titulo,v_modelo.titulo),v_modelo.itens);
  update public.treinos set ativo=false,valida_ate=null where id=v_nova and personal_id=auth.uid();
  insert into public.prescricoes_treino(item_treino_id,carga_alvo,duracao_segundos,rpe_alvo,superset,aquecimento,incremento_kg,observacoes)
  select novo.id,(item->'prescricao'->>'carga_alvo')::numeric,(item->'prescricao'->>'duracao_segundos')::integer,
    (item->'prescricao'->>'rpe_alvo')::numeric,item->'prescricao'->>'superset',
    coalesce((item->'prescricao'->>'aquecimento')::integer,0),coalesce((item->'prescricao'->>'incremento_kg')::numeric,0),coalesce(item->'prescricao'->>'observacoes','')
  from jsonb_array_elements(v_modelo.itens) item join public.itens_treino novo on novo.treino_id=v_nova and novo.ordem=(item->>'ordem')::integer;
  return v_nova;
end;$$;
revoke all on function public.salvar_modelo_de_ficha(uuid,text) from public,anon;
revoke all on function public.aplicar_modelo_treino(uuid,uuid,text) from public,anon;
grant execute on function public.salvar_modelo_de_ficha(uuid,text) to authenticated;
grant execute on function public.aplicar_modelo_treino(uuid,uuid,text) to authenticated;
notify pgrst,'reload schema';
