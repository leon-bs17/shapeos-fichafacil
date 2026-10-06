'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { UserCheck, Search, Users, ChevronDown, ChevronRight, Mail, Calendar, Dumbbell } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { formatarData } from '@/lib/utils'

interface PersonalComAlunos {
  id: string
  nome: string
  email: string
  criado_em: string
  total_alunos: number
  total_treinos: number
  alunos: { id: string; nome: string; email: string; status: string; vinculo_desde: string }[]
}

export default function AdminPersonaisPage() {
  return <PersonaisConteudo />
}

function PersonaisConteudo() {
  const [busca, setBusca] = useState('')
  const [expandido, setExpandido] = useState<string | null>(null)

  const { data: personais, isLoading } = useQuery({
    queryKey: ['admin-personais'],
    queryFn: async () => {
      const supabase = createClient()

      const { data: usuarios } = await supabase
        .from('usuarios')
        .select('id, nome, email, criado_em')
        .eq('tipo', 'PERSONAL')
        .order('criado_em', { ascending: false })

      if (!usuarios) return []

      const result: PersonalComAlunos[] = []

      for (const u of usuarios) {
        const { data: vinculos } = await supabase
          .from('personal_alunos')
          .select('aluno_id, status, criado_em')
          .eq('personal_id', u.id)

        const alunoIds = vinculos?.map((v) => v.aluno_id) ?? []

        let alunos: PersonalComAlunos['alunos'] = []
        if (alunoIds.length > 0) {
          const { data: alunosData } = await supabase
            .from('usuarios')
            .select('id, nome, email')
            .in('id', alunoIds)

          alunos = (alunosData ?? []).map((a) => {
            const vinculo = vinculos?.find((v) => v.aluno_id === a.id)
            return {
              id: a.id,
              nome: a.nome,
              email: a.email,
              status: vinculo?.status ?? 'ATIVO',
              vinculo_desde: vinculo?.criado_em ?? '',
            }
          })
        }

        const { count: totalTreinos } = await supabase
          .from('treinos')
          .select('id', { count: 'exact', head: true })
          .eq('personal_id', u.id)

        result.push({
          id: u.id,
          nome: u.nome,
          email: u.email,
          criado_em: u.criado_em,
          total_alunos: alunos.length,
          total_treinos: totalTreinos ?? 0,
          alunos,
        })
      }

      return result
    },
  })

  const filtrados = personais?.filter((p) =>
    busca === '' ||
    p.nome?.toLowerCase().includes(busca.toLowerCase()) ||
    p.email?.toLowerCase().includes(busca.toLowerCase())
  )

  return (
    <div className="personals-workspace space-y-5">
      <header className="personals-hero">
        <div className="personals-hero-copy"><p className="eyebrow">Gestão</p>
        <h1>Gestão de <span>personais</span></h1>
        <p className="personals-subtitle">
          Personal trainers e seus respectivos alunos.
        </p></div>
        <PersonalWireframe />
      </header>

      <div className="personals-stats grid grid-cols-3 gap-3">
        <Card className="personals-stat">
          <CardContent className="p-4"><div className="personals-stat-icon"><UserCheck size={20} /></div><div>
            <p className="text-2xl font-bold">{personais?.length ?? 0}</p>
            <p className="text-xs text-muted-foreground">Personais ativos</p>
          </div></CardContent>
        </Card>
        <Card className="personals-stat">
          <CardContent className="p-4"><div className="personals-stat-icon"><Users size={20} /></div><div>
            <p className="text-2xl font-bold">{personais?.reduce((acc, p) => acc + p.total_alunos, 0) ?? 0}</p>
            <p className="text-xs text-muted-foreground">Total de alunos</p>
          </div></CardContent>
        </Card>
        <Card className="personals-stat">
          <CardContent className="p-4"><div className="personals-stat-icon"><Dumbbell size={20} /></div><div>
            <p className="text-2xl font-bold">{personais?.reduce((acc, p) => acc + p.total_treinos, 0) ?? 0}</p>
            <p className="text-xs text-muted-foreground">Total de treinos</p>
          </div></CardContent>
        </Card>
      </div>

      <div className="personals-search relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          aria-label="Buscar personal por nome ou e-mail"
          placeholder="Buscar personal por nome ou e-mail..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="pl-9 h-11"
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => <div key={i} className="h-20 skeleton" />)}
        </div>
      ) : filtrados?.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <UserCheck className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="font-semibold">Nenhum personal encontrado</p>
          </CardContent>
        </Card>
      ) : (
        <div className="personals-list space-y-3">
          {filtrados?.map((p) => (
            <Card key={p.id} className="personal-card overflow-hidden">
              <button
                onClick={() => setExpandido(expandido === p.id ? null : p.id)}
                className="personal-toggle w-full text-left"
                aria-expanded={expandido === p.id}
                aria-controls={`personal-alunos-${p.id}`}
              >
                <CardContent className="p-4 hover:bg-muted/30 transition-colors">
                  <div className="personal-summary flex items-center gap-4">
                    <div className="personal-avatar flex h-10 w-10 items-center justify-center rounded-full bg-success/10 text-sm font-bold text-success">
                      {p.nome?.charAt(0)?.toUpperCase() ?? '?'}
                    </div>
                    <div className="personal-identity flex-1 min-w-0">
                      <p className="font-semibold truncate">{p.nome}</p>
                      <p className="text-muted-foreground text-xs flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {p.email}
                      </p>
                    </div>
                    <div className="personal-counts flex items-center gap-6 text-sm">
                      <div className="text-center">
                        <p className="font-bold text-lg">{p.total_alunos}</p>
                        <p className="text-xs text-muted-foreground">alunos</p>
                      </div>
                      <div className="text-center">
                        <p className="font-bold text-lg">{p.total_treinos}</p>
                        <p className="text-xs text-muted-foreground">treinos</p>
                      </div>
                    </div>
                    <div className="text-muted-foreground">
                      {expandido === p.id ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                    </div>
                  </div>
                </CardContent>
              </button>

              {expandido === p.id && p.alunos.length > 0 && (
                <div id={`personal-alunos-${p.id}`} className="border-t border-border bg-muted/20 p-4">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Alunos vinculados</p>
                  <div className="space-y-2">
                    {p.alunos.map((a) => (
                      <div key={a.id} className="personal-student flex items-center justify-between rounded-xl bg-card border border-border p-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-info/10 text-xs font-bold text-info">
                            {a.nome?.charAt(0)?.toUpperCase() ?? '?'}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{a.nome}</p>
                            <p className="text-xs text-muted-foreground">{a.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            a.status === 'ATIVO'
                              ? 'bg-success/10 text-success'
                              : 'bg-muted text-muted-foreground'
                          }`}>
                            {a.status}
                          </span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatarData(a.vinculo_desde)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {expandido === p.id && p.alunos.length === 0 && (
                <div id={`personal-alunos-${p.id}`} className="border-t border-border bg-muted/20 p-4 text-center">
                  <p className="text-sm text-muted-foreground">Nenhum aluno vinculado</p>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <style jsx global>{`
        .personals-workspace { --personal-surface:#fcfdf9; --personal-border:#d7ded3; --personal-muted:#5f6f68; --personal-ink:#162623; --personal-brand:#129b89; font-family:'Sora',sans-serif; min-width:0; }
        html.dark .personals-workspace { --personal-surface:#091d18; --personal-border:#24453b; --personal-muted:#A3BECD; --personal-ink:#F5FAF9; --personal-brand:#00E9DF; }
        .personals-workspace .personals-hero { position:relative; isolation:isolate; overflow:hidden; border:1px solid var(--personal-border); border-radius:18px; min-height:224px; padding:32px 40px; background:radial-gradient(ellipse at 90% 50%,#e4f3eb,transparent 65%),#fcfdf9; }
        html.dark .personals-workspace .personals-hero { background:radial-gradient(ellipse at 84% 60%,#073d32,#071d18 48%,#041512); }
        .personals-workspace .personals-hero-copy { position:relative; z-index:1; max-width:70%; }
        .personals-workspace .eyebrow { display:inline-flex; border:1px solid var(--personal-brand); border-radius:999px; padding:6px 16px; margin-bottom:17px; color:var(--personal-brand); font-size:10px; font-weight:650; letter-spacing:.1em; text-transform:uppercase; }
        .personals-workspace .personals-hero h1 { color:var(--personal-ink); font-size:46px; font-weight:800; line-height:1.12; letter-spacing:-.045em; }
        .personals-workspace .personals-hero h1 span { color:var(--personal-brand); }
        .personals-workspace .personals-subtitle { color:var(--personal-muted)!important; -webkit-text-fill-color:currentColor; font-size:16px; font-weight:400; line-height:1.6; margin-top:13px; }
        .personals-workspace .personal-wireframe { position:absolute; right:-12px; top:50%; transform:translateY(-50%); width:37%; max-width:470px; height:auto; color:var(--personal-brand); pointer-events:none; }
        .personals-workspace .personals-stat { border:1px solid var(--personal-border); border-radius:14px; background:var(--personal-surface); box-shadow:none; }
        .personals-workspace .personals-stat > div { display:flex; align-items:center; gap:14px; padding:19px 20px; }
        .personals-workspace .personals-stat-icon { width:42px; height:42px; display:grid; place-items:center; flex-shrink:0; border-radius:12px; color:var(--personal-brand); background:rgba(0,141,133,.1); }
        .personals-workspace .personals-stat p:first-child { color:var(--personal-ink); font-size:26px; font-weight:750; }
        .personals-workspace .personals-stat p:last-child { color:var(--personal-muted); line-height:1.5; }
        .personals-workspace .personals-search input { border:1px solid var(--personal-border); border-radius:10px; background:var(--personal-surface); color:var(--personal-ink); box-shadow:none; }
        .personals-workspace .personals-search input::placeholder { color:var(--personal-muted); }
        .personals-workspace .personal-card { border:1px solid var(--personal-border); border-radius:14px; background:var(--personal-surface); box-shadow:none; }
        .personals-workspace .personal-toggle > div { padding:19px 20px; }
        .personals-workspace .personal-toggle:hover { background:rgba(0,141,133,.045); }
        .personals-workspace .personal-avatar { color:var(--personal-brand); background:rgba(0,141,133,.12); font-weight:700; }
        .personals-workspace .personal-identity > p:first-child { color:var(--personal-ink); font-size:14px; }
        .personals-workspace .personal-identity > p:last-child { color:var(--personal-muted); font-size:11px; margin-top:4px; overflow-wrap:anywhere; }
        .personals-workspace .personal-identity svg { flex-shrink:0; }
        .personals-workspace .personal-counts { gap:0; flex-shrink:0; }
        .personals-workspace .personal-counts > div { min-width:80px; padding:0 18px; }
        .personals-workspace .personal-counts > div + div { border-left:1px solid var(--personal-border); }
        .personals-workspace .personal-counts p:first-child { color:var(--personal-ink); font-size:20px; font-weight:700; }
        .personals-workspace .personal-counts p:last-child { color:var(--personal-muted); font-size:11px; }
        .personals-workspace .personal-student { border-color:var(--personal-border); background:var(--personal-surface); gap:12px; }
        .personals-workspace .personal-student > div:first-child { min-width:0; }
        .personals-workspace .personal-student p { overflow-wrap:anywhere; }
        .personals-workspace button:focus-visible,.personals-workspace input:focus-visible { outline:2px solid var(--personal-brand); outline-offset:3px; }
        @media(max-width:767px) {
          .personals-workspace .personals-hero { min-height:220px; padding:27px 22px; }
          .personals-workspace .personals-hero-copy { max-width:100%; }
          .personals-workspace .personals-hero h1 { font-size:32px; }
          .personals-workspace .personals-subtitle { font-size:14px; }
          .personals-workspace .personal-wireframe { width:290px; right:-120px; opacity:.16; z-index:-1; }
          .personals-workspace .personals-stats { gap:8px; }
          .personals-workspace .personals-stat > div { flex-direction:column; align-items:flex-start; gap:10px; padding:14px 10px; }
          .personals-workspace .personals-stat-icon { width:30px; height:30px; border-radius:9px; }
          .personals-workspace .personals-stat-icon svg { width:16px; height:16px; }
          .personals-workspace .personals-stat p:first-child { font-size:24px; }
          .personals-workspace .personals-stat p:last-child { font-size:10px; }
          .personals-workspace .personal-toggle > div { padding:17px; }
          .personals-workspace .personal-summary { display:grid; grid-template-columns:40px minmax(0,1fr) 20px; gap:12px; }
          .personals-workspace .personal-identity > p:first-child { white-space:normal; overflow:visible; }
          .personals-workspace .personal-identity > p:last-child { font-size:10px; }
          .personals-workspace .personal-counts { grid-row:2; grid-column:1/-1; justify-content:flex-start; border-top:1px solid var(--personal-border); padding-top:12px; }
          .personals-workspace .personal-counts > div { min-width:70px; padding:0 20px; text-align:left; }
          .personals-workspace .personal-counts > div:first-child { padding-left:0; }
          .personals-workspace .personal-summary > div:last-child { grid-column:3; grid-row:1; }
          .personals-workspace .personal-student { flex-direction:column; align-items:stretch; }
          .personals-workspace .personal-student > div:last-child { flex-wrap:wrap; padding-left:44px; }
        }

        html:not(.dark) .personals-workspace .personals-hero h1 { color:#112b2a; }
        html:not(.dark) .personals-workspace .personals-hero h1 span,
        html:not(.dark) .personals-workspace .personal-wireframe { color:#008d85; }
        html:not(.dark) .personals-workspace .personals-subtitle { color:#53717e!important; }
        html:not(.dark) .personals-workspace .personals-search input::placeholder { color:#7b8983; }
        html:not(.dark) .personals-workspace .personals-stat-icon,
        html:not(.dark) .personals-workspace .personal-avatar { background:#e4f3eb; color:#0d7e70; }
        html:not(.dark) .personals-workspace .personal-toggle:hover { background:#eef1e9; }
      `}</style>
    </div>
  )
}

function PersonalWireframe() {
  const curve = (offset: number) => Array.from({ length: 65 }, (_, i) => {
    const x = 12 + i * 7
    const wave = Math.sin(i / 64 * Math.PI * 2.5 + offset)
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${(120 + wave * 63).toFixed(1)}`
  }).join(' ')
  return (
    <svg className="personal-wireframe" viewBox="0 0 480 240" fill="none" aria-hidden="true" focusable="false">
      <g stroke="currentColor" strokeWidth=".7" opacity=".27">
        {Array.from({ length: 20 }, (_, i) => <path key={i} d={curve(i * .075)} />)}
        {Array.from({ length: 25 }, (_, i) => {
          const x = 12 + i * 18
          const phase = i / 25 * Math.PI * 2.5
          return <path key={i} d={`M${x} ${120 + Math.sin(phase) * 63}Q${x + 8} 120 ${x} ${120 + Math.sin(phase + 1.425) * 63}`} />
        })}
      </g>
      <path d={curve(0)} stroke="currentColor" strokeWidth="1" opacity=".55" />
      <path d={curve(1.425)} stroke="currentColor" strokeWidth="1" opacity=".45" />
      {[{x:40,y:150},{x:110,y:62},{x:204,y:125},{x:295,y:169},{x:397,y:85}].map((p,i) => (
        <g key={i}><circle cx={p.x} cy={p.y} r="7" fill="var(--personal-surface)" stroke="currentColor" strokeOpacity=".5" /><circle cx={p.x} cy={p.y} r="3" fill="currentColor" opacity=".65" /></g>
      ))}
    </svg>
  )
}
