'use client'

import { useState } from 'react'
import { Mail, UserPlus, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Modal } from '@/components/ui/modal'
import { useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { DashboardShell } from '@/components/layout/dashboard-shell'
import { useAlunos } from '@/hooks/use-alunos'

export default function AlunosPage() {
  return (
    <DashboardShell>
      <AlunosConteudo />
    </DashboardShell>
  )
}

function AlunosConteudo() {
  const { data: alunos, isLoading } = useAlunos()
  const [modalAberto, setModalAberto] = useState(false)
  const [email, setEmail] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const queryClient = useQueryClient()

  async function convidar() {
    setErro(null)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setErro('Sessão expirada. Entre novamente.')
      return
    }

    setOcupado(true)
    try {
      const { data, error } = await supabase.functions.invoke('convite-aluno', {
        body: { email: email.trim().toLowerCase() },
      })
      if (error) throw new Error('Falha ao chamar o serviço de convites.')

      const alunoId: string | undefined = (data as { data?: { user?: { id?: string } } })?.data?.user?.id
      if (!alunoId) throw new Error((data as { error?: string })?.error ?? 'Não foi possível convidar.')

      const { error: erroVinculo } = await supabase
        .from('personal_alunos')
        .insert({ personal_id: user.id, aluno_id: alunoId })

      if (erroVinculo) {
        if (erroVinculo.code === '23505') throw new Error('Este aluno já está vinculado a você.')
        throw erroVinculo
      }

      void queryClient.invalidateQueries({ queryKey: ['alunos'] })
      setEmail('')
      setModalAberto(false)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro inesperado.')
    } finally {
      setOcupado(false)
    }
  }

  return (
    <div className="space-y-8">
      <header className="animate-fade-in">
        <p className="shapeos-eyebrow">Gestão da base</p>
        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="shapeos-title text-4xl md:text-5xl">Alunos</h1>
            <p className="mt-3 text-sm text-zinc-500">Convide, acompanhe e mantenha sua base organizada.</p>
          </div>
          <Button onClick={() => setModalAberto(true)} className="h-11 rounded-xl bg-[#00D2D2] text-[#1A1A1A] hover:bg-[#00e1e1]">
            <UserPlus className="h-4 w-4" />
            Convidar aluno
          </Button>
        </div>
      </header>

      {isLoading ? (
        <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-20 skeleton" />)}</div>
      ) : alunos?.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#00D2D2]/20 bg-[#00D2D2]/10">
              <Users className="h-8 w-8 text-[#00D2D2]" />
            </div>
            <p className="text-lg font-semibold">Nenhum aluno vinculado</p>
            <p className="mx-auto mt-2 max-w-sm text-sm text-zinc-500">
              Convide seu primeiro aluno por e-mail para começar a montar fichas.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {alunos?.map((a, idx) => (
            <div
              key={a.vinculo_id}
              className={`card-tech animate-slide-up stagger-${Math.min(idx + 1, 8)} flex flex-col gap-4 rounded-2xl p-4 md:flex-row md:items-center md:justify-between md:p-5`}
            >
              <div className="flex min-w-0 items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#00D2D2]/30 bg-[#00D2D2]/10 text-sm font-semibold text-[#00D2D2] shapeos-display">
                  {a.nome?.charAt(0)?.toUpperCase() ?? '?'}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate text-base font-medium">{a.nome}</h2>
                    <span className={a.status === 'ATIVO'
                      ? 'rounded-full border border-[#00D2D2]/25 bg-[#00D2D2]/10 px-2 py-0.5 text-[10px] uppercase tracking-widest text-[#00D2D2]'
                      : 'rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] uppercase tracking-widest text-zinc-500'}>
                      {a.status}
                    </span>
                  </div>
                  <p className="mt-1 flex items-center gap-1.5 truncate text-xs text-zinc-500">
                    <Mail className="h-3 w-3" /> {a.email}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] px-4 py-2.5 text-right">
                <span className="shapeos-eyebrow block">Fichas ativas</span>
                <strong className="mt-1 block text-lg text-[#F5F5F5]">{a.treinos_ativos}</strong>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalAberto} onClose={() => setModalAberto(false)} titulo="Convidar aluno">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="convite-email" className="shapeos-eyebrow">E-mail do aluno</Label>
            <Input
              id="convite-email"
              type="email"
              placeholder="aluno@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 rounded-xl"
            />
            <p className="text-xs text-zinc-500">Se ele ainda não tiver conta, receberá um convite por e-mail.</p>
          </div>

          {erro ? (
            <div className="rounded-xl border border-red-400/20 bg-red-400/[0.07] px-4 py-3 text-sm text-red-300">
              {erro}
            </div>
          ) : null}

          <div className="flex justify-end gap-2 border-t border-white/[0.06] pt-4">
            <Button variant="outline" onClick={() => setModalAberto(false)} className="rounded-xl border-white/10 bg-white/[0.03]">
              Cancelar
            </Button>
            <Button
              onClick={convidar}
              disabled={ocupado || !email.includes('@')}
              className="rounded-xl bg-[#00D2D2] text-[#1A1A1A] hover:bg-[#00e1e1]"
            >
              {ocupado ? 'Enviando...' : 'Convidar e vincular'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
