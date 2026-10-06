'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { BarChart3, CalendarDays, Download, Dumbbell, FileText, GraduationCap, RefreshCw, UserCheck, Users } from 'lucide-react'
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
    <div className="reports-workspace">
      <section className="hero">
        <div className="hero-copy"><p className="eyebrow">Análise da plataforma</p><h1>Relatórios e <span>indicadores</span></h1><p>Visualize resultados e acompanhe a evolução da plataforma.</p></div>
        <svg className="wireframe" viewBox="0 0 500 300" aria-hidden="true"><g fill="none" stroke="currentColor" strokeWidth=".65">
          {Array.from({length:32},(_,i)=><ellipse key={i} cx="265" cy="160" rx={105+i*2.9} ry={65+i*2.2} transform={`rotate(${-28+i*3.2} 265 160)`} />)}
          {Array.from({length:14},(_,i)=><ellipse key={'o'+i} cx="265" cy="160" rx="202" ry={25+i*6} transform="rotate(-28 265 160)" />)}
        </g></svg>
      </section>
      <section className="toolbar" aria-label="Período e exportação">
        <span>Período</span><select aria-label="Período do relatório" value={dias} onChange={e=>setDias(Number(e.target.value))}><option value={7}>Últimos 7 dias</option><option value={30}>Últimos 30 dias</option><option value={90}>Últimos 90 dias</option></select>
        <span className="date-range"><CalendarDays size={17} />{dataLabel(inicio)} – {dataLabel(fim)}</span>
        <button className="update" disabled={isFetching} onClick={()=>refetch()}><RefreshCw size={16} className={isFetching?'animate-spin':''} />Atualizar</button>
        <button className="export" onClick={exportarResumo}><Download size={16} /><span className="desktop-export-label">Exportar relatório</span><span className="mobile-export-label">Exportar CSV</span></button>
      </section>
      <div className="metrics">{grupos.map(g=>{
        const atual=contar(g.datas,inicio,fim), anterior=contar(g.datas,inicioAnterior,inicio)
        return <section className="metric" key={g.label}><g.Icon size={26} strokeWidth={1.7} /><div><p>{g.label}</p><strong>{g.valor}</strong><span className="metric-note">{atual} no período · {variacao(atual,anterior)}</span></div></section>
      })}</div>
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
        <div className="summary-footer"><p>Comparação com os {dias} dias anteriores. Indicadores superiores mostram a base total.</p><button onClick={exportarUsuarios}><Download size={13} />Exportar usuários CSV</button></div>
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
`}</style>
    </div>
  )
}
