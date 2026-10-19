# Diagrama de Entidade-Relacionamento — ShapeOS

Atualizado em 19/10/2026 a partir das tabelas e chaves estrangeiras verificadas no banco de produção. Os diagramas representam partes do mesmo modelo, com 15 tabelas públicas. A repetição de usuarios/treinos/itens em módulos é apenas referência à mesma entidade.

usuarios.id também referencia auth.users.id (1:1). auth.users e os hashes de senha são gerenciados pelo Supabase Auth, fora das tabelas de negócio.

## Núcleo: usuários, vínculos e fichas

```mermaid
erDiagram
    direction TB
    usuarios {
        uuid id PK,FK
        text nome
        text email UK
        tipo_usuario tipo
        text status_conta
        timestamptz criado_em
    }
    personal_alunos {
        uuid id PK
        uuid personal_id FK
        uuid aluno_id FK
        status_vinculo status
        timestamptz criado_em
    }
    treinos {
        uuid id PK
        uuid aluno_id FK
        uuid personal_id FK
        text titulo
        boolean ativo
        timestamptz criado_em
    }
    itens_treino {
        uuid id PK
        uuid treino_id FK
        uuid exercicio_id FK
        integer series
        text repeticoes
        integer descanso_segundos
        integer ordem
    }
    exercicios {
        uuid id PK
        text nome
        text grupo_muscular
        text equipamento
        text video_url
        uuid criado_por FK
    }
    usuarios ||--o{ personal_alunos : "personal_id e aluno_id"
    usuarios ||--o{ treinos : "personal_id e aluno_id"
    usuarios o|--o{ exercicios : criado_por
    treinos ||--o{ itens_treino : contem
    exercicios ||--o{ itens_treino : referencia
```

Cada vínculo associa um Personal e um Aluno; o par é único e não pode se vincular a si mesmo. A posição é única por ficha. Nome/grupo muscular de exercício também são únicos. tipo pode ser PERSONAL, ALUNO ou ADMIN; status_conta pode ser ATIVO, PENDENTE ou BLOQUEADO.

## Prescrição, execução e acompanhamento

```mermaid
erDiagram
    direction TB
    prescricoes_treino {
        uuid item_treino_id PK,FK
        numeric carga_alvo
        integer duracao_segundos
        numeric rpe_alvo
        text superset
        integer aquecimento
        numeric incremento_kg
        text observacoes
    }
    registro_execucao {
        uuid id PK
        uuid aluno_id FK
        uuid item_treino_id FK
        numeric carga_utilizada
        integer repeticoes_feitas
        timestamptz data_registro
    }
    sessoes_treino {
        uuid id PK
        uuid aluno_id FK
        uuid treino_id FK
        text titulo
        timestamptz inicio
        timestamptz fim
        text status
        jsonb prescricao
        jsonb series
        text observacoes
        timestamptz atualizado_em
    }
    agenda_treino {
        uuid id PK
        uuid aluno_id FK
        uuid treino_id FK
        date data
    }
    avaliacoes_fisicas {
        uuid id PK
        uuid aluno_id FK
        date data
        numeric peso
        numeric cintura
        numeric quadril
        numeric braco
        text observacoes
        text foto_path
        timestamptz criado_em
    }
    itens_treino ||--o| prescricoes_treino : configura
    itens_treino ||--o{ registro_execucao : recebe
    usuarios ||--o{ registro_execucao : registra
    usuarios ||--o{ sessoes_treino : executa
    treinos o|--o{ sessoes_treino : origina
    usuarios ||--o{ agenda_treino : agenda
    treinos ||--o{ agenda_treino : programa
    usuarios ||--o{ avaliacoes_fisicas : possui
```

prescricoes_treino é uma extensão opcional 1:1 de um item. A agenda possui unicidade por aluno/ficha/data. A sessão guarda snapshots JSON da prescrição e das séries para preservar o histórico mesmo quando a ficha é excluída; nesse caso treino_id fica nulo. Os registros legados de execução associados a um item removido seguem a exclusão em cascata.

## Administração e notificações

```mermaid
erDiagram
    direction TB
    admin_auditoria {
        uuid id PK
        uuid admin_id FK
        uuid usuario_id FK
        text acao
        jsonb detalhes
        timestamptz criado_em
    }
    admin_notificacoes {
        uuid id PK
        text titulo
        text mensagem
        text publico
        boolean ativa
        uuid criado_por FK
        timestamptz criado_em
        timestamptz expira_em
    }
    notificacao_leituras {
        uuid usuario_id PK,FK
        uuid notificacao_id PK,FK
        timestamptz lida_em
    }
    admin_configuracao {
        boolean id PK
        boolean cadastro_aberto
        text mensagem_publica
        timestamptz atualizado_em
    }
    solicitacoes_suporte {
        uuid id PK
        uuid aluno_id FK
        text destino
        uuid personal_id FK
        text assunto
        text mensagem
        text status
        timestamptz criado_em
    }
    usuarios ||--o{ admin_auditoria : admin_id
    usuarios o|--o{ admin_auditoria : usuario_id
    usuarios ||--o{ admin_notificacoes : publica
    usuarios ||--o{ notificacao_leituras : le
    admin_notificacoes ||--o{ notificacao_leituras : possui
    usuarios ||--o{ solicitacoes_suporte : aluno_id
    usuarios o|--o{ solicitacoes_suporte : personal_id
```

admin_configuracao é uma configuração singleton sem chave estrangeira. notificacao_leituras tem chave primária composta; a view notificacoes_recebidas combina notificações visíveis e leituras, sem ser uma tabela adicional.

## Suporte

solicitacoes_suporte contém id (PK), aluno_id (FK usuarios, obrigatório), destino, personal_id (FK usuarios, opcional), assunto, mensagem, status e criado_em. Um aluno pode abrir várias solicitações; cada solicitação pode ser encaminhada a um personal ou ao suporte administrativo. A migração 20261019144715_sprint3_support_schema.sql reproduz essa tabela em instalações novas, sem alterar os registros e políticas de instalações existentes.

Todas as 15 tabelas estão com RLS habilitado. Chaves e cardinalidades descrevem o banco; acesso a registros continua condicionado às políticas e ao perfil autenticado.
