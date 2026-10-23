# Alunos de demonstração para revisão visual

Conjunto manual criado em 23/10/2026 para a conta **Personal Teste**, a conta usada nas capturas da revisão visual. Não se trata de uma migração nem de um seed automático.

| Aluno | Cenário | Fichas | Sessões | Avaliações |
| --- | --- | --- | --- | --- |
| Ana Beatriz Silva · Demonstração | Acompanhamento ativo, evolução e sessão em andamento | 2 | 11 (10 concluídas e 1 em andamento) | 3 |
| Bruno Henrique Costa · Demonstração | Inatividade, ficha a vencer e avaliação pendente | 1 | 3 concluídas | 1 |
| Carla Oliveira · Demonstração | Recém-vinculada, sem ficha nem avaliação | 0 | 0 | 0 |

São três vínculos ativos, nove exercícios prescritos, cinco agendamentos de treino e datas de avaliação. As fichas reutilizam exercícios existentes no catálogo, sem modificar o catálogo.

Todos os registros são fictícios. Os nomes exibem Demonstração e os endereços usam o domínio reservado `demo.shapeos.invalid`. As contas Auth são apenas referências para as chaves estrangeiras: sem senha, sem identidade de login e com acesso Auth desabilitado. Não foram enviados convites, e-mails ou comunicados. Para testar o acesso como Aluno, será necessário preparar uma conta de demonstração com autenticação pelo fluxo administrativo apropriado.

Os registros aparecem nas consultas normais e, por isso, também influenciam contagens e relatórios do Admin enquanto existirem. O Personal vê apenas seus vínculos; foi verificado que outro Personal não enxerga estes dados.

## Revisão

Atualize a sessão de Personal Teste. Confira Visão Geral, Alunos, Treinos, Relatórios, Agenda e o seletor da Mys. Os alertas são calculados a partir da data atual: o cenário envelhece naturalmente, como qualquer registro. Nada é atualizado automaticamente para manter datas artificialmente recentes.

A criação foi verificada em transações com rollback antes da gravação definitiva. Também foram conferidos o acesso por RLS, a integridade dos snapshots de sessões, as datas, as contagens e o procedimento de remoção em uma transação revertida. A verificação visual das páginas no navegador continua sendo uma etapa separada.

## Scripts manuais

- `supabase/demo/personal_visual_seed.sql`: cria o conjunto uma única vez, com identificadores gerados pelo banco. Interrompe se o conjunto já existir ou houver conflito de e-mail. Não sobrescreve alterações feitas durante a revisão.
- `supabase/demo/personal_visual_cleanup.sql`: remove somente as três contas identificadas pelo marcador `shapeos-personal-visual-v1`, proprietário e e-mails exatos. As referências são removidas pelas chaves estrangeiras existentes. Interrompe se os alunos forem vinculados ou receberem fichas de outro Personal.

Execute a limpeza apenas quando a remoção for solicitada. Não inclua esses scripts em migrações, reset remoto ou seeds automáticos.
