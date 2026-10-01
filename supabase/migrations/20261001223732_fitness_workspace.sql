-- Original ShapeOS implementation inspired by open-source fitness workflows.
create table public.prescricoes_treino (
 item_treino_id uuid primary key references public.itens_treino(id) on delete cascade,
 carga_alvo numeric(6,2) check(carga_alvo between 0 and 9999),
 duracao_segundos integer check(duracao_segundos between 1 and 7200),
 rpe_alvo numeric(3,1) check(rpe_alvo between 1 and 10),
 superset text check(length(superset)<=20),
 aquecimento integer not null default 0 check(aquecimento between 0 and 10),
 incremento_kg numeric(5,2) not null default 0 check(incremento_kg between 0 and 100),
 observacoes text not null default '' check(length(observacoes)<=1000)
);
create table public.sessoes_treino (
 id uuid primary key,
 aluno_id uuid not null references public.usuarios(id) on delete cascade,
 treino_id uuid references public.treinos(id) on delete set null,
 titulo text not null,
 inicio timestamptz not null,
 fim timestamptz,
 status text not null check(status in ('EM_ANDAMENTO','CONCLUIDO')),
 prescricao jsonb not null,
 series jsonb not null default '[]' check(jsonb_typeof(series)='array'),
 observacoes text not null default '' check(length(observacoes)<=2000),
 atualizado_em timestamptz not null default now(),
 check(fim is null or fim>=inicio)
);
create index sessoes_aluno_inicio on public.sessoes_treino(aluno_id,inicio desc);
create index sessoes_treino_id on public.sessoes_treino(treino_id);
create table public.agenda_treino (
 id uuid primary key default gen_random_uuid(),
 aluno_id uuid not null references public.usuarios(id) on delete cascade,
 treino_id uuid not null references public.treinos(id) on delete cascade,
 data date not null,
 unique(aluno_id,treino_id,data)
);
create index agenda_treino_id on public.agenda_treino(treino_id);
create table public.avaliacoes_fisicas (
 id uuid primary key default gen_random_uuid(),
 aluno_id uuid not null references public.usuarios(id) on delete cascade,
 data date not null,
 peso numeric(5,2) check(peso between 1 and 500),
 cintura numeric(5,2) check(cintura between 1 and 400),
 quadril numeric(5,2) check(quadril between 1 and 400),
 braco numeric(5,2) check(braco between 1 and 200),
 observacoes text not null default '' check(length(observacoes)<=2000),
 foto_path text,
 criado_em timestamptz not null default now()
);
create index avaliacoes_aluno_data on public.avaliacoes_fisicas(aluno_id,data desc);

alter table public.prescricoes_treino enable row level security;
alter table public.sessoes_treino enable row level security;
alter table public.agenda_treino enable row level security;
alter table public.avaliacoes_fisicas enable row level security;
revoke all on public.prescricoes_treino,public.sessoes_treino,public.agenda_treino,public.avaliacoes_fisicas from anon,authenticated;
grant select on public.sessoes_treino to authenticated;
grant select,insert,update,delete on public.prescricoes_treino,public.agenda_treino,public.avaliacoes_fisicas to authenticated;

