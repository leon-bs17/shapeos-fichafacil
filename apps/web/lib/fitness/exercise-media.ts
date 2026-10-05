import catalog from './exercise-media-catalog.json'

export type ExerciseMedia = { src: string; kind: 'image' | 'video'; poster?: string; source?: string; credit?: string }
export const exerciseMediaCatalog = catalog as (ExerciseMedia & { names: string[] })[]
const normalize = (name: string) => name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/\s+/g, ' ')
const byName = new Map(exerciseMediaCatalog.flatMap(media => media.names.map(name => [normalize(name), media] as const)))

// Only explicit names and verified variations share a demonstration.
export function safeExerciseUrl(value?: string | null): string | null {
  if (!value?.trim()) return null
  try {
    const url = new URL(value.trim())
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : null
  } catch { return null }
}
export function validateExerciseUrl(value?: string | null): string | null {
  const url = safeExerciseUrl(value)
  if (value?.trim() && !url) throw new Error('Use um link HTTPS válido para a demonstração.')
  return url
}
export function resolveExerciseMedia(name: string, videoUrl?: string | null, exerciseId?: string): ExerciseMedia | null {
  const url = safeExerciseUrl(videoUrl)
  if (url) {
    const path = new URL(url).pathname
    if (/\.(gif|webp|png|jpe?g|avif)$/i.test(path)) return { src: url, kind: 'image' }
    if (/\.(mp4|webm|ogg|m4v)$/i.test(path)) return { src: url, kind: 'video' }
  }
  const lookupName = exerciseId === 'd06194d4-c128-4e24-98df-bcc08aae3c48' && normalize(name) === 'agachamento demonstracao 0d852a' ? 'Agachamento com Halteres' : name
  return byName.get(normalize(lookupName)) ?? null
}
