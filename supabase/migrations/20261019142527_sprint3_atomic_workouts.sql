-- Restore the missing workout RPCs without bypassing existing RLS.
create or replace function public.validar_ficha_shapeos(p_titulo text,p_itens jsonb)
returns void language plpgsql security invoker set search_path=public as $$
begin
 if p_titulo is null or length(trim(p_titulo)) not between 3 and 80 then
  raise exception 'Título inválido' using errcode='22023';
 end if;
 if p_itens is null or jsonb_typeof(p_itens)<>'array' then
  raise exception 'Itens inválidos' using errcode='22023';
 end if;
 if jsonb_array_length(p_itens) not between 1 and 50 then
  raise exception 'A ficha deve conter entre 1 e 50 exercícios' using errcode='22023';
 end if;
 if exists(select 1 from jsonb_to_recordset(p_itens) as i(exercicio_id uuid,series integer,repeticoes text,descanso_segundos integer,ordem integer)
  where i.exercicio_id is null or i.series is null or i.series not between 1 and 30 or i.repeticoes is null or length(trim(i.repeticoes)) not between 1 and 20
   or i.descanso_segundos is null or i.descanso_segundos not between 0 and 900 or i.ordem is null or i.ordem not between 0 and 1000)
 then raise exception 'Revise os valores dos exercícios' using errcode='22023';end if;
 if (select count(distinct i->>'ordem') from jsonb_array_elements(p_itens) i)<>jsonb_array_length(p_itens) then
  raise exception 'Posições repetidas na ficha' using errcode='22023';
 end if;
end;$$;

create or replace function public.criar_ficha_atomica(p_aluno_id uuid,p_titulo text,p_itens jsonb)
returns uuid language plpgsql security invoker set search_path=public as $$
declare v_id uuid;
begin
 if not exists(select 1 from public.usuarios where id=auth.uid() and tipo='PERSONAL' and status_conta='ATIVO')
  or not exists(select 1 from public.personal_alunos where personal_id=auth.uid() and aluno_id=p_aluno_id and status='ATIVO')
  or not exists(select 1 from public.usuarios where id=p_aluno_id and tipo='ALUNO' and status_conta='ATIVO')
 then raise exception 'Aluno não vinculado ao personal ativo' using errcode='42501';end if;
 perform public.validar_ficha_shapeos(p_titulo,p_itens);
 insert into public.treinos(aluno_id,personal_id,titulo) values(p_aluno_id,auth.uid(),trim(p_titulo)) returning id into v_id;
 insert into public.itens_treino(treino_id,exercicio_id,series,repeticoes,descanso_segundos,ordem)
 select v_id,i.exercicio_id,i.series,trim(i.repeticoes),i.descanso_segundos,i.ordem
 from jsonb_to_recordset(p_itens) as i(exercicio_id uuid,series integer,repeticoes text,descanso_segundos integer,ordem integer);
 return v_id;
end;$$;

