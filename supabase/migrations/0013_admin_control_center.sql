-- Central administrativa: cada alteração e sua auditoria são uma transação.
begin;
alter table public.admin_auditoria drop constraint if exists admin_auditoria_acao_check;
alter table public.admin_auditoria add constraint admin_auditoria_acao_check check(acao in ('APROVAR_USUARIO','BLOQUEAR_USUARIO','REATIVAR_USUARIO','ALTERAR_TIPO','EDITAR_USUARIO','VINCULAR','DESATIVAR_VINCULO','EDITAR_TREINO','CONFIGURAR'));
create or replace function public.eh_admin() returns boolean language sql stable security definer set search_path=public,pg_temp as $$ select exists(select 1 from usuarios where id=auth.uid() and tipo='ADMIN' and status_conta='ATIVO') $$;
-- Only the audited RPC may change global access; own-profile changes remain protected by the trigger.
drop policy if exists admin_update_all_usuarios on public.usuarios;
create or replace function public.proteger_campos_sensiveis_usuario() returns trigger language plpgsql security invoker set search_path=public,pg_temp as $$
begin
 if (new.id is distinct from old.id or new.email is distinct from old.email or new.tipo is distinct from old.tipo or new.status_conta is distinct from old.status_conta or new.criado_em is distinct from old.criado_em) and current_user not in ('postgres','service_role') then raise exception 'Use o controle administrativo auditado para alterar o acesso'; end if;
 return new;
