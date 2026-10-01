'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Activity, Clock3, RefreshCw, ShieldCheck, UserPlus, Users } from 'lucide-react'

type Usuario = { id: string; nome: string; email: string; tipo: string; criado_em: string }
type Auditoria = { id: string; acao: string; detalhes: Record<string, unknown>; criado_em: string }

type Evento = {
  id: string
  tipo: 'cadastro' | 'admin'
  titulo: string
  descricao: string
  data: string
}

export default function AdminAtividadePage() {
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['admin-atividade'],
    queryFn: async () => {
      const supabase = createClient()
      const [usuariosR, auditoriaR] = await Promise.all([
        supabase.from('usuarios').select('id, nome, email, tipo, criado_em').order('criado_em', { ascending: false }).limit(30),
        supabase.from('admin_auditoria').select('id, acao, detalhes, criado_em').order('criado_em', { ascending: false }).limit(30),
      ])
      if (usuariosR.error) throw usuariosR.error
      if (auditoriaR.error) throw auditoriaR.error

      const usuarios = (usuariosR.data ?? []) as Usuario[]
      const auditoria = (auditoriaR.data ?? []) as Auditoria[]

      const eventos: Evento[] = [
        ...usuarios.map((u) => ({
          id: `u-${u.id}`,
          tipo: 'cadastro' as const,
          titulo: `Novo ${u.tipo.toLowerCase()} cadastrado`,
          descricao: `${u.nome} · ${u.email}`,
          data: u.criado_em,
        })),
        ...auditoria.map((a) => ({
          id: `a-${a.id}`,
          tipo: 'admin' as const,
          titulo: a.acao.replaceAll('_', ' '),
          descricao: String(a.detalhes?.nome ?? a.detalhes?.email ?? 'Ação administrativa registrada'),
          data: a.criado_em,
        })),
      ].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()).slice(0, 40)

      const agora = Date.now()
      const umDia = 24 * 60 * 60 * 1000
      const seteDias = 7 * umDia
      return {
        eventos,
        cadastros24h: usuarios.filter((u) => agora - new Date(u.criado_em).getTime() <= umDia).length,
        cadastros7d: usuarios.filter((u) => agora - new Date(u.criado_em).getTime() <= seteDias).length,
        acoesAdmin: auditoria.length,
      }
    },
  })

  return (
    <div className="space-y-7">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--shapeos-brand)]">
            <Activity className="h-4 w-4" /> Atividade
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">Movimentação da plataforma</h1>
          <p className="mt-1 text-sm text-muted-foreground">Novos cadastros e decisões administrativas em uma única linha do tempo.</p>
        </div>
        <Button variant="outline" onClick={() => refetch()} disabled={isFetching} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} /> Atualizar
        </Button>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <Resumo titulo="Cadastros 24h" valor={data?.cadastros24h ?? 0} icon={<UserPlus className="h-5 w-5" />} />
        <Resumo titulo="Cadastros 7 dias" valor={data?.cadastros7d ?? 0} icon={<Users className="h-5 w-5" />} />
        <Resumo titulo="Ações administrativas" valor={data?.acoesAdmin ?? 0} icon={<ShieldCheck className="h-5 w-5" />} />
      </div>

      {isLoading ? (
        <div className="space-y-3">{[0,1,2,3,4].map((n) => <div key={n} className="h-20 rounded-2xl skeleton" />)}</div>
      ) : !data?.eventos.length ? (
        <Card className="border-dashed"><CardContent className="py-14 text-center text-muted-foreground"><Clock3 className="mx-auto mb-3 h-8 w-8" />Nenhuma atividade recente.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {data.eventos.map((evento) => (
            <Card key={evento.id}>
              <CardContent className="flex items-start gap-4 p-4">
                <div className={`grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl ${evento.tipo === 'cadastro' ? 'bg-[var(--shapeos-brand)]/10 text-[var(--shapeos-brand)]' : 'bg-warning/10 text-warning'}`}>
                  {evento.tipo === 'cadastro' ? <UserPlus className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold capitalize">{evento.titulo.toLowerCase()}</p>
                  <p className="mt-1 truncate text-sm text-muted-foreground">{evento.descricao}</p>
                </div>
                <div className="flex-shrink-0 text-right text-[11px] text-muted-foreground">
                  <p>{new Date(evento.data).toLocaleDateString('pt-BR')}</p>
                  <p className="mt-1">{new Date(evento.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function Resumo({ titulo, valor, icon }: { titulo: string; valor: number; icon: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">{icon}</div>
        <div><p className="text-2xl font-bold">{valor}</p><p className="text-xs text-muted-foreground">{titulo}</p></div>
      </CardContent>
    </Card>
  )
}
