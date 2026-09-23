'use client'

import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Megaphone, Plus, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Input } from '@/components/ui/input'
import { SelectField } from '@/components/ui/select-field'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/toast'

type Nivel = 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR'
type Audiencia = 'TODOS' | 'PERSONAL' | 'ALUNO' | 'ADMIN'

function localDateTimeValue(date = new Date()) {
  const offset = date.getTimezoneOffset()
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16)
}

export default function BroadcastsPage() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [titulo, setTitulo] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [nivel, setNivel] = useState<Nivel>('INFO')
  const [audiencia, setAudiencia] = useState<Audiencia>('TODOS')
  const [inicio, setInicio] = useState(localDateTimeValue())
  const [fim, setFim] = useState('')
  const [ativo, setAtivo] = useState(true)
  const [salvando, setSalvando] = useState(false)

  const { data: broadcasts, isLoading } = useQuery({
    queryKey: ['admin-broadcasts'],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('broadcast_mensagens')
        .select('id,titulo,mensagem,nivel,audiencia,ativo,inicio,fim,criado_em')
        .order('criado_em', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })

  const ativos = useMemo(() => broadcasts?.filter((item) => item.ativo).length ?? 0, [broadcasts])

  async function criar() {
    if (titulo.trim().length < 2 || mensagem.trim().length < 2) {
      toast({ tone: 'warning', title: 'Preencha título e mensagem' })
      return
    }

    setSalvando(true)
    const supabase = createClient()
    const { data: auth } = await supabase.auth.getUser()
    const { error } = await supabase.from('broadcast_mensagens').insert({
      titulo: titulo.trim(),
      mensagem: mensagem.trim(),
      nivel,
      audiencia,
      ativo,
      inicio: new Date(inicio).toISOString(),
      fim: fim ? new Date(fim).toISOString() : null,
      criado_por: auth.user?.id,
    })
    setSalvando(false)

    if (error) {
      toast({ tone: 'danger', title: 'Broadcast não criado', description: error.message })
      return
    }

    setTitulo('')
    setMensagem('')
    setNivel('INFO')
    setAudiencia('TODOS')
    setInicio(localDateTimeValue())
    setFim('')
    setAtivo(true)
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['admin-broadcasts'] }),
      queryClient.invalidateQueries({ queryKey: ['product-topbar'] }),
    ])
    toast({ tone: 'success', title: 'Broadcast publicado', description: 'O aviso já pode aparecer para o público selecionado.' })
  }

  async function alternar(id: string, value: boolean) {
    const supabase = createClient()
    const { error } = await supabase.from('broadcast_mensagens').update({ ativo: value }).eq('id', id)
    if (error) {
      toast({ tone: 'danger', title: 'Não foi possível alterar o broadcast' })
      return
    }
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['admin-broadcasts'] }),
      queryClient.invalidateQueries({ queryKey: ['product-topbar'] }),
    ])
  }

  async function remover(id: string) {
    const supabase = createClient()
    const { error } = await supabase.from('broadcast_mensagens').delete().eq('id', id)
    if (error) {
      toast({ tone: 'danger', title: 'Não foi possível remover o broadcast' })
      return
    }
    await queryClient.invalidateQueries({ queryKey: ['admin-broadcasts'] })
    toast({ tone: 'success', title: 'Broadcast removido' })
  }

  return (
    <div className="space-y-7">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Comunicação</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em]">Broadcasts</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Avisos globais que aparecem no banner e no sino de notificações.
          </p>
        </div>
        <Badge tone={ativos > 0 ? 'success' : 'neutral'} dot={ativos > 0}>{ativos} ativo{ativos === 1 ? '' : 's'}</Badge>
      </header>

      <div className="grid gap-5 xl:grid-cols-[390px_minmax(0,1fr)]">
        <Card className="h-fit">
          <CardContent className="space-y-4 p-5">
            <div>
              <p className="text-sm font-semibold">Novo broadcast</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">Use warning e error apenas quando a mensagem realmente exigir atenção.</p>
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold text-muted-foreground">Título</label>
              <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex.: Fatura pendente" maxLength={100} />
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold text-muted-foreground">Mensagem</label>
              <Textarea value={mensagem} onChange={(e) => setMensagem(e.target.value)} placeholder="Escreva um aviso curto e objetivo." maxLength={600} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-2 block text-xs font-semibold text-muted-foreground">Nível</label>
                <SelectField value={nivel} onChange={(e) => setNivel(e.target.value as Nivel)}>
                  <option value="INFO">Informação</option>
                  <option value="SUCCESS">Sucesso</option>
                  <option value="WARNING">Warning</option>
                  <option value="ERROR">Erro</option>
                </SelectField>
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold text-muted-foreground">Público</label>
                <SelectField value={audiencia} onChange={(e) => setAudiencia(e.target.value as Audiencia)}>
                  <option value="TODOS">Todos</option>
                  <option value="PERSONAL">Personais</option>
                  <option value="ALUNO">Alunos</option>
                  <option value="ADMIN">Admins</option>
                </SelectField>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold text-muted-foreground">Início</label>
              <Input type="datetime-local" value={inicio} onChange={(e) => setInicio(e.target.value)} />
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold text-muted-foreground">Fim opcional</label>
              <Input type="datetime-local" value={fim} min={inicio} onChange={(e) => setFim(e.target.value)} />
            </div>

            <div className="flex items-center justify-between rounded-2xl bg-foreground/[0.025] px-4 py-3">
              <div>
                <p className="text-xs font-semibold">Publicar ativo</p>
                <p className="text-[11px] text-muted-foreground">Pode ser desligado depois.</p>
              </div>
              <Switch checked={ativo} onCheckedChange={setAtivo} label="Broadcast ativo" />
            </div>

            <Button onClick={() => void criar()} disabled={salvando} className="w-full">
              <Plus className="h-4 w-4" />
              {salvando ? 'Publicando...' : 'Publicar broadcast'}
            </Button>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          {isLoading ? (
            <div className="space-y-3 p-5">
              {[0, 1, 2].map((i) => <div key={i} className="h-24 skeleton" />)}
            </div>
          ) : broadcasts?.length ? (
            <div>
              {broadcasts.map((item) => (
                <div key={item.id} className="flex items-start gap-4 border-b border-border/60 p-5 last:border-0">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{item.titulo}</p>
                      <Badge tone={item.nivel === 'ERROR' ? 'danger' : item.nivel === 'WARNING' ? 'warning' : item.nivel === 'SUCCESS' ? 'success' : 'primary'}>{item.nivel}</Badge>
                      <Badge>{item.audiencia}</Badge>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.mensagem}</p>
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      {new Date(item.inicio).toLocaleString('pt-BR')}
                      {item.fim ? ` até ${new Date(item.fim).toLocaleString('pt-BR')}` : ' · sem data final'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={item.ativo} onCheckedChange={(value) => void alternar(item.id, value)} label={`Ativar ${item.titulo}`} />
                    <button type="button" onClick={() => void remover(item.id)} className="grid h-9 w-9 place-items-center rounded-xl text-muted-foreground transition hover:bg-destructive/8 hover:text-destructive" aria-label="Remover broadcast">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={Megaphone} title="Nenhum broadcast criado" description="Crie o primeiro aviso para testar a experiência de banner e notificações." />
          )}
        </Card>
      </div>
    </div>
  )
}
