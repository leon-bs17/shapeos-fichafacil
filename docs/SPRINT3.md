# Sprint 3 — requisitos técnicos e demonstração

Entrega prevista: 19/10/2026. Esta matriz cobre software e documentação; não certifica participação individual, quantidade de commits ou Trello.

| Requisito | Implementação/evidência |
|---|---|
| 1 — dois requisitos novos | RF-S3-01: buscar fichas por título/aluno combinando status. RF-S3-02: exportar as fichas filtradas em JSON com versão e data. Ambos adicionados nesta correção, após a revisão do commit be342713. |
| 2 — cadastro/login/logout e restrição | app/cadastro, app/cadastro/aluno, app/login, middleware e signOut nos painéis. |
| 3 — perfis | Aluno, Personal e Admin; perfil/status consultados no banco e RLS por proprietário. |
| 4 — senhas com hash | Supabase Auth; bcrypt. Não há senha em tabela pública de negócio. |
| 5 — API própria | Quatro caminhos REST, sete operações HTTP e JSON; ver API.md. |
| 6 — front integrado | services/treinos.ts e services/exercicios.ts consomem API da aplicação. Mys consome DeepSeek no servidor. |
| 7 — banco relacionado | 15 tabelas públicas verificadas, chaves estrangeiras e RLS. |
| 8 — DER | DER.md documenta o núcleo e as extensões existentes. |
| 9 — CRUD | Exercícios e fichas; RPCs atômicas de criação/edição/cópia restauradas. |
| 10 — busca/filtros/ordem/paginação | Catálogo por nome/grupo; ordenação; usuários com filtros e paginação. |
| 11 — validação e mensagens | Formulários, esquemas compartilhados, validação HTTP, códigos e mensagens de erro. |
| 12 — interface | Componentes compartilhados, temas e breakpoints responsivos existentes, sem redesenho nesta correção. |
| 13 — README | Tecnologias, instalação, execução, estrutura, API, DER e testes documentados. |
| 16 e 17 — funcionamento e API | Roteiro abaixo e scripts de verificação reproduzíveis. O relatório de testes registra apenas o que foi executado. |

## Roteiro para apresentar

1. Sem login, abrir /treinos e verificar o redirecionamento; chamar GET /api/treinos e verificar 401 JSON.
2. Cadastrar uma conta Aluno e uma Personal em ambiente de demonstração; aprovar a Personal como Admin. Entrar e sair de cada perfil. Não publicar senhas reais.
3. Vincular o Aluno à Personal. Criar um exercício próprio com um vídeo HTTPS válido, atualizar a página e confirmar a mídia salva. Editar e excluir somente o exercício demonstrativo, sem uso em fichas reais.
4. Criar uma ficha com dois exercícios; atualizar a página e confirmar persistência. Editar séries/título, duplicar, alternar ativo e excluir a cópia. Buscar por nome do aluno/título, filtrar por status e exportar somente os resultados em JSON.
5. Entrar como Aluno, consultar a ficha e executar uma sessão com séries e descanso. Concluir, recarregar e conferir o histórico.
6. No Postman/Insomnia, usar um access_token de teste para GET /api/exercicios, POST /api/treinos, GET/PATCH/DELETE /api/treinos/{id} e POST /api/treinos/{id}/duplicar. Mostrar JSON e códigos 200/201/204.
7. Com token do Aluno, tentar POST/PATCH/DELETE e mostrar 403; com Personal não proprietária, tentar consultar a ficha temporária e mostrar 404.
8. Mostrar as relações no DER e no banco, sem exibir hashes, senhas ou tokens.

## Verificações automatizadas

- node tests/sprint3-api.cjs: contrato, sessão, perfis, origem, JSON, limites e código HTTP sem acesso pago.
- supabase/tests/sprint3_workouts.sql: operações reais com rollback, preservação de IDs/prescrições e aluno sem escrita.
- scripts/sprint3-smoke.mjs: API HTTP real com contas de teste; recebe BASE_URL, SUPABASE_URL, SUPABASE_ANON_KEY, PERSONAL_EMAIL, PERSONAL_PASSWORD, ALUNO_EMAIL, ALUNO_PASSWORD e ALUNO_ID via ambiente. Cria/exclui apenas suas fichas temporárias. Não altera credenciais.
- Build/typecheck do web e testes existentes de Mys/fitness.

Não foram criados commits artificiais por integrante nem atividades fictícias no Trello. A comprovação de novidade e participação deve usar o histórico real da equipe.

Resultados efetivamente executados: [VALIDACAO-SPRINT3.md](VALIDACAO-SPRINT3.md).
