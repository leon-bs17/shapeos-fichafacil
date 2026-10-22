-- Optional calendar dates: existing workouts and relationships remain unscheduled.
alter table public.treinos add column valida_ate date
  check (valida_ate is null or valida_ate between date '0001-01-01' and date '9999-12-31');
alter table public.personal_alunos add column proxima_avaliacao_em date
  check (proxima_avaliacao_em is null or proxima_avaliacao_em between date '0001-01-01' and date '9999-12-31');

-- Keep the original RPC signatures available for existing clients.
-- Calling the original operation inside a wrapper preserves its atomicity,
-- ownership checks, exercise IDs, prescriptions and execution history.
create function public.criar_ficha_com_validade(p_aluno_id uuid,p_titulo text,p_itens jsonb,p_valida_ate date default null)
returns uuid language plpgsql security invoker set search_path=public as $$
declare v_id uuid;
begin
  v_id=public.criar_ficha_atomica(p_aluno_id,p_titulo,p_itens);
  update public.treinos set valida_ate=p_valida_ate where id=v_id and personal_id=auth.uid();
  return v_id;
end;$$;

create function public.editar_ficha_com_validade(p_ficha_id uuid,p_titulo text,p_itens jsonb,p_valida_ate date,p_alterar_validade boolean default true)
returns void language plpgsql security invoker set search_path=public as $$
begin
  perform public.editar_ficha_atomica(p_ficha_id,p_titulo,p_itens);
  if p_alterar_validade then
    update public.treinos set valida_ate=p_valida_ate where id=p_ficha_id and personal_id=auth.uid();
  end if;
end;$$;

create function public.agendar_avaliacao_shapeos(p_aluno_id uuid,p_data date)
returns void language plpgsql security invoker set search_path=public as $$
begin
  if not exists(select 1 from public.usuarios where id=auth.uid() and tipo='PERSONAL' and status_conta='ATIVO') then
    raise exception 'Personal sem permissão' using errcode='42501';
  end if;
  update public.personal_alunos set proxima_avaliacao_em=p_data
    where personal_id=auth.uid() and aluno_id=p_aluno_id and status='ATIVO';
  if not found then
    raise exception 'Aluno não vinculado ao personal ativo' using errcode='42501';
  end if;
end;$$;

revoke all on function public.criar_ficha_com_validade(uuid,text,jsonb,date) from public,anon;
revoke all on function public.editar_ficha_com_validade(uuid,text,jsonb,date,boolean) from public,anon;
revoke all on function public.agendar_avaliacao_shapeos(uuid,date) from public,anon;
grant execute on function public.criar_ficha_com_validade(uuid,text,jsonb,date) to authenticated;
grant execute on function public.editar_ficha_com_validade(uuid,text,jsonb,date,boolean) to authenticated;
grant execute on function public.agendar_avaliacao_shapeos(uuid,date) to authenticated;
notify pgrst,'reload schema';