create policy prescricao_leitura on public.prescricoes_treino for select to authenticated using (
 public.eh_admin() or exists(select 1 from public.itens_treino i join public.treinos t on t.id=i.treino_id where i.id=item_treino_id and (t.aluno_id=(select auth.uid()) or t.personal_id=(select auth.uid())))
);
create policy prescricao_personal on public.prescricoes_treino for all to authenticated using (
 exists(select 1 from public.itens_treino i join public.treinos t on t.id=i.treino_id where i.id=item_treino_id and t.personal_id=(select auth.uid()) and public.eh_personal_do(t.aluno_id))
) with check (
 exists(select 1 from public.itens_treino i join public.treinos t on t.id=i.treino_id where i.id=item_treino_id and t.personal_id=(select auth.uid()) and public.eh_personal_do(t.aluno_id))
);
create policy sessoes_leitura on public.sessoes_treino for select to authenticated using (
 aluno_id=(select auth.uid()) or public.eh_personal_do(aluno_id) or public.eh_admin()
);
create policy agenda_leitura on public.agenda_treino for select to authenticated using (
 aluno_id=(select auth.uid()) or public.eh_personal_do(aluno_id) or public.eh_admin()
);
create policy agenda_edicao on public.agenda_treino for all to authenticated using (
 aluno_id=(select auth.uid()) or public.eh_personal_do(aluno_id)
) with check (
 (aluno_id=(select auth.uid()) or public.eh_personal_do(aluno_id)) and exists(select 1 from public.treinos t where t.id=treino_id and t.aluno_id=agenda_treino.aluno_id and t.ativo)
);
create policy avaliacoes_leitura on public.avaliacoes_fisicas for select to authenticated using (
 aluno_id=(select auth.uid()) or public.eh_personal_do(aluno_id) or public.eh_admin()
);
create policy avaliacoes_edicao on public.avaliacoes_fisicas for all to authenticated using (
 aluno_id=(select auth.uid()) or public.eh_personal_do(aluno_id)
) with check (
 (aluno_id=(select auth.uid()) or public.eh_personal_do(aluno_id)) and (foto_path is null or split_part(foto_path,'/',1)=aluno_id::text)
);

-- A narrowly scoped RPC is necessary: authenticated users cannot directly fabricate
-- prescribed snapshots or overwrite another student's session. All writes are atomic.
create function public.salvar_sessao_shapeos(p_sessao jsonb)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare
 uid uuid:=auth.uid(); sid uuid:=(p_sessao->>'id')::uuid;
 tid uuid:=(p_sessao->>'treino_id')::uuid;
 anterior public.sessoes_treino; snap jsonb; titulo_ficha text; s jsonb;
 inicio_s timestamptz:=(p_sessao->>'inicio')::timestamptz;
 fim_s timestamptz:=nullif(p_sessao->>'fim','')::timestamptz;
 series_s jsonb:=p_sessao->'series'; estado text:=p_sessao->>'status';