create or replace function public.editar_ficha_atomica(p_ficha_id uuid,p_titulo text,p_itens jsonb)
returns void language plpgsql security invoker set search_path=public as $$
declare v_aluno uuid;v_originais jsonb;v_item jsonb;v_item_id uuid;v_usados uuid[]='{}';v_offset integer;
begin
 if not exists(select 1 from public.usuarios where id=auth.uid() and tipo='PERSONAL' and status_conta='ATIVO') then
  raise exception 'Personal sem permissão' using errcode='42501';end if;
 select aluno_id into v_aluno from public.treinos where id=p_ficha_id and personal_id=auth.uid() for update;
 if not found or not exists(select 1 from public.personal_alunos where personal_id=auth.uid() and aluno_id=v_aluno and status='ATIVO') then
  raise exception 'Ficha não encontrada ou vínculo inativo' using errcode='42501';end if;
 perform public.validar_ficha_shapeos(p_titulo,p_itens);
 select coalesce(jsonb_agg(jsonb_build_object('id',id,'exercicio_id',exercicio_id,'ordem',ordem) order by ordem),'[]'),greatest(coalesce(max(ordem),0)+1,1001)
 into v_originais,v_offset from public.itens_treino where treino_id=p_ficha_id;
 -- Keep IDs, prescriptions and execution history for exercises that remain.
 update public.itens_treino set ordem=ordem+v_offset where treino_id=p_ficha_id;
 for v_item in select value from jsonb_array_elements(p_itens) loop
  select (i->>'id')::uuid into v_item_id from jsonb_array_elements(v_originais) i
   where i->>'exercicio_id'=v_item->>'exercicio_id' and not ((i->>'id')::uuid=any(v_usados)) order by (i->>'ordem')::integer limit 1;
  if v_item_id is null then
   insert into public.itens_treino(treino_id,exercicio_id,series,repeticoes,descanso_segundos,ordem)
   values(p_ficha_id,(v_item->>'exercicio_id')::uuid,(v_item->>'series')::integer,trim(v_item->>'repeticoes'),(v_item->>'descanso_segundos')::integer,(v_item->>'ordem')::integer)
   returning id into v_item_id;
  else
   update public.itens_treino set series=(v_item->>'series')::integer,repeticoes=trim(v_item->>'repeticoes'),descanso_segundos=(v_item->>'descanso_segundos')::integer,ordem=(v_item->>'ordem')::integer
    where id=v_item_id and treino_id=p_ficha_id;
  end if;
  v_usados=array_append(v_usados,v_item_id);
 end loop;
 delete from public.itens_treino where treino_id=p_ficha_id and not (id=any(v_usados));
 update public.treinos set titulo=trim(p_titulo) where id=p_ficha_id and personal_id=auth.uid();
end;$$;

create or replace function public.duplicar_ficha_atomica(p_ficha_id uuid)
returns uuid language plpgsql security invoker set search_path=public as $$
declare v_origem public.treinos%rowtype;v_itens jsonb;v_nova uuid;
begin
 select * into v_origem from public.treinos where id=p_ficha_id and personal_id=auth.uid() for update;
 if not found then raise exception 'Ficha não encontrada ou sem permissão' using errcode='42501';end if;
 select jsonb_agg(jsonb_build_object('exercicio_id',exercicio_id,'series',series,'repeticoes',repeticoes,'descanso_segundos',descanso_segundos,'ordem',ordem) order by ordem)
 into v_itens from public.itens_treino where treino_id=p_ficha_id;
 v_nova=public.criar_ficha_atomica(v_origem.aluno_id,left(v_origem.titulo,72)||' (cópia)',v_itens);
 update public.treinos set ativo=false where id=v_nova;
 insert into public.prescricoes_treino(item_treino_id,carga_alvo,duracao_segundos,rpe_alvo,superset,aquecimento,incremento_kg,observacoes)
 select novo.id,p.carga_alvo,p.duracao_segundos,p.rpe_alvo,p.superset,p.aquecimento,p.incremento_kg,p.observacoes
 from public.itens_treino antigo join public.prescricoes_treino p on p.item_treino_id=antigo.id
 join public.itens_treino novo on novo.treino_id=v_nova and novo.ordem=antigo.ordem
 where antigo.treino_id=p_ficha_id;
 return v_nova;
end;$$;

revoke all on function public.validar_ficha_shapeos(text,jsonb) from public,anon;
revoke all on function public.criar_ficha_atomica(uuid,text,jsonb) from public,anon;
revoke all on function public.editar_ficha_atomica(uuid,text,jsonb) from public,anon;
revoke all on function public.duplicar_ficha_atomica(uuid) from public,anon;
grant execute on function public.validar_ficha_shapeos(text,jsonb) to authenticated;
grant execute on function public.criar_ficha_atomica(uuid,text,jsonb) to authenticated;
grant execute on function public.editar_ficha_atomica(uuid,text,jsonb) to authenticated;
grant execute on function public.duplicar_ficha_atomica(uuid) to authenticated;
notify pgrst,'reload schema';
