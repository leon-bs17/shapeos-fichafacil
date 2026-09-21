import { expect, test } from '@playwright/test'
import { carregarContas } from './auth-helpers'
import { SENHA_E2E } from './e2e-db'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

async function obterToken(email: string): Promise<string> {
  const response = await fetch(
    SUPABASE_URL + '/auth/v1/token?grant_type=password',
    {
      method: 'POST',
      headers: {
        apikey: ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password: SENHA_E2E }),
    }
  )

  const data = await response.json()
  if (!response.ok || !data.access_token) {
    throw new Error('Falha de autenticacao E2E: ' + JSON.stringify(data))
  }

  return data.access_token as string
}

function headers(token: string, extras: Record<string, string> = {}) {
  return {
    apikey: ANON_KEY,
    Authorization: 'Bearer ' + token,
    'Content-Type': 'application/json',
    ...extras,
  }
}

test.describe('Seguranca e atomicidade', () => {
  test('aluno nao consegue alterar o proprio papel', async () => {
    const { alunoEmail, alunoId } = carregarContas()
    const token = await obterToken(alunoEmail)

    const tentativa = await fetch(
      SUPABASE_URL + '/rest/v1/usuarios?id=eq.' + alunoId,
      {
        method: 'PATCH',
        headers: headers(token, { Prefer: 'return=representation' }),
        body: JSON.stringify({ tipo: 'ADMIN' }),
      }
    )

    expect(tentativa.ok).toBe(false)

    const consulta = await fetch(
      SUPABASE_URL +
        '/rest/v1/usuarios?select=tipo&id=eq.' +
        alunoId,
      { headers: headers(token) }
    )
    expect(consulta.ok).toBe(true)

    const perfis = (await consulta.json()) as { tipo: string }[]
    expect(perfis).toHaveLength(1)
    expect(perfis[0]?.tipo).toBe('ALUNO')
  })

  test('criacao de ficha faz rollback completo se um item for invalido', async () => {
    const { personalEmail, personalId, alunoId } = carregarContas()
    const token = await obterToken(personalEmail)

    const exerciciosResponse = await fetch(
      SUPABASE_URL + '/rest/v1/exercicios?select=id&limit=1',
      { headers: headers(token) }
    )
    expect(exerciciosResponse.ok).toBe(true)
    const exercicios = (await exerciciosResponse.json()) as { id: string }[]
    const exercicioId = exercicios[0]?.id
    expect(exercicioId).toBeTruthy()

    const criarValida = await fetch(
      SUPABASE_URL + '/rest/v1/rpc/criar_ficha_atomica',
      {
        method: 'POST',
        headers: headers(token),
        body: JSON.stringify({
          p_aluno_id: alunoId,
          p_titulo: 'Ficha E2E valida',
          p_itens: [
            {
              exercicio_id: exercicioId,
              series: 3,
              repeticoes: '10',
              descanso_segundos: 60,
              ordem: 0,
            },
          ],
        }),
      }
    )
    expect(criarValida.ok).toBe(true)
    const fichaValidaId = (await criarValida.json()) as string

    const apagarValida = await fetch(
      SUPABASE_URL + '/rest/v1/treinos?id=eq.' + fichaValidaId,
      {
        method: 'DELETE',
        headers: headers(token),
      }
    )
    expect(apagarValida.ok).toBe(true)

    const antesResponse = await fetch(
      SUPABASE_URL +
        '/rest/v1/treinos?select=id&personal_id=eq.' +
        personalId,
      { headers: headers(token) }
    )
    expect(antesResponse.ok).toBe(true)
    const antes = (await antesResponse.json()) as { id: string }[]

    const criarInvalida = await fetch(
      SUPABASE_URL + '/rest/v1/rpc/criar_ficha_atomica',
      {
        method: 'POST',
        headers: headers(token),
        body: JSON.stringify({
          p_aluno_id: alunoId,
          p_titulo: 'Ficha que deve falhar',
          p_itens: [
            {
              exercicio_id: exercicioId,
              series: 0,
              repeticoes: '10',
              descanso_segundos: 60,
              ordem: 0,
            },
          ],
        }),
      }
    )
    expect(criarInvalida.ok).toBe(false)

    const depoisResponse = await fetch(
      SUPABASE_URL +
        '/rest/v1/treinos?select=id&personal_id=eq.' +
        personalId,
      { headers: headers(token) }
    )
    expect(depoisResponse.ok).toBe(true)
    const depois = (await depoisResponse.json()) as { id: string }[]

    expect(depois).toHaveLength(antes.length)
  })
})
