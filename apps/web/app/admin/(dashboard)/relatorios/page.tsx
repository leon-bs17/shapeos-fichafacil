'use client'
import { useEffect, useId, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Check, ChevronDown, ChevronUp, Clock3, BarChart3, CalendarDays, Download, Dumbbell, FileCheck2, FileText, GraduationCap, RefreshCw, UserCheck, Users } from 'lucide-react'
type Usuario = {
  id: string
  nome: string
  email: string
  tipo: 'ADMIN' | 'PERSONAL' | 'ALUNO'
  status_conta: 'ATIVO' | 'PENDENTE' | 'BLOQUEADO'
  criado_em: string
}

function csvValor(valor: unknown) {
  const texto = valor == null ? '' : String(valor)
  return `"${texto.replaceAll('"', '""')}"`
}

function baixarCsv(nome: string, linhas: unknown[][]) {
  const csv = linhas.map((linha) => linha.map(csvValor).join(',')).join('\n')
  const blob = new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = nome
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}


const DIA = 86400000
function variacao(atual: number, anterior: number) {
  if (!anterior) return atual ? 'Novo' : '0%'
  const v = Math.round((atual - anterior) / anterior * 100)
  return (v > 0 ? '+' : '') + v + '%'
}
export default function AdminRelatoriosPage() {

  useEffect(() => {
    const html = document.documentElement
    const theme = () => html.classList.contains('dark') ? 'dark' : 'light'
    let previousTheme = theme()
    let frame = 0
    let suppression: HTMLStyleElement | null = null
    const restore = () => { suppression?.remove(); suppression = null }
    const observer = new MutationObserver(() => {
      const nextTheme = theme()
      if (nextTheme === previousTheme) return
      previousTheme = nextTheme
      cancelAnimationFrame(frame)
      restore()
      suppression = document.createElement('style')
      suppression.textContent = '.reports-workspace.reports-workspace.reports-workspace.reports-workspace.reports-workspace.reports-workspace.reports-workspace.reports-workspace.reports-workspace.reports-workspace.reports-workspace.reports-workspace * { transition:none!important; }'
      document.head.appendChild(suppression)
      const workspace = document.querySelector('.reports-workspace')
      if (workspace) window.getComputedStyle(workspace).backgroundColor
      frame = requestAnimationFrame(() => { frame = requestAnimationFrame(restore) })
    })
    observer.observe(html, { attributes:true, attributeFilter:['class'] })
    return () => { observer.disconnect(); cancelAnimationFrame(frame); restore() }
  }, [])

  const [dias, setDias] = useState(30)
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['admin-relatorios'],
    queryFn: async () => {
      const supabase = createClient()
      const [usuariosR, treinosR, vinculosR, exerciciosR, execucoesR] = await Promise.all([
        supabase.from('usuarios').select('id, nome, email, tipo, status_conta, criado_em').order('criado_em', { ascending: false }),
        supabase.from('treinos').select('id, ativo, criado_em'),
        supabase.from('personal_alunos').select('id, status, criado_em'),
        supabase.from('exercicios').select('id', { count: 'exact', head: true }),
        supabase.from('registro_execucao').select('id, data_registro'),
      ])

      const falha = usuariosR.error || treinosR.error || vinculosR.error || exerciciosR.error || execucoesR.error
      if (falha) throw falha

      const usuarios = (usuariosR.data ?? []) as Usuario[]
      const agora = Date.now()
      const ultimos30 = usuarios.filter((u) => agora - new Date(u.criado_em).getTime() <= 30 * 86_400_000).length
      const execucoes30 = (execucoesR.data ?? []).filter((e) => agora - new Date(e.data_registro).getTime() <= 30 * 86_400_000).length

      return {
        usuarios,
        registrosTreinos: (treinosR.data ?? []) as { id: string; ativo: boolean; criado_em: string }[],
        registrosExecucoes: (execucoesR.data ?? []) as { id: string; data_registro: string }[],
        totalUsuarios: usuarios.length,
        personals: usuarios.filter((u) => u.tipo === 'PERSONAL').length,
        alunos: usuarios.filter((u) => u.tipo === 'ALUNO').length,
        pendentes: usuarios.filter((u) => u.status_conta === 'PENDENTE').length,
        novos30: ultimos30,
        treinos: (treinosR.data ?? []).length,
        treinosAtivos: (treinosR.data ?? []).filter((t) => t.ativo).length,
        vinculosAtivos: (vinculosR.data ?? []).filter((v) => v.status === 'ATIVO').length,
        exercicios: exerciciosR.count ?? 0,
        execucoes30,
      }
    },
  })
  if (isLoading) return <div className="h-64 rounded-3xl skeleton" role="status" aria-label="Carregando relatórios" />
  if (error || !data) return <div className="rounded-2xl border border-destructive/30 p-10 text-center" role="alert">Não foi possível carregar os relatórios. <button className="ml-3 underline" onClick={() => refetch()}>Tentar novamente</button></div>
  const fim = Date.now()
  const inicio = fim - dias * DIA
  const inicioAnterior = inicio - dias * DIA
  const dentro = (v: string, a: number, b: number) => { const t=new Date(v).getTime(); return t >= a && t < b }
  const contar = (valores: string[], a: number, b: number) => valores.filter(v=>dentro(v,a,b)).length
  const cadastros = data.usuarios.map(u=>u.criado_em)
  const treinos = data.registrosTreinos.map(t=>t.criado_em)
  const execucoes = data.registrosExecucoes.map(e=>e.data_registro)
  const resumo = [
    { label:'Novos cadastros', atual:contar(cadastros,inicio,fim), anterior:contar(cadastros,inicioAnterior,inicio) },
    { label:'Treinos criados', atual:contar(treinos,inicio,fim), anterior:contar(treinos,inicioAnterior,inicio) },
    { label:'Execuções de treinos', atual:contar(execucoes,inicio,fim), anterior:contar(execucoes,inicioAnterior,inicio) },
  ]
  const grupos = [
    {label:'Usuários', valor:data.totalUsuarios, datas:cadastros, Icon:Users},
    {label:'Personais', valor:data.personals, datas:data.usuarios.filter(u=>u.tipo==='PERSONAL').map(u=>u.criado_em), Icon:UserCheck},
    {label:'Alunos', valor:data.alunos, datas:data.usuarios.filter(u=>u.tipo==='ALUNO').map(u=>u.criado_em), Icon:GraduationCap},
    {label:'Treinos criados', valor:data.treinos, datas:treinos, Icon:Dumbbell},
  ]
  const pontos = Array.from({length:7},(_,i)=>{
    const t=inicio+(fim-inicio)*i/6
    return { t, valor:cadastros.filter(v=>new Date(v).getTime()<=t).length }
  })
  const max = Math.max(1,...pontos.map(p=>p.valor))
  const coords=pontos.map((p,i)=>`${45+i*680/6},${205-p.valor/max*175}`)
  const linha=coords.join(' ')
  const perfil=[
    {label:'Alunos', valor:data.alunos, cor:'var(--accent)'},
    {label:'Personais', valor:data.personals, cor:'#648caf'},
    {label:'Administradores', valor:data.totalUsuarios-data.alunos-data.personals, cor:'#455965'},
  ]
  const alunoPct=data.totalUsuarios ? data.alunos/data.totalUsuarios*100 : 0
  const personalPct=data.totalUsuarios ? data.personals/data.totalUsuarios*100 : 0
  const dataLabel=(t:number)=>new Date(t).toLocaleDateString('pt-BR',{timeZone:'America/Fortaleza',day:'2-digit',month:'2-digit',year:'numeric'})
  function exportarResumo() {
    if(!data) return
    baixarCsv('shapeos-relatorio-'+dias+'dias.csv', [
      ['Período',dataLabel(inicio)+' – '+dataLabel(fim)],
      ['Indicador','Atual','Período anterior','Variação'],
      ...resumo.map(r=>[r.label,r.atual,r.anterior,variacao(r.atual,r.anterior)]),
      ['Base total','Valor'],
      ...grupos.map(g=>[g.label,g.valor]),
      ['Treinos ativos',data.treinosAtivos],['Vínculos ativos',data.vinculosAtivos],['Exercícios',data.exercicios],
    ])
  }
  function exportarUsuarios() {
    if(!data) return
    baixarCsv('shapeos-usuarios.csv',[['ID','Nome','E-mail','Tipo','Status','Criado em'],...data.usuarios.map(u=>[u.id,u.nome,u.email,u.tipo,u.status_conta,u.criado_em])])
  }
  return (
    <div data-reports-refined className="reports-workspace">
      <section className="hero">
        <div className="hero-copy"><p className="eyebrow">Análise da plataforma</p><h2 className="reports-banner-title">Relatórios e <span>indicadores</span></h2><p>Visualize resultados e acompanhe a evolução da plataforma.</p></div>
        <svg className="wireframe" viewBox="0 0 500 300" aria-hidden="true"><g fill="none" stroke="currentColor" strokeWidth=".65">
          {Array.from({length:32},(_,i)=><ellipse key={i} cx="265" cy="160" rx={105+i*2.9} ry={65+i*2.2} transform={`rotate(${-28+i*3.2} 265 160)`} />)}
          {Array.from({length:14},(_,i)=><ellipse key={'o'+i} cx="265" cy="160" rx="202" ry={25+i*6} transform="rotate(-28 265 160)" />)}
        </g></svg>
      </section>
      <div className="metrics">{grupos.map(g=>{
        const atual=contar(g.datas,inicio,fim), anterior=contar(g.datas,inicioAnterior,inicio)
        return <section className="metric" key={g.label}><span data-admin-metric-icon aria-hidden="true"><g.Icon size={24} strokeWidth={1.75} /></span><div><p>{g.label}</p><strong>{g.valor}</strong><span className="metric-note">{atual} no período · {variacao(atual,anterior)}</span></div></section>
      })}</div>
      <section className="reports-analysis" aria-labelledby="reports-analysis-title">
        <h2 id="reports-analysis-title" className="reports-analysis-title"><BarChart3 size={19} aria-hidden="true"/>Visão dos resultados</h2>
      <section className="toolbar" aria-label="Período e exportação">
        <ReportPeriod value={dias} onChange={setDias} />
        <span className="date-range"><CalendarDays size={17} />{dataLabel(inicio)} – {dataLabel(fim)}</span>
        <button className="update" disabled={isFetching} onClick={()=>refetch()}><RefreshCw size={16} className={isFetching?'animate-spin':''} />Atualizar</button>
        <button className="export" data-shapeos-tooltip="Exportar o resumo do período selecionado e os totais da base em CSV." onClick={exportarResumo}><FileCheck2 size={16} aria-hidden="true"/><span className="desktop-export-label">Exportar relatório</span><span className="mobile-export-label">Exportar CSV</span></button>
      </section>
      <div className="charts">
        <section className="panel evolution"><h2><BarChart3 size={19} />Evolução dos cadastros</h2><p className="chart-note">Total acumulado de usuários cadastrados</p>
          <svg className="line-chart desktop-chart" viewBox="0 0 760 250" role="img" aria-label={`Cadastros acumulados: ${pontos[0].valor} no início e ${pontos[6].valor} no final do período`}>
            {[0,1,2,3,4].map(i=><g key={i}><line x1="45" x2="725" y1={205-i*43.75} y2={205-i*43.75} stroke="var(--border)" strokeDasharray="4 4" /><text x="33" y={209-i*43.75} textAnchor="end" fill="var(--muted)" fontSize="11">{Math.round(max*i/4)}</text></g>)}
            <polygon points={`45,205 ${linha} 725,205`} fill="var(--accent)" opacity=".07" />
            <polyline points={linha} fill="none" stroke="var(--accent)" strokeWidth="2" />
            {pontos.map((p,i)=><g key={i}><circle cx={45+i*680/6} cy={205-p.valor/max*175} r="3" fill="var(--accent)" /><text x={45+i*680/6} y="233" textAnchor="middle" fill="var(--muted)" fontSize="10">{dataLabel(p.t).slice(0,5)}</text><title>{dataLabel(p.t)}: {p.valor} usuários</title></g>)}
          </svg>
          <svg className="mobile-chart" viewBox="0 0 360 210" role="img" aria-label={`Cadastros acumulados: ${pontos[0].valor} no início e ${pontos[6].valor} no final do período`}>
            {[0,1,2,3].map(i=><g key={i}><line x1="32" x2="340" y1={170-i*48} y2={170-i*48} stroke="var(--border)" strokeDasharray="4 4"/><text x="24" y={174-i*48} textAnchor="end" fill="var(--muted)" fontSize="12">{Math.round(max*i/3)}</text></g>)}
            <polygon points={`32,170 ${pontos.map((p,i)=>`${32+i*308/6},${170-p.valor/max*144}`).join(' ')} 340,170`} fill="var(--accent)" opacity=".07"/>
            <polyline points={pontos.map((p,i)=>`${32+i*308/6},${170-p.valor/max*144}`).join(' ')} fill="none" stroke="var(--accent)" strokeWidth="2"/>
            {pontos.map((p,i)=><g key={i}><circle cx={32+i*308/6} cy={170-p.valor/max*144} r="3" fill="var(--accent)"/>{i%3===0 && <text x={32+i*308/6} y="197" textAnchor="middle" fill="var(--muted)" fontSize="12">{dataLabel(p.t).slice(0,5)}</text>}</g>)}
          </svg>
        </section>
        <section className="panel profile"><h2><Users size={19} />Perfil dos usuários</h2><div className="profile-body">
          <div className="donut" role="img" aria-label={perfil.map(p=>p.label+': '+p.valor).join(', ')} style={{background:data.totalUsuarios ? `conic-gradient(var(--accent) 0% ${alunoPct}%,#648caf ${alunoPct}% ${alunoPct+personalPct}%,#455965 ${alunoPct+personalPct}% 100%)`:'var(--border)'}}><div><strong>{data.totalUsuarios}</strong><span>usuários</span></div></div>
          <ul>{perfil.filter(p=>p.valor>0).map(p=><li key={p.label}><span className="legend-dot" style={{background:p.cor}} /><div>{p.label}<strong>{p.valor}</strong></div><span>{data.totalUsuarios?Math.round(p.valor/data.totalUsuarios*100):0}%</span></li>)}</ul>
        </div></section>
      </div>
      <section className="panel summary"><h2><FileText size={19} />Resumo do período</h2><div className="table-scroll"><table><thead><tr><th>Indicador</th><th>Atual</th><th>Período anterior</th><th>Variação</th></tr></thead><tbody>{resumo.map(r=><tr key={r.label}><td>{r.label}</td><td>{r.atual}</td><td>{r.anterior}</td><td><span className={r.atual<r.anterior?'change down':'change'}>{variacao(r.atual,r.anterior)}</span></td></tr>)}</tbody></table></div>
        <div className="mobile-summary">{resumo.map(r=><article key={r.label}><h3>{r.label}</h3><dl><div><dt>Atual</dt><dd>{r.atual}</dd></div><div><dt>Anterior</dt><dd>{r.anterior}</dd></div><div><dt>Variação</dt><dd className={r.atual<r.anterior?'negative':''}>{variacao(r.atual,r.anterior)}</dd></div></dl></article>)}</div>
        <div className="summary-footer"><p>Comparação com os {dias} dias anteriores. Indicadores superiores mostram a base total.</p><button data-shapeos-tooltip="Exportar em CSV os usuários carregados, com perfil, status e data de cadastro." onClick={exportarUsuarios}><Download size={13} />Exportar usuários CSV</button></div>
      </section>
      </section>
      <style jsx>{`
        .reports-workspace { --surface:#fcfdf9; --border:#d7ded3; --text:#162623; --muted:#5f6f68; --accent:#129b89; display:grid; gap:16px; padding-bottom:24px; }
        :global(.dark) .reports-workspace { --surface:#071b17; --border:#1d4037; --text:#f4faf8; --muted:#abc5d1; --accent:#00e9df; }
        :global(.dark [data-admin-route="/admin/relatorios"]) { background:#041512!important; --shapeos-brand:#00e9df; }
        .hero { position:relative; overflow:hidden; border:1px solid var(--border); border-radius:17px; min-height:190px; display:flex; align-items:center; padding:32px 36px; background:var(--surface); }
        :global(.dark) .hero { background:radial-gradient(ellipse at 85% 65%,#07382e,#071b17 45%,#041512); }
        .hero-copy { position:relative; z-index:2; max-width:78%; } .eyebrow { font-size:11px!important; font-weight:700; letter-spacing:.14em; text-transform:uppercase; color:var(--accent)!important; margin-bottom:14px; }
        h1 { font-size:clamp(29px,3.1vw,46px); line-height:1.14; letter-spacing:-.035em; font-weight:800; color:var(--text); } h1 span { color:var(--accent); } .hero-copy>p:last-child { color:var(--muted); font-size:15px; line-height:1.6; margin-top:10px; }
        .wireframe { position:absolute; right:-15px; top:-20px; width:400px; height:270px; color:var(--accent); opacity:.45; pointer-events:none; }
        .toolbar { display:flex; gap:16px; align-items:center; padding:11px 14px; border:1px solid var(--border); background:var(--surface); border-radius:14px; color:var(--muted); font-size:12px; }
        select { border:1px solid var(--border); border-radius:9px; background:var(--surface); color:var(--text); padding:10px 14px; min-width:180px; }
        .date-range { display:flex; align-items:center; gap:10px; margin-right:auto; }
        button { cursor:pointer; display:inline-flex; align-items:center; justify-content:center; gap:9px; } button:disabled { cursor:default; opacity:.5; } button:focus-visible,select:focus-visible { outline:2px solid var(--accent); outline-offset:3px; }
        .update,.export { padding:10px 15px; border-radius:9px; white-space:nowrap; border:1px solid var(--accent); color:var(--accent); } .export { background:var(--accent); color:#002b26; }
        .metrics { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:15px; }
        .metric { display:flex; gap:18px; padding:21px 18px; border:1px solid var(--border); border-radius:13px; background:var(--surface); } .metric> :global(svg) { color:var(--accent); flex-shrink:0; margin-top:7px; }
        .metric p { font-size:12px; color:var(--muted); } .metric strong { display:block; font-size:29px; font-weight:750; line-height:1.2; margin:5px 0; color:var(--text); } .metric-note { font-size:10px; color:var(--accent); }
        .charts { display:grid; grid-template-columns:minmax(0,1.8fr) minmax(0,1fr); gap:16px; }
        .panel { border:1px solid var(--border); border-radius:14px; padding:18px; background:var(--surface); } h2 { display:flex; align-items:center; gap:10px; color:var(--text); font-size:15px; font-weight:700; } h2> :global(svg) { color:var(--accent); } .chart-note { font-size:10px; margin-top:6px; color:var(--muted); } .line-chart { width:100%; margin-top:12px; }
        .profile-body { display:flex; align-items:center; justify-content:center; gap:22px; min-height:240px; }
        .donut { flex-shrink:0; width:158px; height:158px; border-radius:50%; padding:25px; } .donut>div { display:flex; flex-direction:column; justify-content:center; align-items:center; width:100%; height:100%; border-radius:50%; background:var(--surface); color:var(--text); } .donut strong { font-size:27px; font-weight:750; } .donut span { font-size:11px; color:var(--muted); }
        ul { display:grid; gap:18px; min-width:110px; } li { display:flex; gap:8px; color:var(--muted); font-size:11px; align-items:flex-start; } li strong { display:block; color:var(--text); margin-top:5px; font-size:13px; } li>span:last-child { margin-left:auto; font-size:10px; } .legend-dot { width:10px; height:10px; flex-shrink:0; margin-top:3px; border-radius:50%; }
        .table-scroll { overflow-x:auto; margin-top:15px; border:1px solid var(--border); border-radius:10px; } table { width:100%; min-width:500px; border-collapse:collapse; text-align:left; font-size:12px; color:var(--text); } th { font-weight:500; color:var(--muted); background:color-mix(in srgb,var(--accent) 5%,transparent); } th,td { padding:10px 16px; } td { border-top:1px solid var(--border); } .change { display:inline-block; font-size:11px; padding:4px 9px; color:var(--accent); border-radius:8px; background:color-mix(in srgb,var(--accent) 9%,transparent); } .down { color:#c77632; }
        .summary-footer { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px; margin-top:12px; font-size:10px; color:var(--muted); } .summary-footer button { color:var(--accent); }
        @media(max-width:1200px) { .toolbar { flex-wrap:wrap; } .profile-body { flex-direction:column; gap:16px; margin-top:20px; } ul { width:100%; } .wireframe { right:-110px; opacity:.25; } }
        @media(max-width:800px) { .metrics { grid-template-columns:repeat(2,minmax(0,1fr)); } .charts { grid-template-columns:1fr; } .profile-body { flex-direction:row; } .hero-copy { max-width:100%; } .wireframe { right:-210px; opacity:.15; } .date-range { width:100%; order:3; } }
        @media(max-width:480px) { .hero { padding:28px 22px; } .metric { padding:15px 12px; gap:10px; } .metric> :global(svg) { width:19px; } .metric-note { font-size:9px; } .toolbar { gap:10px; } .profile-body { gap:15px; } .donut { width:135px; height:135px; padding:22px; } }

        .mobile-chart,.mobile-summary,.mobile-export-label { display:none; }
        @media(max-width:767px) {
          :global([data-admin-route="/admin/relatorios"] main),
          :global([data-admin-route="/admin/relatorios"] main>div),
          :global([data-admin-content="/admin/relatorios"]) { min-width:0; width:auto; max-width:100%; }
          .reports-workspace,.reports-workspace>*,.metrics>*,.charts>* { min-width:0; max-width:100%; }
          .reports-workspace { width:100%; gap:16px; }
          .hero { padding:26px 20px; min-height:200px; }
          .hero-copy { max-width:100%; }
          h1 { font-size:32px; line-height:1.12; max-width:290px; }
          .hero-copy>p:last-child { font-size:14px; max-width:270px; }
          .wireframe { width:290px; right:-140px; top:2px; opacity:.15; }
          .toolbar { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); padding:14px; gap:10px; }
          .toolbar>span:first-child { display:none; }
          .toolbar select { grid-column:1/-1; width:100%; min-width:0; height:48px; font-size:14px; order:0; }
          .date-range { grid-column:1/-1; width:auto; margin:0 0 4px; order:1; font-size:12px; }
          .update,.export { min-width:0; width:100%; min-height:46px; padding:10px 8px; font-size:12px; gap:7px; order:2; white-space:normal; }
          .desktop-export-label { display:none; }
          .mobile-export-label { display:inline; }
          .metrics { grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; }
          .metric { min-width:0; padding:16px 12px; gap:10px; align-items:flex-start; }
          .metric>div { min-width:0; }
          .metric> :global(svg) { width:21px; height:21px; }
          .metric p { font-size:12px; overflow-wrap:anywhere; }
          .metric strong { font-size:30px; }
          .metric-note { display:block; font-size:11px; line-height:1.5; overflow-wrap:anywhere; }
          .charts { grid-template-columns:minmax(0,1fr); }
          .panel { padding:16px; }
          h2 { font-size:15px; }
          .chart-note { font-size:11px; }
          .desktop-chart { display:none; }
          .mobile-chart { display:block; width:100%; height:auto; margin-top:12px; }
          .profile-body { flex-direction:row; min-height:180px; gap:14px; margin-top:14px; }
          .donut { width:120px; height:120px; padding:21px; }
          .donut strong { font-size:24px; }
          ul { flex:1; min-width:0; width:auto; gap:14px; }
          li { font-size:11px; gap:6px; flex-wrap:wrap; }
          li>div { min-width:0; }
          li strong { font-size:13px; }
          .summary .table-scroll { display:none; }
          .mobile-summary { display:grid; gap:10px; margin-top:15px; }
          .mobile-summary article { border:1px solid var(--border); border-radius:11px; padding:13px; }
          .mobile-summary h3 { font-size:13px; font-weight:600; color:var(--text); margin-bottom:12px; }
          .mobile-summary dl { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); }
          .mobile-summary dl>div+div { border-left:1px solid var(--border); padding-left:12px; }
          .mobile-summary dt { font-size:11px; color:var(--muted); }
          .mobile-summary dd { font-size:17px; font-weight:650; color:var(--text); margin-top:3px; }
          .mobile-summary dl>div:last-child dd { color:var(--accent); }
          .mobile-summary dl>div:last-child .negative { color:#c77632; }
          .summary-footer { font-size:11px; line-height:1.6; }
          .summary-footer button { min-height:44px; }
        }
        @media(max-width:359px) { .metric { display:block; } .metric> :global(svg) { margin:0 0 8px; } .profile-body { flex-direction:column; } ul { width:100%; } }
      
        :global(html:not(.dark)) .export { color:#fff; }
        :global(html:not(.dark)) .wireframe { color:#008d85; }
        :global(html:not(.dark)) th { background:#eef1e9; }
        :global(html:not(.dark)) .change { background:#e4f3eb; }
        :global(html:not(.dark)) .change:not(.down) { color:#0d7e70; }

        /* Exact light palette for the period summary on desktop and mobile. */
        :global(html:not(.dark)) .summary,
        :global(html:not(.dark)) .summary .table-scroll,
        :global(html:not(.dark)) .summary table,
        :global(html:not(.dark)) .summary th,
        :global(html:not(.dark)) .summary td,
        :global(html:not(.dark)) .summary .mobile-summary article {
          background:#fcfdf9; border-color:#d7ded3;
        }
        :global(html:not(.dark)) .summary th,
        :global(html:not(.dark)) .summary .summary-footer p,
        :global(html:not(.dark)) .summary .mobile-summary dt { color:#5f6f68; }
        :global(html:not(.dark)) .summary .mobile-summary dl>div+div { border-color:#d7ded3; }

        /* Same summary typography in both themes, with a neutral dark header. */
        :global(html.dark [data-admin-route="/admin/relatorios"] [data-admin-content] .reports-workspace .summary thead),
        :global(html.dark [data-admin-route="/admin/relatorios"] [data-admin-content] .reports-workspace .summary th) {
          background:#091c18!important; background-image:none!important; border-color:#1c4037!important;
        }
        :global(html [data-admin-route="/admin/relatorios"] [data-admin-content] .reports-workspace .summary th),
        :global(html [data-admin-route="/admin/relatorios"] [data-admin-content] .reports-workspace .summary td),
        :global(html [data-admin-route="/admin/relatorios"] [data-admin-content] .reports-workspace .summary .change),
        :global(html [data-admin-route="/admin/relatorios"] [data-admin-content] .reports-workspace .summary .summary-footer button) { font-weight:500!important; }

        /* Numeric headings and values share the right edge for comparison. */
        :global(html:is(.light,.dark) [data-admin-route="/admin/relatorios"] [data-admin-content] .reports-workspace .summary table th:first-child),
        :global(html:is(.light,.dark) [data-admin-route="/admin/relatorios"] [data-admin-content] .reports-workspace .summary table td:first-child) { text-align:left!important; }
        :global(html:is(.light,.dark) [data-admin-route="/admin/relatorios"] [data-admin-content] .reports-workspace .summary table th:not(:first-child)),
        :global(html:is(.light,.dark) [data-admin-route="/admin/relatorios"] [data-admin-content] .reports-workspace .summary table td:not(:first-child)) { text-align:right!important; font-variant-numeric:tabular-nums; }


        /* Quiet theme-aware hover for report inputs and export commands. */
        :global(html:is(.light,.dark) [data-admin-route="/admin/relatorios"] [data-admin-content] .reports-workspace.reports-workspace :is(.report-period-trigger,.update,.export,.summary-footer button)) {
          border:1px solid var(--border)!important; border-radius:13px!important;
          background:var(--surface)!important;
          transition:background-color 150ms ease,border-color 150ms ease!important;
          box-shadow:none!important; filter:none!important; transform:none!important;
          translate:none!important; scale:none!important;
        }
        :global(html:is(.light,.dark) [data-admin-route="/admin/relatorios"] [data-admin-content] .reports-workspace.reports-workspace .export) { color:var(--text)!important; }
        :global(html:is(.light,.dark) [data-admin-route="/admin/relatorios"] [data-admin-content] .reports-workspace.reports-workspace .summary-footer button) { padding:10px 14px; min-height:44px; }
        @media(hover:hover) and (pointer:fine) {
          :global(html:is(.light,.dark) [data-admin-route="/admin/relatorios"] [data-admin-content] .reports-workspace.reports-workspace :is(.report-period-trigger,.update,.export,.summary-footer button):hover:enabled) {
            background:color-mix(in srgb,var(--accent) 7%,transparent)!important;
            border-color:color-mix(in srgb,var(--accent) 40%,transparent)!important;
          }
        }
        @media(max-width:767px) {
          :global(html:is(.light,.dark) [data-admin-route="/admin/relatorios"] [data-admin-content] .reports-workspace.reports-workspace .toolbar select) { font-size:16px!important; }
        }


        /* Custom period menu shares the admin selector appearance and keyboard behavior. */
        :global(html:is(.light,.dark) [data-admin-route="/admin/relatorios"] [data-admin-content] .reports-workspace.reports-workspace .report-period) { position:relative; width:200px; flex-shrink:0; }
        :global(html:is(.light,.dark) [data-admin-route="/admin/relatorios"] [data-admin-content] .reports-workspace.reports-workspace .report-period-trigger) {
          display:flex; align-items:center; gap:10px; width:100%; min-height:44px; padding:0 14px;
          color:var(--muted)!important; font-family:inherit; font-size:13px; font-weight:400;
        }
        :global(html:is(.light,.dark) [data-admin-route="/admin/relatorios"] [data-admin-content] .reports-workspace.reports-workspace .report-period-trigger svg) { flex-shrink:0; color:inherit; }
        :global(html:is(.light,.dark) [data-admin-route="/admin/relatorios"] [data-admin-content] .reports-workspace.reports-workspace .report-period-trigger svg:last-child) { margin-left:auto; }
        :global(html:is(.light,.dark) [data-admin-route="/admin/relatorios"] [data-admin-content] .reports-workspace.reports-workspace .report-period-menu) {
          position:absolute; z-index:40; top:calc(100% + 8px); right:0; width:240px; max-width:calc(100vw - 32px);
          max-height:calc(100dvh - 24px); overflow-y:auto; overscroll-behavior:contain;
          padding:6px; border:1px solid var(--border); border-radius:13px;
          background:var(--surface); color:var(--text); box-shadow:0 8px 24px rgba(0,0,0,.12); outline:none;
        }
        :global(html:is(.light,.dark) [data-admin-route="/admin/relatorios"] [data-admin-content] .reports-workspace.reports-workspace .report-period-menu[data-above="true"]) { top:auto; bottom:calc(100% + 8px); }
        :global(html:is(.light,.dark) [data-admin-route="/admin/relatorios"] [data-admin-content] .reports-workspace.reports-workspace .report-period-option) {
          display:flex; align-items:center; gap:10px; min-height:44px; padding:0 10px;
          border:1px solid transparent; border-radius:13px; cursor:pointer; color:var(--text);
          font-size:13px; transition:background-color 150ms ease,border-color 150ms ease;
        }
        :global(html:is(.light,.dark) [data-admin-route="/admin/relatorios"] [data-admin-content] .reports-workspace.reports-workspace .report-period-option + .report-period-option) { margin-top:4px; }
        :global(html:is(.light,.dark) [data-admin-route="/admin/relatorios"] [data-admin-content] .reports-workspace.reports-workspace .report-period-option svg) { flex-shrink:0; color:inherit; }
        :global(html:is(.light,.dark) [data-admin-route="/admin/relatorios"] [data-admin-content] .reports-workspace.reports-workspace .report-period-option svg:last-child:not(:first-child)) { margin-left:auto; }
        :global(html:is(.light,.dark) [data-admin-route="/admin/relatorios"] [data-admin-content] .reports-workspace.reports-workspace .report-period-option[aria-selected="true"]) { background:color-mix(in srgb,var(--accent) 7%,transparent); color:var(--accent); }
        :global(html:is(.light,.dark) [data-admin-route="/admin/relatorios"] [data-admin-content] .reports-workspace.reports-workspace .report-period-menu:focus .report-period-option[data-active="true"]) { border-color:color-mix(in srgb,var(--accent) 40%,transparent); }
        :global(html:is(.light,.dark) [data-admin-route="/admin/relatorios"] [data-admin-content] .reports-workspace.reports-workspace .report-period-trigger:focus-visible) { outline:2px solid var(--accent); outline-offset:3px; }
        @media(hover:hover) and (pointer:fine) {
          :global(html:is(.light,.dark) [data-admin-route="/admin/relatorios"] [data-admin-content] .reports-workspace.reports-workspace .report-period-option:hover) { background:color-mix(in srgb,var(--accent) 7%,transparent); border-color:color-mix(in srgb,var(--accent) 40%,transparent); }
        }
        @media(max-width:767px) {
          :global(html:is(.light,.dark) [data-admin-route="/admin/relatorios"] [data-admin-content] .reports-workspace.reports-workspace .report-period) { grid-column:1/-1; width:100%; min-width:0; order:0; }
          :global(html:is(.light,.dark) [data-admin-route="/admin/relatorios"] [data-admin-content] .reports-workspace.reports-workspace .report-period-trigger), :global(html:is(.light,.dark) [data-admin-route="/admin/relatorios"] [data-admin-content] .reports-workspace.reports-workspace .report-period-option) { min-height:48px; font-size:16px; }
          :global(html:is(.light,.dark) [data-admin-route="/admin/relatorios"] [data-admin-content] .reports-workspace.reports-workspace .report-period-menu) { width:100%; }
        }


        :global(html:is(.light,.dark) [data-admin-route="/admin/relatorios"] [data-admin-content] .reports-workspace.reports-workspace .update) { color:var(--text)!important; }
        :global(html:is(.light,.dark) [data-admin-route="/admin/relatorios"] [data-admin-content] .reports-workspace.reports-workspace .export) { color:var(--accent)!important; }

/* Refined reports: compact chrome, original data and charts. */
:global(html body [data-admin-route="/admin/relatorios"] :is(#reports-refined,[data-reports-refined])){display:grid!important;gap:18px!important;--surface:#fcfdf9;--border:#d7ded3;--text:#162623;--muted:#5f6f68;--accent:#129b89;}
:global(html.dark body [data-admin-route="/admin/relatorios"] :is(#reports-refined,[data-reports-refined])){--surface:#091c18;--border:#1c4037;--text:#f5faf9;--muted:#a3becd;--accent:#00e9df;}
:global(html body [data-admin-route="/admin/relatorios"] :is(#reports-refined,[data-reports-refined]) .hero){min-height:130px!important;padding:24px 28px!important;border-radius:13px!important;}
:global(html body [data-admin-route="/admin/relatorios"] :is(#reports-refined,[data-reports-refined]) .reports-banner-title){font-size:28px!important;line-height:1.2!important;letter-spacing:-.035em!important;font-weight:700!important;color:var(--text)!important;}
:global(html body [data-admin-route="/admin/relatorios"] :is(#reports-refined,[data-reports-refined]) .reports-banner-title span){color:var(--accent)!important;}
:global(html body [data-admin-route="/admin/relatorios"] :is(#reports-refined,[data-reports-refined]) .eyebrow){font-size:9px!important;border:0!important;padding:0!important;background:transparent!important;margin-bottom:8px!important;}
:global(html body [data-admin-route="/admin/relatorios"] :is(#reports-refined,[data-reports-refined]) .hero-copy>p:last-child){font-size:13px!important;margin-top:8px!important;}
:global(html body [data-admin-route="/admin/relatorios"] :is(#reports-refined,[data-reports-refined]) .wireframe){width:300px!important;height:200px!important;top:50%!important;transform:translateY(-50%)!important;right:12px!important;opacity:.32!important;}
:global(html body [data-admin-route="/admin/relatorios"] :is(#reports-refined,[data-reports-refined]) .toolbar){padding:14px 18px!important;gap:12px!important;border-radius:13px!important;font-size:11px!important;}
:global(html body [data-admin-route="/admin/relatorios"] :is(#reports-refined,[data-reports-refined]) .report-period-trigger){min-height:44px!important;height:44px!important;border-radius:13px!important;font-size:12px!important;color:var(--text)!important;}
:global(html body [data-admin-route="/admin/relatorios"] :is(#reports-refined,[data-reports-refined]) .update,.export){height:40px!important;min-height:40px!important;padding:0 12px!important;border:1px solid var(--border)!important;border-radius:13px!important;background:transparent!important;font-size:11px!important;box-shadow:none!important;}
:global(html body [data-admin-route="/admin/relatorios"] :is(#reports-refined,[data-reports-refined]) .export){color:var(--accent)!important;}
:global(html body [data-admin-route="/admin/relatorios"] :is(#reports-refined,[data-reports-refined]) .update){color:var(--text)!important;}
:global(html body [data-admin-route="/admin/relatorios"] :is(#reports-refined,[data-reports-refined]) .metrics){grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:0!important;}
:global(html body [data-admin-route="/admin/relatorios"] :is(#reports-refined,[data-reports-refined]) .metric){padding:10px 18px!important;gap:12px!important;min-height:90px!important;align-items:center!important;border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important;}
:global(html body [data-admin-route="/admin/relatorios"] :is(#reports-refined,[data-reports-refined]) .metric:not(:last-child)){border-right:1px solid var(--border)!important;}
:global(html body [data-admin-route="/admin/relatorios"] :is(#reports-refined,[data-reports-refined]) .metric p){font-size:11px!important;}
:global(html body [data-admin-route="/admin/relatorios"] :is(#reports-refined,[data-reports-refined]) .metric strong){font-size:24px!important;margin:3px 0!important;}
:global(html body [data-admin-route="/admin/relatorios"] :is(#reports-refined,[data-reports-refined]) .metric-note){font-size:10px!important;line-height:1.5!important;}
:global(html body [data-admin-route="/admin/relatorios"] :is(#reports-refined,[data-reports-refined]) .charts){gap:16px!important;grid-template-columns:minmax(0,1.8fr) minmax(0,1fr)!important;}
:global(html body [data-admin-route="/admin/relatorios"] :is(#reports-refined,[data-reports-refined]) .panel){padding:18px!important;border-radius:13px!important;box-shadow:none!important;min-width:0!important;}
:global(html body [data-admin-route="/admin/relatorios"] :is(#reports-refined,[data-reports-refined]) .panel h2){font-size:14px!important;font-weight:600!important;}
:global(html body [data-admin-route="/admin/relatorios"] :is(#reports-refined,[data-reports-refined]) .chart-note){font-size:11px!important;}
:global(html body [data-admin-route="/admin/relatorios"] :is(#reports-refined,[data-reports-refined]) .line-chart){max-height:260px!important;}
:global(html body [data-admin-route="/admin/relatorios"] :is(#reports-refined,[data-reports-refined]) .profile-body){min-height:220px!important;gap:18px!important;}
:global(html body [data-admin-route="/admin/relatorios"] :is(#reports-refined,[data-reports-refined]) .donut){width:140px!important;height:140px!important;padding:23px!important;}
:global(html body [data-admin-route="/admin/relatorios"] :is(#reports-refined,[data-reports-refined]) .donut strong){font-size:24px!important;}
:global(html body [data-admin-route="/admin/relatorios"] :is(#reports-refined,[data-reports-refined]) .profile li){font-size:11px!important;}
:global(html body [data-admin-route="/admin/relatorios"] :is(#reports-refined,[data-reports-refined]) .table-scroll){border-radius:13px!important;}
:global(html body [data-admin-route="/admin/relatorios"] :is(#reports-refined,[data-reports-refined]) th){font-size:10px!important;letter-spacing:.05em!important;}
:global(html body [data-admin-route="/admin/relatorios"] :is(#reports-refined,[data-reports-refined]) td){font-size:12px!important;}
:global(html body [data-admin-route="/admin/relatorios"] :is(#reports-refined,[data-reports-refined]) .summary-footer){gap:12px!important;line-height:1.6!important;}
:global(html body [data-admin-route="/admin/relatorios"] :is(#reports-refined,[data-reports-refined]) .summary-footer button){min-height:36px!important;padding:0 12px!important;border:1px solid var(--border)!important;border-radius:13px!important;}
@media(any-hover:hover){:global(html body [data-admin-route="/admin/relatorios"] :is(#reports-refined,[data-reports-refined]) button:hover:enabled){background:color-mix(in srgb,var(--accent) 7%,transparent)!important;border-color:color-mix(in srgb,var(--accent) 40%,transparent)!important;box-shadow:none!important;transform:none!important;transition:background-color 150ms ease,border-color 150ms ease!important;}
}
@media(min-width:768px) and (max-width:1199px){:global(html body [data-admin-route="/admin/relatorios"] :is(#reports-refined,[data-reports-refined]) .profile-body){flex-direction:column!important;}
:global(html body [data-admin-route="/admin/relatorios"] :is(#reports-refined,[data-reports-refined]) .metric){padding:10px!important;gap:10px!important;}
}
@media(max-width:767px){:global(html body [data-admin-route="/admin/relatorios"] :is(#reports-refined,[data-reports-refined]) .hero){min-height:150px!important;padding:22px 18px!important;}
:global(html body [data-admin-route="/admin/relatorios"] :is(#reports-refined,[data-reports-refined]) .reports-banner-title){font-size:26px!important;}
:global(html body [data-admin-route="/admin/relatorios"] :is(#reports-refined,[data-reports-refined]) .hero-copy){max-width:100%!important;}
:global(html body [data-admin-route="/admin/relatorios"] :is(#reports-refined,[data-reports-refined]) .wireframe){right:-170px!important;opacity:.15!important;}
:global(html body [data-admin-route="/admin/relatorios"] :is(#reports-refined,[data-reports-refined]) .toolbar){display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;padding:14px!important;gap:10px!important;}
:global(html body [data-admin-route="/admin/relatorios"] :is(#reports-refined,[data-reports-refined]) .report-period){grid-column:1 / -1!important;min-width:0!important;}
:global(html body [data-admin-route="/admin/relatorios"] :is(#reports-refined,[data-reports-refined]) .report-period-trigger){width:100%!important;}
:global(html body [data-admin-route="/admin/relatorios"] :is(#reports-refined,[data-reports-refined]) .date-range){grid-column:1 / -1!important;font-size:11px!important;}
:global(html body [data-admin-route="/admin/relatorios"] :is(#reports-refined,[data-reports-refined]) .update,.export){min-height:44px!important;height:44px!important;}
:global(html body [data-admin-route="/admin/relatorios"] :is(#reports-refined,[data-reports-refined]) .metrics){grid-template-columns:repeat(2,minmax(0,1fr))!important;}
:global(html body [data-admin-route="/admin/relatorios"] :is(#reports-refined,[data-reports-refined]) .metric){padding:12px 10px!important;gap:10px!important;min-width:0!important;}
:global(html body [data-admin-route="/admin/relatorios"] :is(#reports-refined,[data-reports-refined]) .metric:nth-child(2)){border-right:0!important;}
:global(html body [data-admin-route="/admin/relatorios"] :is(#reports-refined,[data-reports-refined]) .metric:nth-child(n+3)){border-top:1px solid var(--border)!important;}
:global(html body [data-admin-route="/admin/relatorios"] :is(#reports-refined,[data-reports-refined]) .metric strong){font-size:23px!important;}
:global(html body [data-admin-route="/admin/relatorios"] :is(#reports-refined,[data-reports-refined]) .charts){grid-template-columns:minmax(0,1fr)!important;}
:global(html body [data-admin-route="/admin/relatorios"] :is(#reports-refined,[data-reports-refined]) .panel){padding:14px!important;}
:global(html body [data-admin-route="/admin/relatorios"] :is(#reports-refined,[data-reports-refined]) .profile-body){flex-direction:row!important;min-height:170px!important;gap:14px!important;}
:global(html body [data-admin-route="/admin/relatorios"] :is(#reports-refined,[data-reports-refined]) .donut){width:112px!important;height:112px!important;padding:19px!important;}
:global(html body [data-admin-route="/admin/relatorios"] :is(#reports-refined,[data-reports-refined]) .summary-footer){justify-content:center!important;text-align:center!important;}
:global(html body [data-admin-route="/admin/relatorios"] :is(#reports-refined,[data-reports-refined]) .summary-footer button){min-height:44px!important;}
}

/* Approved unified analytical workspace. */
:global(html body [data-admin-route="/admin/relatorios"] :is(#reports-refined,[data-reports-refined]) .metric>div){display:grid!important;grid-template-columns:minmax(0,1fr)!important;gap:3px!important;min-width:0!important;}
:global(html body [data-admin-route="/admin/relatorios"] :is(#reports-refined,[data-reports-refined]) .metric strong){grid-row:1!important;margin:0!important;}
:global(html body [data-admin-route="/admin/relatorios"] :is(#reports-refined,[data-reports-refined]) .metric p){grid-row:2!important;margin:0!important;color:var(--text)!important;}
:global(html body [data-admin-route="/admin/relatorios"] :is(#reports-refined,[data-reports-refined]) .metric-note){grid-row:3!important;}
:global(html body [data-admin-route="/admin/relatorios"] :is(#reports-refined,[data-reports-refined]) .reports-analysis){display:grid!important;gap:16px!important;padding:18px!important;border:1px solid var(--border)!important;border-radius:13px!important;background:var(--surface)!important;min-width:0!important;}
:global(html body [data-admin-route="/admin/relatorios"] :is(#reports-refined,[data-reports-refined]) .reports-analysis-title){display:flex!important;align-items:center!important;gap:10px!important;font-size:15px!important;font-weight:600!important;color:var(--text)!important;}
:global(html body [data-admin-route="/admin/relatorios"] :is(#reports-refined,[data-reports-refined]) .reports-analysis-title svg){color:var(--accent)!important;}
:global(html body [data-admin-route="/admin/relatorios"] :is(#reports-refined,[data-reports-refined]) .reports-analysis .toolbar){padding:0 0 14px!important;border:0!important;border-bottom:1px solid var(--border)!important;border-radius:0!important;background:transparent!important;}
:global(html body [data-admin-route="/admin/relatorios"] :is(#reports-refined,[data-reports-refined]) .reports-analysis .panel){padding:0!important;border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important;}
:global(html body [data-admin-route="/admin/relatorios"] :is(#reports-refined,[data-reports-refined]) .reports-analysis .charts){align-items:stretch!important;gap:20px!important;}
:global(html body [data-admin-route="/admin/relatorios"] :is(#reports-refined,[data-reports-refined]) .reports-analysis .profile){padding-left:20px!important;border-left:1px solid var(--border)!important;}
:global(html body [data-admin-route="/admin/relatorios"] :is(#reports-refined,[data-reports-refined]) .reports-analysis .profile-body){min-height:220px!important;margin-top:12px!important;}
:global(html body [data-admin-route="/admin/relatorios"] :is(#reports-refined,[data-reports-refined]) .reports-analysis .summary){padding-top:16px!important;border-top:1px solid var(--border)!important;}
:global(html body [data-admin-route="/admin/relatorios"] :is(#reports-refined,[data-reports-refined]) .reports-analysis .table-scroll){border:0!important;border-radius:0!important;margin-top:10px!important;}
:global(html body [data-admin-route="/admin/relatorios"] :is(#reports-refined,[data-reports-refined]) .reports-analysis th){background:transparent!important;padding:10px 12px!important;}
:global(html body [data-admin-route="/admin/relatorios"] :is(#reports-refined,[data-reports-refined]) .reports-analysis td){padding:10px 12px!important;}
:global(html body [data-admin-route="/admin/relatorios"] :is(#reports-refined,[data-reports-refined]) .reports-analysis .summary-footer){padding-top:12px!important;border-top:1px solid var(--border)!important;margin-top:0!important;}
@media(max-width:767px){:global(html body [data-admin-route="/admin/relatorios"] :is(#reports-refined,[data-reports-refined]) .reports-analysis){padding:14px!important;gap:14px!important;}
:global(html body [data-admin-route="/admin/relatorios"] :is(#reports-refined,[data-reports-refined]) .reports-analysis .toolbar){grid-template-columns:repeat(2,minmax(0,1fr))!important;}
:global(html body [data-admin-route="/admin/relatorios"] :is(#reports-refined,[data-reports-refined]) .reports-analysis .charts){gap:16px!important;}
:global(html body [data-admin-route="/admin/relatorios"] :is(#reports-refined,[data-reports-refined]) .reports-analysis .profile){padding:16px 0 0!important;border-left:0!important;border-top:1px solid var(--border)!important;}
:global(html body [data-admin-route="/admin/relatorios"] :is(#reports-refined,[data-reports-refined]) .reports-analysis .profile-body){min-height:170px!important;}
}
`}</style>
    </div>
  )
}

