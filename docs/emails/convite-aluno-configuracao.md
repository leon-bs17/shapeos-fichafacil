# Convite de aluno em produção

Projeto Supabase: `xzxdcjvfapzkpjqnyzzj` (ShapeOS).

1. Em Authentication > URL Configuration, preservar as URLs existentes e permitir também `https://shapeos-fichafacil.vercel.app/aceitar-convite`.
2. Em Authentication > Emails > Invite user, usar o assunto `ShapeOS · Convite para sua conta de aluno` e o HTML de `docs/emails/convite-aluno.html`.
3. Salvar e reler o assunto, o HTML e a URL permitida para confirmar a publicação. Não alterar Magic Link, recuperação de senha, SMTP ou credenciais.

O botão do e-mail mantém `{{ .ConfirmationURL }}`. O Supabase valida o token de convite e encaminha para `/aceitar-convite`, destino definido pela função `convite-aluno`. A página aceita os formatos de credenciais suportados (fragmento de sessão do convite, código PKCE ou token hash de tipo `invite`), confirma o perfil de aluno ativo e permite definir a primeira senha. A URL é limpa antes de criar o cliente de autenticação; nenhuma credencial é registrada em logs.

Depois de salvar a senha, o aluno deve aceitar ou recusar o convite de vínculo. A ação `responder_convite_aluno` confere a conta autenticada, o destinatário, o estado e a expiração, e só cria o vínculo ativo após o aceite. O aluno também pode responder em `/painel`. Convites de vínculo expiram em 24 horas, independentemente do prazo do link de autenticação. Esse segundo prazo deve ser conferido na configuração de Auth. Não criar `personal_alunos` diretamente pelo navegador. Links inválidos ou expirados oferecem a recuperação de acesso. Abrir a página sem credenciais de convite não permite iniciar a definição de senha.

Editar este HTML no Git ou configurar `auth.email.template.invite` só atualiza o modelo local. A configuração de email do projeto hospedado precisa ser publicada separadamente no painel ou na Management API com uma conexão autorizada.
