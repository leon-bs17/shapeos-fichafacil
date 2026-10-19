# Validação técnica — 19/10/2026

Referência inicial: be342713a2103c61c0a9ec60f3fed2cc9a992425. Correção validada com o banco de produção da ShapeOS e contas dedicadas example.invalid. Nenhuma credencial é incluída neste relatório.

| Verificação executada | Resultado |
|---|---|
| Teste SQL em transação revertida | PASS: criar, editar, duplicar, preservar ID/prescrição, não deixar criação parcial e impedir escrita do aluno |
| Teste HTTP com servidor local e Supabase real | PASS: login por senha, sete operações REST, leitura após edição, códigos 200/201/204, aluno com 403 e ficha excluída com 404 |
| Navegador com destinos restritos | PASS: login por cookie, listagem via API, busca/status combinados, download JSON somente das fichas filtradas e layout de 390px sem vazamento horizontal |
| Persistência de mídia no navegador | PASS: cadastro de exercício demonstrativo com GIF HTTPS da própria ShapeOS e confirmação do mesmo video_url após recarregar |
| Testes de contrato | PASS: sessão, perfis, propriedade, origem, Bearer inválido, JSON, limite de corpo e campos rejeitados |
| Regressão Mys | PASS: contratos, consultas autorizadas e bypass correto do middleware nas APIs |
| Regressão fitness e mídias | PASS: progresso, totais, sincronização, mídia dos 29 exercícios padrão e correspondências explícitas |
| TypeScript | PASS |
| Build de produção | PASS; três avisos de hooks já existentes em controle/layout, sem erro de compilação |

Os testes de navegador usam apenas o site em teste e o Supabase configurado; demais destinos são bloqueados. O teste inicial foi interrompido pela revisão automática por uma conexão externa não identificada; a execução restrita foi concluída com sucesso. A mídia fictícia externa usada inicialmente foi substituída no teste por um GIF já hospedado na própria ShapeOS.

As funções criar_ficha_atomica, editar_ficha_atomica e duplicar_ficha_atomica foram verificadas no banco como SECURITY INVOKER, sem bypass de RLS. A migração de suporte apenas reproduz o schema quando a tabela ainda não existe, preservando a instalação atual.

## Limites da validação

O banco local Docker não estava em execução; não foi executado reset local nem reset de produção. Os testes SQL e HTTP usaram o banco existente e dados demonstrativos. Testes de contrato com mocks complementam os testes reais, mas não os substituem. O roteiro de cadastro e apresentação em sala está em SPRINT3.md; não há afirmação de que a apresentação acadêmica já aconteceu.

A revisão de advisors do Supabase ainda lista avisos preexistentes em funções SECURITY DEFINER usadas pela administração/políticas e na proteção contra senhas vazadas. As novas funções de fichas não aparecem nesses avisos. Referências para revisão da configuração existente: [funções acessíveis por anon](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable), [funções acessíveis por autenticados](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable) e [proteção contra senhas vazadas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). Isso não altera a confirmação de armazenamento das senhas com hash bcrypt.
