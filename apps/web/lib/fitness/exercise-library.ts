import type { ExercicioBiblioteca } from '@/services/exercicios'

export function normalizedExerciseText(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLocaleLowerCase('pt-BR')
}
export function filterExerciseLibrary(exercises: ExercicioBiblioteca[], search: string, group: string, equipment: string, favoritesOnly: boolean, favorites: Set<string>) {
  const term = normalizedExerciseText(search)
  return exercises.filter(exercise => (group === 'Todos' || exercise.grupo_muscular === group) &&
    (equipment === 'Todos' || (equipment === 'Sem equipamento informado' ? !exercise.equipamento : exercise.equipamento === equipment)) &&
    (!favoritesOnly || favorites.has(exercise.id)) && (!term || normalizedExerciseText(exercise.nome).includes(term)))
}
export function exerciseAlternatives(source: ExercicioBiblioteca, exercises: ExercicioBiblioteca[], equipment = 'Todos') {
  const sourceGroup = normalizedExerciseText(source.grupo_muscular)
  if (!sourceGroup) return []
  return exercises.filter(exercise => exercise.id !== source.id && normalizedExerciseText(exercise.grupo_muscular) === sourceGroup &&
    (equipment === 'Todos' || (equipment === 'Sem equipamento informado' ? !exercise.equipamento : exercise.equipamento === equipment)))
    .sort((a, b) => {
      const sameA = !!source.equipamento && a.equipamento === source.equipamento
      const sameB = !!source.equipamento && b.equipamento === source.equipamento
      return Number(sameB) - Number(sameA) || a.nome.localeCompare(b.nome, 'pt-BR') || a.id.localeCompare(b.id)
    })
}
