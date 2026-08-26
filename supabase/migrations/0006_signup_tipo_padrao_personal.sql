-- Correcao do tipo de usuario no signup
--
-- Caminhos de criacao de conta:
--   1. /cadastro (email+senha)      -> envia tipo 'PERSONAL' explicito
--   2. Convite de aluno (edge fn)   -> envia tipo 'ALUNO' explicito
--   3. Google OAuth                 -> NAO suporta metadados customizados
--                                      (botao visivel apenas para personais)
--
-- Logo: metadata ausente so acontece no fluxo Google, que e exclusivo
-- de personal trainers. Padrao seguro = PERSONAL.

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
      'PERSONAL'
    )
  );
  return new;
end;
$$;
