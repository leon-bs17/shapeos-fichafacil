# ShapeOS

Plataforma para personal trainers, alunos e administradores: fichas, treino guiado, histórico, agenda, avaliações físicas, notificações e assistente Mys.

Produção: https://shapeos-fichafacil.vercel.app

## Tecnologias

TypeScript, Next.js 15, React 19, Tailwind CSS 4, TanStack Query, PostgreSQL/Supabase Auth/RLS, pnpm 9.15.9, Turborepo e Playwright. O aplicativo móvel usa Expo/React Native. A integração DeepSeek é opcional.

## Instalação

Requisitos: Node.js >=20, pnpm 9.15.9 e um projeto Supabase. Docker e Supabase CLI são necessários apenas para infraestrutura local.

```bash
git clone https://github.com/leon-bs17/shapeos-fichafacil.git
cd shapeos-fichafacil
npm install -g pnpm@9.15.9
pnpm install --frozen-lockfile
cp apps/web/.env.example apps/web/.env.local
```

Edite apps/web/.env.local:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=SUA_CHAVE_PUBLICAVEL_OU_ANON
```

Nunca use service_role ou chaves secretas em NEXT_PUBLIC_. A Mys usa DEEPSEEK_API_KEY somente no servidor; DEEPSEEK_MODEL é opcional. CAPTCHA, OAuth e biometria são opcionais e não substituem o login por senha.

Para um banco local novo, com Docker e Supabase CLI:

```bash
pnpm exec supabase start
pnpm exec supabase db reset
```

Configure o .env.local com a URL e chave locais exibidas pela CLI. O reset apaga e recria somente o banco local de desenvolvimento. Em projeto hospedado existente, revise e aplique apenas as migrações pendentes de supabase/migrations, sem reset de produção. A correção reexecutável de fichas está em 20261019142527_sprint3_atomic_workouts.sql.

```bash
pnpm dev:web
# http://localhost:3000
pnpm --filter @shapeos/web build
pnpm --filter @shapeos/web start
```

O Personal precisa ser aprovado pelo administrador; o Aluno precisa de vínculo ativo com o Personal para receber fichas. O primeiro administrador é provisionado pelo responsável do banco, sem cadastro público de Admin.

## Estrutura

```text
apps/web/app/              Páginas e back-end HTTP Next.js
apps/web/app/api/          API REST própria
apps/web/components/       Interface e treino guiado
apps/web/lib/api/          Autorização, validação e respostas HTTP
apps/web/services/         Integração do front com API e banco
apps/mobile/              Aplicativo Expo/React Native
packages/shared/          Tipos e validação de formulários
supabase/migrations/       Tabelas, políticas e funções
supabase/tests/            Testes SQL de integração
tests/                    Testes de contratos e regras
e2e/                      Testes Playwright
docs/                     DER, API e demonstração
```

## Autenticação e perfis

Aluno consulta suas fichas e registra treinos; Personal gerencia suas fichas e alunos vinculados; Admin acessa a administração. Middleware, endpoints e RLS verificam o perfil atual. O cliente não escolhe suas permissões. Supabase Auth armazena senhas com hash bcrypt; as tabelas de negócio não contêm senhas.

## API REST própria

Base: a origem da aplicação. Autenticação por cookie de sessão ou Authorization: Bearer <access_token>. Escritas com cookie exigem Origin igual à origem do site. As leituras respeitam o perfil; mutações de fichas exigem Personal ativo e proprietário.

| Método | Endpoint | Ação |
|---|---|---|
| GET | /api/exercicios | Catálogo com filtros q e grupo |
| GET | /api/treinos | Fichas autorizadas |
| POST | /api/treinos | Criar ficha para aluno vinculado |
| GET | /api/treinos/{id} | Consultar ficha |
| PATCH | /api/treinos/{id} | Editar título/itens ou status ativo |
| DELETE | /api/treinos/{id} | Excluir ficha |
| POST | /api/treinos/{id}/duplicar | Copiar ficha e prescrições, inicialmente inativa |

São quatro caminhos de recursos e sete operações HTTP usadas pelo front. Há ainda POST /api/mys e POST /api/admin/control. A rota de imagem de Aprovações e o callback de autenticação não são contados como API de negócio.

As respostas usam JSON com data ou error. Criação/cópia retornam 201 e Location; exclusão retorna 204 sem corpo. Demais códigos: 200, 400, 401, 403, 404, 409, 413, 415, 500 e 503. Exemplos de requisições, campos e permissões: [docs/API.md](docs/API.md).

## Banco e DER

[DER atualizado](docs/DER.md): núcleo de usuários/vínculos/fichas/exercícios e extensões de execução, agenda, avaliações, administração, notificações e suporte. O banco de produção tem 15 tabelas públicas relacionadas; auth.users é gerenciada pelo Supabase e se relaciona com usuarios.id.

## Testes e Sprint 3

```bash
node tests/sprint3-api.cjs
node tests/mys-api.cjs
node tests/mys-data.cjs
pnpm --filter @shapeos/web typecheck
pnpm --filter @shapeos/web build
pnpm test:e2e
```

Testes de contrato usam dependências simuladas e não substituem integração real. supabase/tests/sprint3_workouts.sql testa criação, edição, cópia, preservação de prescrições, rollback e permissão do aluno; usa contas demonstrativas identificadas no arquivo e reverte os dados ao terminar. Para outro banco, ajuste os IDs para suas próprias contas de teste.

O roteiro e a matriz de requisitos estão em [docs/SPRINT3.md](docs/SPRINT3.md). scripts/sprint3-smoke.mjs executa um teste HTTP autenticado com variáveis de ambiente, cria fichas temporárias para um aluno de teste e as remove ao final. Não versione credenciais nem sessões.

Dois requisitos funcionais foram adicionados nesta correção: busca de fichas por título/aluno combinando status e exportação das fichas filtradas em JSON. A matriz identifica essas adições em relação ao código revisado, sem inventar participação individual nas Sprints anteriores.
