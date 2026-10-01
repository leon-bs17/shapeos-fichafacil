'use client'

import { useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { BellRing, CheckCircle2, Megaphone, PauseCircle, Send, Trash2, Users } from 'lucide-react'

type Publico = 'TODOS' | 'PERSONAL' | 'ALUNO'
type Notificacao = {
  id: string
  titulo: string
  mensagem: string
  publico: Publico
  ativa: boolean
  criado_em: string
}

export default function AdminNotificacoesPage() {
  const queryClient = useQueryClient()
  const [titulo, setTitulo] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [publico, setPublico] = useState<Publico>('TODOS')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const { data: notificacoes, isLoading } = useQuery({
    queryKey: ['admin-notificacoes'],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('admin_notificacoes')
        .select('id, titulo, mensagem, publico, ativa, criado_em')
        .order('criado_em', { ascending: false })
      if (error) throw error
      return (data ?? []) as Notificacao[]
    },
  })

  async function publicar(e: FormEvent) {
    e.preventDefault()
    setErro(null)
    const tituloLimpo = titulo.trim()
    const mensagemLimpa = mensagem.trim()
    if (tituloLimpo.length < 3 || mensagemLimpa.length < 5) {
      setErro('Informe um título e uma mensagem válidos.')
      return
    }

    setSalvando(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setErro('Sessão administrativa expirada.')
      setSalvando(false)
      return
    }

    const { error } = await supabase.from('admin_notificacoes').insert({
      titulo: tituloLimpo,
      mensagem: mensagemLimpa,
      publico,
      criado_por: user.id,
      ativa: true,
    })

    if (error) {
      setErro('Não foi possível publicar o comunicado.')
    } else {
      setTitulo('')
      setMensagem('')
      setPublico('TODOS')
      await queryClient.invalidateQueries({ queryKey: ['admin-notificacoes'] })
    }
    setSalvando(false)
  }

  async function alternar(item: Notificacao) {
    const supabase = createClient()
    const { error } = await supabase.from('admin_notificacoes').update({ ativa: !item.ativa }).eq('id', item.id)
    if (!error) await queryClient.invalidateQueries({ queryKey: ['admin-notificacoes'] })
  }

  async function excluir(id: string) {
    if (!window.confirm('Excluir este comunicado?')) return
    const supabase = createClient()
    const { error } = await supabase.from('admin_notificacoes').delete().eq('id', id)
    if (!error) await queryClient.invalidateQueries({ queryKey: ['admin-notificacoes'] })
  }

  const ativas = notificacoes?.filter((n) => n.ativa).length ?? 0

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-[var(--shapeos-brand)]">
          <BellRing className="h-4 w-4" /> Comunicação
        </div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Notificações</h1>
        <p className="mt-1 text-sm text-muted-foreground">Crie e gerencie comunicados administrativos persistidos no ShapeOS.</p>
      </div>

      <div className="grid gap-5 xl:grid-cols-[.8fr_1.2fr]">
        <Card className="border-border bg-accent/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Megaphone className="h-4 w-4 text-[var(--shapeos-brand)]" /> Novo comunicado</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={publicar} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">Título</label>
                <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={120} placeholder="Ex.: Manutenção programada" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">Mensagem</label>
                <textarea
                  value={mensagem}
                  onChange={(e) => setMensagem(e.target.value)}
                  maxLength={1500}
                  rows={6}
                  placeholder="Escreva o comunicado..."
                  className="w-full resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none transition focus:border-[var(--shapeos-brand)]/60 focus:ring-2 focus:ring-[var(--shapeos-brand)]/15"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">Público</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['TODOS', 'PERSONAL', 'ALUNO'] as Publico[]).map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setPublico(item)}
                      className="rounded-xl px-3 py-2 text-xs font-medium transition"
                      style={{
                        background: publico === item ? 'rgba(34,199,199,.12)' : 'rgba(var(--shapeos-neutral-rgb),.03)',
                        border: publico === item ? '1px solid rgba(34,199,199,.35)' : '1px solid rgba(var(--shapeos-neutral-rgb),.07)',
                        color: publico === item ? 'var(--shapeos-brand)' : '#71717a',
                      }}
                    >
                      {item === 'TODOS' ? 'Todos' : item === 'PERSONAL' ? 'Personais' : 'Alunos'}
                    </button>
                  ))}
                </div>
              </div>
              {erro && <p role="alert" className="text-sm text-red-300">{erro}</p>}
              <Button type="submit" disabled={salvando} className="w-full gap-2">
                <Send className="h-4 w-4" /> {salvando ? 'Publicando...' : 'Publicar comunicado'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-border bg-accent/50">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-base">Comunicados publicados</CardTitle>
              <span className="rounded-full bg-[var(--shapeos-brand)]/10 px-3 py-1 text-xs text-[var(--shapeos-brand)]">{ativas} ativo(s)</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <div className="h-48 rounded-2xl skeleton" />
            ) : !notificacoes?.length ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                <BellRing className="mx-auto mb-3 h-7 w-7" /> Nenhum comunicado publicado.
              </div>
            ) : (
              notificacoes.map((item) => (
                <div key={item.id} className="rounded-2xl border border-border bg-black/10 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-foreground">{item.titulo}</h3>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${item.ativa ? 'bg-emerald-400/10 text-emerald-300' : 'bg-zinc-500/10 text-muted-foreground'}`}>
                          {item.ativa ? 'ATIVO' : 'PAUSADO'}
                        </span>
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{item.mensagem}</p>
                      <div className="mt-3 flex items-center gap-3 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {item.publico}</span>
                        <span>{new Date(item.criado_em).toLocaleString('pt-BR')}</span>
                      </div>
                    </div>
                    <div className="flex flex-shrink-0 gap-1">
                      <button onClick={() => alternar(item)} className="rounded-lg p-2 text-muted-foreground hover:bg-accent/50 hover:text-[var(--shapeos-brand)]" title={item.ativa ? 'Pausar' : 'Reativar'}>
                        {item.ativa ? <PauseCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                      </button>
                      <button onClick={() => excluir(item.id)} className="rounded-lg p-2 text-muted-foreground hover:bg-red-400/[.06] hover:text-red-300" title="Excluir">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
