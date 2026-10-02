import { createClient } from '@/lib/supabase/server'
import { allowedMysProfile } from './contract'

export async function getMysAccess() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  const { data: profile } = await supabase.from('usuarios').select('nome,tipo,status_conta').eq('id', user.id).single()
  if (!allowedMysProfile(profile)) return null
  return { id: user.id, role: profile.tipo, name: typeof profile.nome === 'string' ? profile.nome : '' }
}
