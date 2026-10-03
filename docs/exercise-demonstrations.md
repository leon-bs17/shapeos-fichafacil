# Demonstrações dos exercícios

Bonecos vetoriais originais da ShapeOS, sem GIFs ou mídia de terceiros e sem API paga. Catálogo em apps/web/lib/fitness/exercise-motions.ts; renderer em apps/web/components/fitness/exercise-demonstration.tsx.

Cobertura: todos os 29 exercícios do catálogo inicial e o cadastro de demonstração de agachamento com halteres, identificado explicitamente por ID. Nomes são normalizados por acento e caixa, mas não há associação aproximada por grupo muscular. “Anderson”, “peito” e futuros movimentos desconhecidos ficam com demonstração pendente até identificação correta. Nunca recebem um boneco de outro exercício.

As animações são ilustrações simplificadas, não captura de movimento nem validação biomecânica. A prancha mantém posição isométrica. O usuário pode pausar, ampliar e abrir o vídeo indicado pelo personal. Respeitam movimento reduzido do sistema e pausam fora da área visível. Não enviam registros do aluno a serviços externos.

Disponíveis na sessão ativa do aluno, no modo de execução anterior e nas bibliotecas do admin/personal. Novos nomes/variações precisam de uma correspondência explícita e, quando necessário, de nova animação.

Verificação: node tests/exercise-motions.cjs e build de apps/web. Validação visual cobre todos os movimentos, pausa, ampliação, preferência de movimento reduzido e celular.
