# Mys — assistente com consultas ao banco

A assistente está em `/mys` para personal e `/admin/mys` para admin, com navegação nos dois painéis. Alunos e contas inativas não têm acesso. A rota `POST /api/mys` valida a sessão com `auth.getUser()` e consulta o perfil atual no banco; o cliente não escolhe suas permissões.

## Configuração na Vercel

- `DEEPSEEK_API_KEY`: chave privada da DeepSeek, somente no servidor. Configure em Production e faça um novo deploy. Nunca use `NEXT_PUBLIC_`.
- `DEEPSEEK_MODEL`: opcional; padrão `deepseek-flash`, conforme a documentação oficial consultada em 2 de outubro de 2026. O endpoint utilizado é `https://api.deepseek.com/chat/completions`.

Sem a chave, a interface permite preparar perguntas e mostra que a conexão está pendente. Não fabrica respostas. Com a chave, envia a conversa para a DeepSeek. O modelo pode solicitar quatro ferramentas de consulta, executadas pelo servidor com a sessão Supabase do usuário; nenhuma alteração do banco é permitida. O funcionamento real depende da validade da chave, do saldo e da disponibilidade do provedor.

## Escopo e histórico

- Admin: academia, gestão e contagens atuais de usuários por perfil/status, fichas ativas e sessões concluídas nos últimos 30 dias. Pode buscar alunos e consultar fichas, sessões, avaliações físicas e agenda.
- Personal: treino, acompanhamento e orientação com consulta de seus vínculos ativos, suas fichas e sessões, avaliações e agenda dos alunos vinculados.
- Consultas usam SELECTs fixos, com RLS e filtros explícitos de propriedade. Nenhum SQL gerado pela IA, chave service_role, e-mail, senha, foto ou observação livre é enviado. Ferramentas disponíveis: resumo_shapeos, buscar_alunos, consultar_aluno e consultar_treino. Erros não são interpretados como resultados vazios.
- Busca retorna até 20 alunos, detalhe até 20 fichas, 10 sessões, 5 avaliações, 10 próximos agendamentos e ficha até 50 exercícios; as contagens e limites acompanham os resultados. Não há dados financeiros nem acesso a tabelas arbitrárias.
- As mensagens e os dados necessários para responder são enviados à DeepSeek. A interface informa quais respostas consultaram a ShapeOS e o horário. Nomes e títulos do banco são tratados como dados, nunca como instruções.
- Limites por resposta: até 3 rodadas de ferramentas, 6 consultas e 50 segundos para geração e consultas. Perguntas amplas podem precisar ser divididas.
- As mensagens ficam apenas na memória da página. Sair, atualizar ou começar nova conversa limpa esse histórico local. O tratamento das mensagens enviadas ao provedor segue as políticas da DeepSeek.
- A conversa enviada contém até nove trocas anteriores e a pergunta atual; há limites de caracteres, corpo da requisição, tempo e tokens de resposta.
- Existe proteção contra rajadas por usuário e instância (8 chamadas/minuto). Não é uma cota distribuída de custos. Uma cota compartilhada deve acompanhar a expansão futura da integração.
- O conteúdo retornado é renderizado como texto e formatação limitada, nunca como HTML bruto.

## Interface

Mys usa o componente MessageResponse do registro oficial AI Elements, adaptado e com atribuição Apache-2.0 em docs/licenses/ai-elements.txt. Streamdown renderiza Markdown, listas e tabelas sem HTML bruto ou imagens externas. O campo de mensagem e a organização seguem referências do Prompt Kit e assistant-ui, com visual integrado aos temas da ShapeOS.

Consultas bem-sucedidas retornam até oito cartões produzidos pelo servidor a partir dos mesmos dados autorizados: indicadores, alunos e fichas. Fontes e horário aparecem junto da resposta. Explorar um cartão prepara uma pergunta para o usuário enviar. A conversa permite copiar a resposta, refazer a última e começar novamente; não há histórico persistente.

## Validação

Execute `node tests/mys-api.cjs`, `node tests/mys-data.cjs` e `node tests/mys-middleware.cjs` na raiz. Os testes usam um provedor simulado e cobrem autorização por perfil, origem, mensagens inválidas, tamanhos, chave ausente, falhas do provedor, rate limit e escopo obtido do servidor. Eles não atestam uma chamada paga real à DeepSeek.

Faça também o build de `apps/web`. Alterações confirmadas em fichas e histórico persistente são etapas posteriores.