end $$;
create table public.admin_configuracao (
 id boolean primary key default true check(id),
 cadastro_aberto boolean not null default true,
 mensagem_publica text not null default '' check(length(mensagem_publica)<=500),
 atualizado_em timestamptz not null default now()
);
insert into public.admin_configuracao(id) values(true);
alter table public.admin_configuracao enable row level security;
create policy admin_config_select on public.admin_configuracao for select to authenticated using(public.eh_admin());
grant select on public.admin_configuracao to authenticated;
create or replace function public.admin_control(p_acao text,p_id uuid default null,p_dados jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_actor uuid:=auth.uid(); v_before jsonb; v_after jsonb; v_user public.usuarios; v_other uuid; v_status text; v_tipo text;
begin
 -- Serialize privileged changes, including concurrent removal of administrators.
 perform pg_advisory_xact_lock(139724782);
 if not exists(select 1 from usuarios where id=v_actor and tipo='ADMIN' and status_conta='ATIVO') then
 raise exception 'Administrador ativo obrigatório' using errcode='42501'; end if;
 if p_acao='CONFIGURAR' then
 select to_jsonb(c) into v_before from admin_configuracao c where id=true;
 update admin_configuracao set cadastro_aberto=(p_dados->>'cadastro_aberto')::boolean,
 mensagem_publica=trim(coalesce(p_dados->>'mensagem_publica','')),atualizado_em=now() where id=true returning to_jsonb(admin_configuracao.*) into v_after;
 elsif p_acao='EDITAR_USUARIO' then
 select * into v_user from usuarios where id=p_id for update;
 if not found then raise exception 'Usuário não encontrado'; end if;
 v_before:=to_jsonb(v_user); v_status:=coalesce(p_dados->>'status_conta',v_user.status_conta); v_tipo:=coalesce(p_dados->>'tipo',v_user.tipo::text);
 if v_status not in ('ATIVO','PENDENTE','BLOQUEADO') or v_tipo not in ('ADMIN','PERSONAL','ALUNO') then raise exception 'Perfil ou status inválido'; end if;
 if p_id=v_actor and (v_status<>'ATIVO' or v_tipo<>'ADMIN') then raise exception 'Você não pode remover seu próprio acesso'; end if;
 if v_user.tipo='ADMIN' and (v_tipo<>'ADMIN' or v_status<>'ATIVO') and not exists(select 1 from usuarios where tipo='ADMIN' and status_conta='ATIVO' and id<>p_id) then raise exception 'Mantenha ao menos um administrador ativo'; end if;
 if v_tipo<>v_user.tipo::text and (exists(select 1 from personal_alunos where personal_id=p_id or aluno_id=p_id) or exists(select 1 from treinos where personal_id=p_id or aluno_id=p_id)) then raise exception 'Remova ou transfira os vínculos e treinos antes de alterar o perfil'; end if;
 if length(trim(coalesce(p_dados->>'nome',v_user.nome))) not between 2 and 120 then raise exception 'Nome deve ter entre 2 e 120 caracteres'; end if;
 update usuarios set nome=trim(coalesce(p_dados->>'nome',nome)),status_conta=v_status,tipo=v_tipo::tipo_usuario where id=p_id returning to_jsonb(usuarios.*) into v_after;
 elsif p_acao='VINCULAR' then
 v_other:=(p_dados->>'personal_id')::uuid;
 if not exists(select 1 from usuarios where id=p_id and tipo='ALUNO' and status_conta='ATIVO') or not exists(select 1 from usuarios where id=v_other and tipo='PERSONAL' and status_conta='ATIVO') then raise exception 'Selecione aluno e personal ativos'; end if;
 select to_jsonb(v) into v_before from personal_alunos v where aluno_id=p_id and personal_id=v_other;
 insert into personal_alunos(aluno_id,personal_id,status) values(p_id,v_other,'ATIVO') on conflict(personal_id,aluno_id) do update set status='ATIVO' returning to_jsonb(personal_alunos.*) into v_after;
 elsif p_acao='DESATIVAR_VINCULO' then
 select to_jsonb(v) into v_before from personal_alunos v where id=p_id;
 update personal_alunos set status='INATIVO' where id=p_id returning to_jsonb(personal_alunos.*) into v_after;
 elsif p_acao='EDITAR_TREINO' then
 select to_jsonb(t) into v_before from treinos t where id=p_id for update;
 if v_before is null then raise exception 'Treino não encontrado'; end if;
 v_other:=coalesce((p_dados->>'personal_id')::uuid,(v_before->>'personal_id')::uuid);
 if not exists(select 1 from usuarios where id=v_other and tipo='PERSONAL' and status_conta='ATIVO') or not exists(select 1 from personal_alunos where personal_id=v_other and aluno_id=(v_before->>'aluno_id')::uuid and status='ATIVO') then raise exception 'O personal deve ter vínculo ativo com o aluno'; end if;
 if length(trim(coalesce(p_dados->>'titulo',v_before->>'titulo'))) not between 2 and 150 then raise exception 'Título inválido'; end if;
 update treinos set titulo=trim(coalesce(p_dados->>'titulo',titulo)),ativo=coalesce((p_dados->>'ativo')::boolean,ativo),personal_id=v_other where id=p_id returning to_jsonb(treinos.*) into v_after;
 else raise exception 'Ação não permitida'; end if;
 if v_after is null then raise exception 'Registro não encontrado'; end if;
 insert into admin_auditoria(admin_id,usuario_id,acao,detalhes) values(v_actor,case when p_acao='EDITAR_USUARIO' then p_id else null end,p_acao,jsonb_build_object('registro_id',p_id,'antes',v_before,'depois',v_after));
 return v_after;
end $$;
revoke all on function public.admin_control(text,uuid,jsonb) from public,anon;
grant execute on function public.admin_control(text,uuid,jsonb) to authenticated;
create or replace function public.cadastro_shapeos_aberto() returns boolean language sql stable security definer set search_path=public,pg_temp as $$ select cadastro_aberto from admin_configuracao where id=true $$;
revoke all on function public.cadastro_shapeos_aberto() from public;
grant execute on function public.cadastro_shapeos_aberto() to anon,authenticated;
create or replace function public.verificar_cadastro_shapeos() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if not coalesce(public.cadastro_shapeos_aberto(),false) then raise exception 'Novos cadastros estão temporariamente fechados'; end if;
 return new;
end $$;
revoke all on function public.verificar_cadastro_shapeos() from public,anon,authenticated;
create trigger verificar_cadastro_shapeos before insert on auth.users for each row execute function public.verificar_cadastro_shapeos();
-- Entrega efetiva dos comunicados para seus destinatários.
create policy destinatario_le_notificacao on public.admin_notificacoes for select to authenticated using (
 ativa and (expira_em is null or expira_em>now()) and exists(select 1 from usuarios where id=auth.uid() and status_conta='ATIVO' and (publico='TODOS' or publico=tipo::text))
);
commit;
