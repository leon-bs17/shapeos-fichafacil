'use client'

import { useRouter } from 'next/navigation'
import AlunoView from '@/davi/components/views/AlunoView'
import { workoutsById } from '@/davi/data/mockData'
import { createClient } from '@/lib/supabase/client'

export default function AlunoFrontendPage() {
  const router = useRouter()

  async function sair() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return <AlunoView onLogout={sair} workouts={workoutsById} />
}
