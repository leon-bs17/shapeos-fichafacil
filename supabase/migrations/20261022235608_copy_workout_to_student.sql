-- A new RPC keeps existing same-student clients compatible.
create function public.duplicar_ficha_para_aluno(p_ficha_id uuid,p_aluno_id uuid,p_titulo text default null)
returns uuid language plpgsql security invoker set search_path=public as $$
declare v_origem public.treinos%rowtype;v_itens jsonb;v_nova uuid;
begin
  select * into v_origem from public.treinos
    where id=p_ficha_id and personal_id=auth.uid() for update;
  if not found then
    raise exception 'Ficha não encontrada ou sem permissão' using errcode='42501';
  end if;
  select jsonb_agg(jsonb_build_object('exercicio_id',exercicio_id,'series',series,'repeticoes',repeticoes,'descanso_segundos',descanso_segundos,'ordem',ordem) order by ordem)
    into v_itens from public.itens_treino where treino_id=p_ficha_id;
  -- The original creator checks active Personal, active target account and link.
  -- New IDs isolate the target's future prescriptions and execution history.
  v_nova=public.criar_ficha_atomica(p_aluno_id,coalesce(p_titulo,left(v_origem.titulo,72)||' (cópia)'),v_itens);
  update public.treinos set ativo=false,valida_ate=null where id=v_nova and personal_id=auth.uid();
  insert into public.prescricoes_treino(item_treino_id,carga_alvo,duracao_segundos,rpe_alvo,superset,aquecimento,incremento_kg,observacoes)
  select novo.id,p.carga_alvo,p.duracao_segundos,p.rpe_alvo,p.superset,p.aquecimento,p.incremento_kg,p.observacoes
  from public.itens_treino antigo
  join public.prescricoes_treino p on p.item_treino_id=antigo.id
  join public.itens_treino novo on novo.treino_id=v_nova and novo.ordem=antigo.ordem
  where antigo.treino_id=p_ficha_id;
  return v_nova;
end;$$;
revoke all on function public.duplicar_ficha_para_aluno(uuid,uuid,text) from public,anon;
grant execute on function public.duplicar_ficha_para_aluno(uuid,uuid,text) to authenticated;
notify pgrst,'reload schema';