function ReportPeriod({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const options = [
    { value: 7, label: 'Últimos 7 dias', Icon: Clock3 },
    { value: 30, label: 'Últimos 30 dias', Icon: CalendarDays },
    { value: 90, label: 'Últimos 90 dias', Icon: CalendarDays },
  ]
  const id = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [above, setAbove] = useState(false)
  const selected = Math.max(0, options.findIndex((option) => option.value === value))

  useEffect(() => {
    if (!open) return
    const outside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const place = () => {
      const rect = triggerRef.current?.getBoundingClientRect()
      if (rect) setAbove(window.innerHeight - rect.bottom < 170 && rect.top > 170)
    }
    place()
    listRef.current?.focus({ preventScroll: true })
    document.addEventListener('pointerdown', outside)
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      document.removeEventListener('pointerdown', outside)
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open])

  function choose(index: number) {
    onChange(options[index].value)
    setOpen(false)
    triggerRef.current?.focus()
  }

  return <div ref={rootRef} className="report-period" onBlur={(event) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false)
  }}>
    <button ref={triggerRef} type="button" className="report-period-trigger"
      aria-label={`Filtrar por período: ${options[selected].label}`}
      aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? id : undefined}
      onClick={() => { setActive(selected); setOpen(!open) }}
      onKeyDown={(event) => {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault(); setActive(selected); setOpen(true)
        }
      }}>
      <CalendarDays size={17} strokeWidth={1.8} />
      <span>{options[selected].label}</span>
      {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
    </button>
    {open && <div ref={listRef} id={id} role="listbox" tabIndex={-1} className="report-period-menu"
      data-above={above} aria-label="Período do relatório" aria-activedescendant={`${id}-${active}`}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault(); event.stopPropagation(); setOpen(false); triggerRef.current?.focus()
        } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault(); setActive((index) => (index + (event.key === 'ArrowDown' ? 1 : options.length - 1)) % options.length)
        } else if (event.key === 'Home' || event.key === 'End') {
          event.preventDefault(); setActive(event.key === 'Home' ? 0 : options.length - 1)
        } else if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault(); choose(active)
        } else if (event.key.length === 1) {
          const index = options.findIndex((option) => option.label.toLocaleLowerCase('pt-BR').startsWith(event.key.toLocaleLowerCase('pt-BR')))
          if (index >= 0) { event.preventDefault(); setActive(index) }
        }
      }}>
      {options.map(({ value: optionValue, label, Icon }, index) => <div
        key={optionValue} id={`${id}-${index}`} role="option"
        aria-selected={value === optionValue} data-active={active === index}
        className="report-period-option"
        onPointerMove={() => setActive(index)}
        onPointerDown={(event) => event.preventDefault()}
        onClick={() => choose(index)}>
        <Icon size={18} strokeWidth={1.8} /><span>{label}</span>
        {value === optionValue && <Check size={17} strokeWidth={2} />}
      </div>)}
    </div>}
  </div>
}