begin
 if uid is null or not exists(select 1 from public.usuarios where id=uid and tipo='ALUNO' and status_conta='ATIVO') then raise exception 'Sessão de aluno ativo necessária'; end if;
 if sid is null or inicio_s is null or inicio_s>now()+interval '5 minutes' or estado not in ('EM_ANDAMENTO','CONCLUIDO') or estado is null or (estado='CONCLUIDO' and fim_s is null) or (estado='EM_ANDAMENTO' and fim_s is not null) or fim_s<inicio_s or fim_s>now()+interval '5 minutes' then raise exception 'Datas ou estado inválidos'; end if;
 if jsonb_typeof(series_s) is distinct from 'array' or jsonb_array_length(series_s)>1000 or length(coalesce(p_sessao->>'observacoes',''))>2000 then raise exception 'Séries inválidas'; end if;
 perform pg_advisory_xact_lock(hashtextextended(sid::text,0));
 select * into anterior from public.sessoes_treino where id=sid for update;
 if found then
  if anterior.aluno_id<>uid or anterior.treino_id is distinct from tid or anterior.inicio<>inicio_s then raise exception 'Sessão incompatível'; end if;
  if anterior.status='CONCLUIDO' then
   if anterior.series=series_s and anterior.fim=fim_s and estado='CONCLUIDO' then return sid; end if;
   raise exception 'Sessão já concluída';
  end if;
  if exists(select 1 from jsonb_array_elements(anterior.series) old where not series_s @> jsonb_build_array(old)) then raise exception 'Séries salvas não podem ser removidas ou alteradas'; end if;
  snap:=anterior.prescricao; titulo_ficha:=anterior.titulo;
 else
  select titulo into titulo_ficha from public.treinos where id=tid and aluno_id=uid and ativo;
  if not found then raise exception 'Ficha ativa não encontrada'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',i.id,'exercicio_id',i.exercicio_id,'nome',e.nome,'grupo_muscular',e.grupo_muscular,'video_url',e.video_url,'series',i.series,'repeticoes',i.repeticoes,'descanso_segundos',i.descanso_segundos,'ordem',i.ordem,'config',coalesce(to_jsonb(p),'{}'::jsonb)) order by i.ordem),'[]') into snap
  from public.itens_treino i join public.exercicios e on e.id=i.exercicio_id left join public.prescricoes_treino p on p.item_treino_id=i.id where i.treino_id=tid;
 end if;
 if (select count(*) from jsonb_array_elements(series_s))<>(select count(distinct v->>'id') from jsonb_array_elements(series_s) v) then raise exception 'ID de série duplicado'; end if;
 for s in select value from jsonb_array_elements(series_s) loop
  if s->>'id' is null or s->>'item_id' is null or not exists(select 1 from jsonb_array_elements(snap) i where i->>'id'=s->>'item_id') then raise exception 'Exercício fora da ficha'; end if;
  perform (s->>'id')::uuid;
  if (s->>'carga')::numeric not between 0 and 9999 or (s->>'reps')::integer not between 0 and 10000 or (s->>'segundos')::integer not between 0 and 7200 or (s->>'rpe')::numeric not between 1 and 10 or ((s->>'reps')::integer is null and (s->>'segundos')::integer is null) then raise exception 'Valores de série inválidos'; end if;
  if exists(select 1 from public.registro_execucao r where r.id=(s->>'id')::uuid) and not coalesce(anterior.series,'[]'::jsonb) @> jsonb_build_array(s) then raise exception 'ID de série indisponível'; end if;
  if exists(select 1 from public.sessoes_treino other where other.id<>sid and other.series @> jsonb_build_array(jsonb_build_object('id',s->>'id'))) then raise exception 'Série já pertence a outra sessão'; end if;
  if (s->>'registrado_em')::timestamptz < inicio_s or (s->>'registrado_em')::timestamptz > coalesce(fim_s,now())+interval '5 minutes' then raise exception 'Data de série inválida'; end if;
 end loop;
 insert into public.sessoes_treino(id,aluno_id,treino_id,titulo,inicio,fim,status,prescricao,series,observacoes)
 values(sid,uid,tid,titulo_ficha,inicio_s,fim_s,estado,snap,series_s,coalesce(p_sessao->>'observacoes',''))
 on conflict(id) do update set series=excluded.series,fim=excluded.fim,status=excluded.status,observacoes=excluded.observacoes,atualizado_em=now();
 -- Mirror working rep sets into existing reports/mobile history, without duplicates.
 for s in select value from jsonb_array_elements(series_s) loop
  if coalesce((s->>'aquecimento')::boolean,false)=false and s->>'reps' is not null and exists(select 1 from public.itens_treino where id=(s->>'item_id')::uuid) then
   insert into public.registro_execucao(id,aluno_id,item_treino_id,carga_utilizada,repeticoes_feitas,data_registro)
   values((s->>'id')::uuid,uid,(s->>'item_id')::uuid,(s->>'carga')::numeric,(s->>'reps')::integer,coalesce((s->>'registrado_em')::timestamptz,inicio_s)) on conflict(id) do nothing;
  end if;
 end loop;
 return sid;
end $$;
revoke all on function public.salvar_sessao_shapeos(jsonb) from public,anon;
grant execute on function public.salvar_sessao_shapeos(jsonb) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('evolucao-shapeos','evolucao-shapeos',false,5242880,array['image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
create policy evolucao_upload on storage.objects for insert to authenticated with check(bucket_id='evolucao-shapeos' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy evolucao_leitura on storage.objects for select to authenticated using(bucket_id='evolucao-shapeos' and ((storage.foldername(name))[1]=(select auth.uid())::text or public.eh_admin() or exists(select 1 from public.personal_alunos pa where pa.personal_id=(select auth.uid()) and pa.status='ATIVO' and pa.aluno_id::text=(storage.foldername(name))[1])));
create policy evolucao_remover on storage.objects for delete to authenticated using(bucket_id='evolucao-shapeos' and (storage.foldername(name))[1]=(select auth.uid())::text);
