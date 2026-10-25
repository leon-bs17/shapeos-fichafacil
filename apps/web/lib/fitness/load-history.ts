import type { RegistroRelatorio } from '@/services/registros'

export interface LoadHistoryGroup {
  id: string
  nome: string
  registros: { id: string; carga: number | null; reps: number | null; data: string }[]
}
export function groupLoadHistory(records: RegistroRelatorio[]): LoadHistoryGroup[] {
  const groups = new Map<string, LoadHistoryGroup>()
  for (const row of records) {
    const id = row.exercicio_id || `removed:${row.item_treino_id || row.id}`
    let group = groups.get(id)
    if (!group) { group = { id, nome: row.exercicio_nome, registros: [] }; groups.set(id, group) }
    group.registros.push({ id: row.id, carga: row.carga_utilizada, reps: row.repeticoes_feitas, data: row.data_registro })
  }
  for (const group of groups.values()) group.registros.sort((a,b) => Date.parse(a.data)-Date.parse(b.data) || a.id.localeCompare(b.id))
  return [...groups.values()]
}
export function summarizeLoadHistory(group: LoadHistoryGroup) {
  const points = group.registros.map(row => ({ ...row, carga: row.carga != null && Number.isFinite(row.carga) && row.carga >= 0 ? row.carga : null }))
  const recorded = points.filter((row): row is typeof row & { carga: number } => row.carga !== null)
  return {
    points,
    best: recorded.length ? recorded.reduce((best, row) => Math.max(best, row.carga), 0) : null,
    difference: recorded.length >= 2 ? recorded[recorded.length-1].carga-recorded[0].carga : null,
    missing: points.length-recorded.length,
    latest: points[points.length-1]?.data,
  }
}
