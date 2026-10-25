import type { WorkoutStatus } from './workout-tools'
export type StudentStatusFilter = 'TODOS' | 'ATIVO' | 'INATIVO'
export function studentStatusFilter(value: string | null): StudentStatusFilter { return value === 'ATIVO' || value === 'INATIVO' ? value : 'TODOS' }
export function workoutStatusFilter(value: string | null): WorkoutStatus { return value === 'ATIVAS' || value === 'PAUSADAS' ? value : 'TODAS' }
export function filterLinkedStudents<T extends { status: string }>(students: T[], filter: StudentStatusFilter): T[] { return filter === 'TODOS' ? students : students.filter(student => student.status === filter) }
export function paginationPages(current: number, total: number): (number | string)[] {
  const values = [...new Set([1, total, current - 1, current, current + 1].filter(value => value >= 1 && value <= total))].sort((a,b) => a-b)
  return values.flatMap((value,index) => index && value-values[index-1]>1 ? [`gap-${value}`,value] : [value])
}
