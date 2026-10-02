# Mys — primeira etapa

A assistente está em `/mys` para personal e `/admin/mys` para admin, com navegação nos dois painéis. Alunos e contas inativas não têm acesso. A rota `POST /api/mys` valida a sessão com `auth.getUser()` e consulta o perfil atual no banco; o cliente não escolhe suas permissões.

## Configuração na Vercel

- `DEEPSEEK_API_KEY`: chave privada da DeepSeek, somente no servidor. Configure em Production e faça um novo deploy. Nunca use `NEXT_PUBLIC_`.
- `DEEPSEEK_MODEL`: opcional; padrão `deepseek-flash`, conforme a documentação oficial consultada em 2 de outubro de 2026. O endpoint utilizado é `https://api.deepseek.com/chat/completions`.

Sem a chave, a interface permite preparar perguntas e mostra que a conexão está pendente. Não fabrica respostas. Com a chave, envia a conversa para a DeepSeek, sem ferramentas de consulta ou alteração do banco. O funcionamento real depende da validade da chave, do saldo e da disponibilidade do provedor.

## Escopo e histórico

- Admin: academia, gestão, conceitos de treino e resumos das informações fornecidas na conversa.
- Personal: treino, acompanhamento e orientação com base nas informações que ele fornecer.
- Nenhuma consulta automática de alunos, fichas, avaliações ou métricas nesta etapa.
- As mensagens ficam apenas na memória da página. Sair, atualizar ou começar nova conversa limpa esse histórico local. O tratamento das mensagens enviadas ao provedor segue as políticas da DeepSeek.
- A conversa enviada contém até nove trocas anteriores e a pergunta atual; há limites de caracteres, corpo da requisição, tempo e tokens de resposta.
- Existe proteção contra rajadas por usuário e instância (8 chamadas/minuto). Não é uma cota distribuída de custos. Uma cota compartilhada deve acompanhar a expansão futura da integração.
- O conteúdo retornado é renderizado como texto e formatação limitada, nunca como HTML bruto.

## Validação

Execute `node tests/mys-api.cjs` na raiz. Os testes usam um provedor simulado e cobrem autorização por perfil, origem, mensagens inválidas, tamanhos, chave ausente, falhas do provedor, rate limit e escopo obtido do servidor. Eles não atestam uma chamada paga real à DeepSeek.

Faça também o build de `apps/web`. A consulta dos dados reais e as alterações confirmadas em fichas são etapas posteriores.
