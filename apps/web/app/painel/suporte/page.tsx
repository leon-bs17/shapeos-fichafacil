'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertCircle, CheckCircle2, Headphones, LifeBuoy, Loader2, Send, UserRound } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type Destino = 'PERSONAL' | 'SISTEMA'

type Solicitacao = {
  id: string
  destino: Destino
  assunto: string
  mensagem: string
  status: 'ABERTO' | 'EM_ATENDIMENTO' | 'RESOLVIDO'
  criado_em: string
}

const statusLabel: Record<Solicitacao['status'], string> = {
  ABERTO: 'Aberto',
  EM_ATENDIMENTO: 'Em atendimento',
  RESOLVIDO: 'Resolvido',
}

export default function SuporteAlunoPage() {
  const [destino, setDestino] = useState<Destino>('SISTEMA')
  const [personalId, setPersonalId] = useState<string | null>(null)
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([])
  const [assunto, setAssunto] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState(false)

  const carregar = useCallback(async () => {
    setCarregando(true)
    setErro(null)

    const supabase = createClient()
    const { data: authData, error: authError } = await supabase.auth.getUser()

    if (authError || !authData.user) {
      setErro('Sua sessão expirou. Entre novamente para acessar o suporte.')
      setCarregando(false)
      return
    }

    const [vinculo, chamados] = await Promise.all([
      supabase
        .from('personal_alunos')
        .select('personal_id')
        .eq('aluno_id', authData.user.id)
        .eq('status', 'ATIVO')
        .limit(1)
        .maybeSingle(),
      supabase
        .from('solicitacoes_suporte')
        .select('id,destino,assunto,mensagem,status,criado_em')
        .eq('aluno_id', authData.user.id)
        .order('criado_em', { ascending: false })
        .limit(30),
    ])

    if (vinculo.error || chamados.error) {
      setErro('Não foi possível carregar a central de suporte agora.')
      setCarregando(false)
      return
    }

    setPersonalId(vinculo.data?.personal_id ?? null)
    setSolicitacoes((chamados.data ?? []) as Solicitacao[])
    setCarregando(false)
  }, [])

  useEffect(() => {
    void carregar()
  }, [carregar])

  const podeEnviar = useMemo(() => {
    if (assunto.trim().length < 3 || mensagem.trim().length < 10) return false
    if (destino === 'PERSONAL' && !personalId) return false
    return !enviando
  }, [assunto, destino, enviando, mensagem, personalId])

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    setSucesso(false)

    if (!podeEnviar) return

    setEnviando(true)
    const supabase = createClient()
    const { data: authData, error: authError } = await supabase.auth.getUser()

    if (authError || !authData.user) {
      setErro('Sua sessão expirou. Entre novamente para enviar a solicitação.')
      setEnviando(false)
      return
    }

    const { error } = await supabase.from('solicitacoes_suporte').insert({
      aluno_id: authData.user.id,
      destino,
      personal_id: destino === 'PERSONAL' ? personalId : null,
      assunto: assunto.trim(),
      mensagem: mensagem.trim(),
    })

    if (error) {
      setErro(
        destino === 'PERSONAL' && !personalId
          ? 'Você ainda não possui um Personal vinculado.'
          : 'Não foi possível enviar sua solicitação. Tente novamente.'
      )
      setEnviando(false)
      return
    }

    setAssunto('')
    setMensagem('')
    setSucesso(true)
    setEnviando(false)
    await carregar()
  }

  return (
    <div className="space-y-8 pb-16">
      <section className="space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-primary">
          <LifeBuoy className="h-4 w-4" />
          Central de ajuda
        </div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Suporte</h1>
        <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
          Fale com seu Personal sobre o treino ou reporte problemas técnicos diretamente para o suporte do ShapeOS.
        </p>
      </section>

      {carregando ? (
        <div className="flex min-h-48 items-center justify-center rounded-2xl border border-border/40 bg-card/50">
          <Loader2 className="mr-2 h-5 w-5 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Carregando suporte...</span>
        </div>
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-2">
            <button
              type="button"
              onClick={() => personalId && setDestino('PERSONAL')}
              disabled={!personalId}
              className={`rounded-2xl border p-5 text-left transition-all ${
                destino === 'PERSONAL'
                  ? 'border-primary/50 bg-primary/10 ring-1 ring-primary/20'
                  : 'border-border/40 bg-card/70 hover:border-border'
              } ${!personalId ? 'cursor-not-allowed opacity-55' : ''}`}
            >
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <UserRound className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-semibold">Suporte ao Personal</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Dúvidas sobre exercícios, cargas, ficha ou orientação do seu treino.
                  </p>
                  {!personalId ? (
                    <p className="mt-3 flex items-center gap-1.5 text-xs text-amber-500">
                      <AlertCircle className="h-3.5 w-3.5" />
                      Nenhum Personal vinculado à sua conta.
                    </p>
                  ) : null}
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setDestino('SISTEMA')}
              className={`rounded-2xl border p-5 text-left transition-all ${
                destino === 'SISTEMA'
                  ? 'border-primary/50 bg-primary/10 ring-1 ring-primary/20'
                  : 'border-border/40 bg-card/70 hover:border-border'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Headphones className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-semibold">Suporte ao Sistema</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Login, sincronização, erros na tela, dados incorretos ou qualquer problema técnico.
                  </p>
                </div>
              </div>
            </button>
          </section>

          <section className="rounded-2xl border border-border/40 bg-card/70 p-5 sm:p-6">
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                {destino === 'PERSONAL' ? 'Mensagem para seu Personal' : 'Chamado para o ShapeOS'}
              </p>
              <h2 className="mt-1 text-xl font-semibold">Como podemos ajudar?</h2>
            </div>

            <form onSubmit={enviar} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="assunto" className="text-sm font-medium">Assunto</label>
                <input
                  id="assunto"
                  value={assunto}
                  onChange={(e) => setAssunto(e.target.value)}
                  maxLength={120}
                  placeholder={destino === 'PERSONAL' ? 'Ex.: dúvida sobre carga do supino' : 'Ex.: histórico não está carregando'}
                  className="h-11 w-full rounded-xl border border-border/50 bg-background/70 px-3 text-sm outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="mensagem" className="text-sm font-medium">Mensagem</label>
                <textarea
                  id="mensagem"
                  value={mensagem}
                  onChange={(e) => setMensagem(e.target.value)}
                  maxLength={2000}
                  rows={6}
                  placeholder="Descreva o que aconteceu ou sua dúvida com o máximo de detalhes possível."
                  className="w-full resize-y rounded-xl border border-border/50 bg-background/70 px-3 py-3 text-sm outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Mínimo de 10 caracteres</span>
                  <span>{mensagem.length}/2000</span>
                </div>
              </div>

              {erro ? (
                <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  {erro}
                </div>
              ) : null}

              {sucesso ? (
                <div className="flex items-start gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-500">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  Solicitação enviada com sucesso.
                </div>
              ) : null}

              <button
                type="submit"
                disabled={!podeEnviar}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45 sm:w-auto"
              >
                {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {enviando ? 'Enviando...' : 'Enviar solicitação'}
              </button>
            </form>
          </section>

          <section className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold">Minhas solicitações</h2>
              <p className="mt-1 text-sm text-muted-foreground">Acompanhe os chamados que você já abriu.</p>
            </div>

            {solicitacoes.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/60 bg-card/40 p-8 text-center text-sm text-muted-foreground">
                Você ainda não abriu nenhuma solicitação de suporte.
              </div>
            ) : (
              <div className="space-y-3">
                {solicitacoes.map((item) => (
                  <article key={item.id} className="rounded-2xl border border-border/40 bg-card/70 p-4 sm:p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-md bg-primary/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary">
                            {item.destino === 'PERSONAL' ? 'Personal' : 'Sistema'}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(item.criado_em))}
                          </span>
                        </div>
                        <h3 className="mt-2 font-semibold">{item.assunto}</h3>
                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.mensagem}</p>
                      </div>
                      <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium ${
                        item.status === 'RESOLVIDO'
                          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500'
                          : item.status === 'EM_ATENDIMENTO'
                            ? 'border-amber-500/30 bg-amber-500/10 text-amber-500'
                            : 'border-primary/25 bg-primary/10 text-primary'
                      }`}>
                        {statusLabel[item.status]}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}
