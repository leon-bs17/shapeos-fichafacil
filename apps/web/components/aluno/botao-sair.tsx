'use client'

import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export function BotaoSairAluno() {
  const router = useRouter()

  async function sair() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <button
      onClick={sair}
      className="text-muted-foreground hover:text-destructive inline-flex cursor-pointer items-center gap-1.5 text-sm font-medium"
    >
      <LogOut className="h-4 w-4" /> Sair
    </button>
  )
}
