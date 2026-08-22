import type { SupabaseClient } from '@supabase/supabase-js'
import { GRUPOS_MUSCULARES, EQUIPAMENTOS } from '@shapeos/shared'

export interface ExercicioBiblioteca {
  id: string
  nome: string
  grupo_muscular: string
  video_url: string | null
  equipamento: string | null
  proprio: boolean
}

export async function listarExercicios(
  supabase: SupabaseClient,
  personalId: string
): Promise<ExercicioBiblioteca[]> {
  const { data, error } = await supabase
    .from('exercicios')
    .select('id, nome, grupo_muscular, video_url, equipamento, criado_por')
    .order('nome')

  if (error) throw error

  return (data ?? []).map((e) => ({
    id: e.id,
    nome: e.nome,
    grupo_muscular: e.grupo_muscular,
    video_url: e.video_url,
    equipamento: e.equipamento,
    proprio: e.criado_por === personalId,
  }))
}

export async function criarExercicio(
  supabase: SupabaseClient,
  personalId: string,
  entrada: { nome: string; grupo_muscular: string; equipamento: string }
): Promise<void> {
  if (!GRUPOS_MUSCULARES.includes(entrada.grupo_muscular as never)) {
    throw new Error('Grupo muscular inválido')
  }
  const equipamento = EQUIPAMENTOS.includes(entrada.equipamento as never)
    ? entrada.equipamento
    : null

  const { error } = await supabase.from('exercicios').insert({
    nome: entrada.nome.trim(),
    grupo_muscular: entrada.grupo_muscular,
    equipamento,
    criado_por: personalId,
  })

  if (error) {
    if (error.code === '23505') {
      throw new Error('Já existe um exercício com esse nome neste grupo.')
    }
    throw error
  }
}
