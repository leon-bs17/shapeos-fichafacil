export type MysDataCard = {
  kind: 'summary' | 'student' | 'workout'
  title: string
  detail: string
  metrics?: { label: string; value: string }[]
  prompt?: string
}
