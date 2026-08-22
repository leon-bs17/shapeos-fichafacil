import {
  GRUPOS_MUSCULARES,
  criarTreinoSchema,
  itemTreinoSchema,
  loginSchema,
  registroExecucaoSchema,
  vincularAlunoSchema,
} from '../packages/shared/src/index'

let falhas = 0

function verificar(nome: string, condicao: boolean) {
  if (!condicao) {
    falhas += 1
    console.log(`FALHOU: ${nome}`)
    return
  }
  console.log(`ok: ${nome}`)
}

verificar(
  'login aceita credenciais validas',
  loginSchema.safeParse({ email: 'a@b.com', senha: '123456' }).success
)
verificar('login rejeita email invalido', !loginSchema.safeParse({ email: 'x', senha: '123456' }).success)
verificar('login rejeita senha curta', !loginSchema.safeParse({ email: 'a@b.com', senha: '123' }).success)

const uuid = '123e4567-e89b-42d3-a456-426614174000'

const treino = criarTreinoSchema.safeParse({
  aluno_id: uuid,
  titulo: 'Push A',
  itens: [
    {
      exercicio_id: uuid,
      series: 4,
      repeticoes: '8-12',
      descanso_segundos: 60,
      ordem: 0,
    },
  ],
})
verificar('criarTreino aceita ficha valida', treino.success)
verificar(
  'criarTreino rejeita sem exercicios',
  !criarTreinoSchema.safeParse({ aluno_id: uuid, titulo: 'Push A', itens: [] }).success
)
verificar(
  'criarTreino rejeita series negativas',
  !criarTreinoSchema.safeParse({
    aluno_id: uuid,
    titulo: 'Push A',
    itens: [{ exercicio_id: uuid, series: -1, repeticoes: '10', descanso_segundos: 60, ordem: 0 }],
  }).success
)

verificar(
  'registro aceita carga nula',
  registroExecucaoSchema.safeParse({
    item_treino_id: uuid,
    carga_utilizada: null,
    repeticoes_feitas: 12,
    data_registro: new Date().toISOString(),
  }).success
)
verificar(
  'registro rejeita carga negativa',
  !registroExecucaoSchema.safeParse({
    item_treino_id: uuid,
    carga_utilizada: -5,
    repeticoes_feitas: 12,
    data_registro: new Date().toISOString(),
  }).success
)

verificar(
  'itemTreino limita descanso em 900s',
  !itemTreinoSchema.safeParse({ exercicio_id: uuid, series: 3, repeticoes: '10', descanso_segundos: 901, ordem: 0 }).success
)

verificar(
  'vincularAluno valida email',
  vincularAlunoSchema.safeParse({ email: 'aluno@teste.com' }).success &&
    !vincularAlunoSchema.safeParse({ email: 'nope' }).success
)

verificar('grupos musculares tem 9 entradas', GRUPOS_MUSCULARES.length === 9)

if (falhas > 0) {
  console.log(`\n${falhas} teste(s) falharam`)
  process.exit(1)
}
console.log('\nTodos os testes de schema passaram')
