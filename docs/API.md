# API REST da ShapeOS

Base: https://shapeos-fichafacil.vercel.app. Endpoints usam a sessão do usuário, sem service_role. Envie cookie válido ou Authorization: Bearer <access_token>. Mutações com cookie exigem Origin igual à origem da aplicação; fetch do próprio site envia isso automaticamente.

| Método | Recurso | Permissão | Sucesso |
|---|---|---|---|
| GET | /api/exercicios?q=supino&grupo=Peito | Conta ativa | 200, data: array |
| GET | /api/treinos | Conta ativa; escopo próprio ou administrativo | 200, data: array |
| POST | /api/treinos | Personal ativo e aluno vinculado | 201, data: ficha, Location |
| GET | /api/treinos/{id} | Ficha visível ao perfil | 200, data: ficha |
| PATCH | /api/treinos/{id} | Personal proprietário | 200, data: ficha |
| DELETE | /api/treinos/{id} | Personal proprietário | 204, corpo vazio |
| POST | /api/treinos/{id}/duplicar | Proprietário e vínculo ativo | 201, data: cópia inativa, Location |

## Corpo de criação

Os UUIDs são exemplos: substitua por aluno vinculado e exercício real do catálogo.

```json
{
  "aluno_id":"11111111-1111-4111-8111-111111111111",
  "titulo":"Treino A",
  "itens":[{
    "exercicio_id":"22222222-2222-4222-8222-222222222222",
    "series":3,"repeticoes":"10","descanso_segundos":60,"ordem":0
  }]
}
```

Título: 3–80 caracteres. Ficha: 1–50 itens. Séries: 1–30. Repetições: 1–20 caracteres. Descanso: 0–900 segundos. Ordem inteira não negativa, distinta entre itens. Os UUIDs devem existir e estar no acesso da conta. Personal/proprietário é obtido da sessão, nunca do corpo.

PATCH aceita título e itens completos, sem aluno_id, OU somente {"ativo":true/false}. Não misture os formatos. A edição preserva IDs e prescrições dos exercícios mantidos. Itens removidos seguem as exclusões em cascata do schema, inclusive registros legados associados; sessões guiadas mantêm seu próprio snapshot.

## Exemplos

Configure BASE_URL, ACCESS_TOKEN e FICHA_ID apenas no ambiente local. Salve o corpo acima em ficha.json com IDs reais.

```bash
curl "$BASE_URL/api/exercicios?q=supino" -H "Authorization: Bearer $ACCESS_TOKEN"
curl "$BASE_URL/api/treinos" -H "Authorization: Bearer $ACCESS_TOKEN"
curl "$BASE_URL/api/treinos" -X POST -H "Authorization: Bearer $ACCESS_TOKEN" -H "Content-Type: application/json" --data-binary @ficha.json
curl "$BASE_URL/api/treinos/$FICHA_ID" -H "Authorization: Bearer $ACCESS_TOKEN"
curl "$BASE_URL/api/treinos/$FICHA_ID" -X PATCH -H "Authorization: Bearer $ACCESS_TOKEN" -H "Content-Type: application/json" -d '{"ativo":false}'
curl "$BASE_URL/api/treinos/$FICHA_ID/duplicar" -X POST -H "Authorization: Bearer $ACCESS_TOKEN"
curl "$BASE_URL/api/treinos/$FICHA_ID" -X DELETE -H "Authorization: Bearer $ACCESS_TOKEN"
```

Sucesso retorna {"data":...}; falha retorna {"error":"mensagem"}. Fichas contêm id, titulo, ativo, criado_em, aluno_id, aluno_nome e itens ordenados. Cada item contém id, ordem, series, repeticoes, descanso_segundos e exercicio. O catálogo inclui proprio e não divulga criado_por.

Erros: 400 validação, 401 sem sessão, 403 perfil/origem/vínculo não permitido, 404 ficha não visível, 409 conflito, 413 corpo maior que 64 KiB, 415 formato diferente de JSON, 500 falha interna e 503 RPC ausente. Dados autenticados têm Cache-Control: no-store. Não há redirecionamento para HTML nas respostas da API.

## Outras rotas

- POST /api/mys: conversa JSON para Admin/Personal, com consultas autorizadas. Ver mys.md.
- POST /api/admin/control: ações JSON administrativas, somente Admin ativo e Origin da aplicação.

GET /auth/callback é uma rota de autenticação com redirecionamento. GET /api/admin/aprovacoes/personais-hq entrega uma imagem; ambos ficam fora da contagem de recursos de negócio.
