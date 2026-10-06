'use client'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Bell, CheckCircle2, Clock3, Database, Dumbbell, FileText, Info, ListChecks, LockKeyhole, RefreshCw, XCircle } from 'lucide-react'
type Check = {
  nome: string
  detalhe: string
  ok: boolean
}

export default function AdminSistemaPage() {
  const { data, isLoading, refetch, isFetching, error } = useQuery({
    queryKey: ['admin-system-health'],
    refetchInterval: 60_000,
    queryFn: async () => {
      const supabase = createClient()
      const inicio = performance.now()
      const auth = await supabase.auth.getUser()
      const [usuarios, exercicios, auditoria, notificacoes] = await Promise.all([
        supabase.from('usuarios').select('id', { count: 'exact', head: true }),
        supabase.from('exercicios').select('id', { count: 'exact', head: true }),
        supabase.from('admin_auditoria').select('id', { count: 'exact', head: true }),
        supabase.from('admin_notificacoes').select('id', { count: 'exact', head: true }),
      ])
      const latencia = Math.round(performance.now() - inicio)

      const checks: Check[] = [
        {
          nome: 'Autenticação',
          detalhe: auth.data.user ? 'Sessão administrativa válida' : 'Sessão não encontrada',
          ok: !auth.error && !!auth.data.user,
        },
        {
          nome: 'Banco principal',
          detalhe: usuarios.error ? usuarios.error.message : `${usuarios.count ?? 0} usuários acessíveis`,
          ok: !usuarios.error,
        },
        {
          nome: 'Biblioteca de exercícios',
          detalhe: exercicios.error ? exercicios.error.message : `${exercicios.count ?? 0} exercícios disponíveis`,
          ok: !exercicios.error,
        },
        {
          nome: 'Auditoria administrativa',
          detalhe: auditoria.error ? auditoria.error.message : `${auditoria.count ?? 0} evento(s) registrado(s)`,
          ok: !auditoria.error,
        },
        {
          nome: 'Central de notificações',
          detalhe: notificacoes.error ? notificacoes.error.message : `${notificacoes.count ?? 0} comunicado(s) registrado(s)`,
          ok: !notificacoes.error,
        },
      ]

      return {
        checks,
        latencia,
        saudavel: checks.every((item) => item.ok),
        verificadoEm: new Date().toISOString(),
      }
    },
  })

  const icons = [LockKeyhole, Database, Dumbbell, FileText, Bell]
  const hora = (v: string) => new Date(v).toLocaleTimeString('pt-BR', {timeZone:'America/Fortaleza'})
  return (
    <div className="system-workspace">
      <section className="hero"><div className="hero-copy"><p className="eyebrow">Operação</p><h1>Sistema e <span>serviços</span></h1><p>Acompanhe os diagnósticos dos serviços usados pelo painel administrativo.</p></div>
        <svg className="wireframe" viewBox="0 0 520 300" aria-hidden="true"><g fill="none" stroke="currentColor" strokeWidth=".7">
          {Array.from({length:12},(_,i)=><g key={'grid'+i} opacity=".25"><path d={`M ${i*46-90} 300 l 430 -245 M ${i*46} 45 l 430 245`}/></g>)}
          {[{x:230,y:80,w:70,h:100},{x:310,y:55,w:85,h:110},{x:150,y:115,w:76,h:85},{x:280,y:155,w:70,h:90},{x:380,y:132,w:70,h:82},{x:218,y:205,w:60,h:70}].map((c,i)=><g key={i}>
            <path d={`M ${c.x} ${c.y} l ${c.w} -${c.w/2} l ${c.w} ${c.w/2} l -${c.w} ${c.w/2} Z M ${c.x} ${c.y} v ${c.h} l ${c.w} ${c.w/2} l ${c.w} -${c.w/2} v -${c.h} M ${c.x+c.w} ${c.y+c.w/2} v ${c.h}`}/>
            {[1,2,3].map(j=><path key={j} opacity=".6" d={`M ${c.x} ${c.y+c.h*j/4} l ${c.w} ${c.w/2} l ${c.w} -${c.w/2} M ${c.x+c.w*j/4} ${c.y+c.w*j/8} v ${c.h} M ${c.x+c.w+c.w*j/4} ${c.y+c.w/2-c.w*j/8} v ${c.h}`}/>)}
          </g>)}
        </g></svg>
      </section>
      {error ? <div className="error" role="alert">Leitura do diagnóstico indisponível. <button onClick={()=>refetch()}>Tentar novamente</button></div> : isLoading || !data ? <div className="h-64 rounded-3xl skeleton" role="status" aria-label="Verificando serviços"/> : <>
        <section className={data.saudavel?'status-bar':'status-bar failure'} aria-live="polite">
          <div className="status-copy">{data.saudavel?<CheckCircle2 size={43} strokeWidth={1.6}/>:<XCircle size={43} strokeWidth={1.6}/>}<div><h2>{data.saudavel?'Serviços operacionais':'Há serviços com falha'}</h2><p>Última verificação: {hora(data.verificadoEm)}</p></div></div>
          <span className="latency">Diagnóstico: <strong>{data.latencia.toLocaleString('pt-BR')} ms</strong></span>
          <button className="verify" onClick={()=>refetch()} disabled={isFetching}><RefreshCw size={17} className={isFetching?'animate-spin':''}/>{isFetching?'Verificando...':'Verificar agora'}</button>
        </section>
        <div className="services">{data.checks.map((check,i)=>{const Icon=icons[i]??FileText;return <section className="service" key={check.nome}>
          <header><Icon size={29} strokeWidth={1.6}/><span className={check.ok?'badge':'badge unavailable'}><i/>{check.ok?'Disponível':'Indisponível'}</span></header>
          <h3>{check.nome}</h3><p>{check.detalhe}</p><footer><Clock3 size={14}/>Verificado às {hora(data.verificadoEm)}</footer>
        </section>})}<section className="service scope"><Info size={29} strokeWidth={1.6}/><h3>Escopo do diagnóstico</h3><p>Consulta de sessão e leitura dos dados administrativos.</p></section></div>
        <section className="validation"><div className="validation-intro"><div className="validation-icon"><ListChecks size={30}/></div><div><h2>O que esta tela verifica</h2><p>Disponibilidade de acesso aos serviços usados pelo painel administrativo.</p></div></div><ul>{['Sessão administrativa','Leitura das tabelas principais','Disponibilidade da auditoria','Consulta de notificações'].map(label=><li key={label}><CheckCircle2 size={18}/>{label}</li>)}</ul></section>
      </>}
      <style jsx>{`
        .system-workspace { --surface:#fcfdf9; --border:#d7ded3; --text:#162623; --muted:#5f6f68; --accent:#129b89; display:grid; gap:18px; padding-bottom:24px; min-width:0; }
        :global(.dark) .system-workspace { --surface:#071b17; --border:#1a4439; --text:#f5f9f7; --muted:#a6c2cc; --accent:#00e9df; }
        :global(.dark [data-admin-route="/admin/sistema"]) { background:#041512!important; --shapeos-brand:#00e9df; }
        .hero { position:relative; overflow:hidden; min-height:225px; display:flex; align-items:center; padding:34px 36px; border:1px solid var(--border); border-radius:17px; background:var(--surface); }
        :global(.dark) .hero { background:radial-gradient(ellipse at 83% 65%,#07342a,#071b17 45%,#041512); }
        .hero-copy { z-index:2; position:relative; max-width:68%; } .eyebrow { display:inline-block; border:1px solid var(--accent); border-radius:99px; padding:6px 16px; font-size:10px!important; letter-spacing:.1em; font-weight:650; color:var(--accent)!important; text-transform:uppercase; margin-bottom:17px; }
        h1 { font-size:clamp(30px,3.3vw,47px); line-height:1.14; color:var(--text); letter-spacing:-.045em; font-weight:800; } h1 span { color:var(--accent); } .hero-copy>p:last-child { margin-top:13px; color:var(--muted); font-size:14px; line-height:1.7; } .wireframe { position:absolute; width:520px; height:300px; top:-30px; right:-30px; color:var(--accent); opacity:.65; }
        .status-bar { display:flex; gap:19px; align-items:center; border:1px solid var(--border); border-radius:13px; background:var(--surface); padding:18px; } .status-copy { display:flex; align-items:center; gap:17px; margin-right:auto; } .status-copy> :global(svg) { color:var(--accent); flex-shrink:0; } h2 { font-size:15px; font-weight:650; color:var(--text); } .status-copy p { font-size:12px; color:var(--muted); margin-top:5px; } .latency { border:1px solid var(--border); padding:9px 13px; border-radius:9px; font-size:11px; color:var(--muted); white-space:nowrap; } .latency strong { color:var(--text); }
        button { cursor:pointer; } button:disabled { cursor:default; opacity:.55; } button:focus-visible { outline:2px solid var(--accent); outline-offset:3px; } .verify { display:flex; gap:10px; align-items:center; justify-content:center; border-radius:10px; padding:12px 18px; background:var(--accent); color:#002c25; font-size:12px; font-weight:600; min-height:44px; white-space:nowrap; }
        .failure { border-color:#b75543; } .failure .status-copy> :global(svg) { color:#c76a54; } .services { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:16px; }
        .service { min-width:0; border:1px solid var(--border); border-radius:13px; padding:21px; background:var(--surface); } .service header { display:flex; align-items:center; justify-content:space-between; gap:12px; color:var(--accent); margin-bottom:13px; } .badge { display:inline-flex; align-items:center; gap:6px; color:var(--accent); border:1px solid var(--accent); font-size:10px; border-radius:9px; padding:6px 9px; } .badge i { width:6px; height:6px; background:currentColor; border-radius:50%; } .unavailable { color:#c76a54; border-color:#c76a54; }
        h3 { color:var(--text); font-size:15px; font-weight:650; margin-bottom:7px; } .service p { color:var(--muted); font-size:12px; line-height:1.7; overflow-wrap:anywhere; } footer { display:flex; gap:8px; align-items:center; margin-top:14px; padding-top:12px; border-top:1px solid var(--border); color:var(--muted); font-size:10px; }
        .scope> :global(svg) { color:var(--muted); margin-bottom:13px; } .validation { display:flex; gap:27px; align-items:center; padding:21px; border:1px solid var(--border); border-radius:13px; background:var(--surface); } .validation-intro { display:flex; gap:20px; align-items:center; flex:1; } .validation-icon { display:grid; place-items:center; width:55px; height:65px; flex-shrink:0; border-radius:10px; border:1px solid var(--border); color:var(--accent); } .validation p { font-size:11px; color:var(--muted); line-height:1.7; margin-top:5px; max-width:360px; } ul { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:15px 22px; flex:1; border-left:1px solid var(--border); padding-left:27px; } li { display:flex; gap:9px; align-items:center; font-size:11px; color:var(--muted); } li> :global(svg) { color:var(--accent); flex-shrink:0; } .error { padding:25px; border:1px solid #b75543; border-radius:13px; color:var(--text); } .error button { color:var(--accent); text-decoration:underline; }
        @media(max-width:1000px) { .services { grid-template-columns:repeat(2,minmax(0,1fr)); } .status-bar { flex-wrap:wrap; } .status-copy { flex-basis:100%; } .latency { margin-right:auto; } .validation { flex-direction:column; align-items:stretch; } ul { border-left:0; border-top:1px solid var(--border); padding:18px 0 0; } .hero-copy { max-width:85%; } .wireframe { right:-150px; opacity:.25; } }
        @media(max-width:600px) { .hero { padding:27px 22px; min-height:220px; } .hero-copy { max-width:100%; } .wireframe { right:-260px; opacity:.15; } .services { grid-template-columns:minmax(0,1fr); } .status-bar { padding:16px; gap:13px; } .status-copy { gap:12px; } .status-copy> :global(svg) { width:34px; } .verify { flex:1; font-size:11px; padding:11px; } .latency { font-size:10px; padding:9px; } ul { grid-template-columns:1fr; } .service { padding:19px; } }

        :global(html:not(.dark)) .verify { color:#fff; }
        :global(html:not(.dark)) .verify:hover { background:#0d7e70; }
        :global(html:not(.dark)) .wireframe { color:#008d85; }
        :global(html:not(.dark)) .badge:not(.unavailable) { color:#0d7e70; background:#e4f3eb; border-color:#129b89; }
      `}</style>
    </div>
  )
}
