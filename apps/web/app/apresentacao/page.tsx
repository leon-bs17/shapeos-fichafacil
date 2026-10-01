import Link from 'next/link'
import { ArrowRight, CalendarDays, Check, ClipboardList, Dumbbell, LayoutDashboard, Users } from 'lucide-react'
import Logo from '@/davi/components/Logo'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'

const features = [
  { icon: ClipboardList, title: 'Prescrição organizada', text: 'Monte fichas, ajuste exercícios e reaproveite seus modelos de treino.' },
  { icon: Users, title: 'Cada aluno no seu ritmo', text: 'Organize sua base e consulte a programação de cada aluno em um só lugar.' },
  { icon: CalendarDays, title: 'A semana fica clara', text: 'Distribua os treinos ao longo da semana e facilite a rotina de quem treina.' },
]

export default function ApresentacaoPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex min-h-20 max-w-7xl items-center justify-between gap-4 px-5 md:px-8">
          <Link href="/apresentacao" aria-label="ShapeOS — apresentação"><Logo size="sm" /></Link>
          <nav aria-label="Navegação principal" className="flex items-center gap-3 md:gap-6">
            <Link href="#recursos" className="hidden text-sm text-muted-foreground hover:text-foreground sm:block">Recursos</Link>
            <Link href="/login" className={buttonVariants({ variant: 'outline', size: 'sm' })}>Entrar <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-16 md:px-8 md:py-24 lg:grid-cols-2 lg:gap-16">
        <div>
          <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" /> Para personal trainers e alunos
          </p>
          <h1 className="max-w-2xl text-4xl font-semibold leading-[1.12] tracking-tight sm:text-5xl xl:text-6xl">Mais clareza na gestão.<br /><span className="text-primary">Mais foco no treino.</span></h1>
          <p className="mt-6 max-w-lg text-base leading-relaxed text-muted-foreground md:text-lg">Fichas, alunos e programação semanal em uma plataforma. Seu atendimento organizado, do planejamento à execução.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/cadastro" className={buttonVariants({ size: 'lg' })}>Criar minha conta <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
            <Link href="#recursos" className={buttonVariants({ variant: 'outline', size: 'lg' })}>Explorar recursos</Link>
          </div>
          <p className="mt-5 flex items-center gap-2 text-xs text-muted-foreground"><Check className="h-3.5 w-3.5" aria-hidden="true" /> Acesso pelo navegador, no computador e no celular.</p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-2xl shadow-black/20" aria-label="Exemplo ilustrativo do painel ShapeOS">
          <div className="flex items-center justify-between border-b border-border px-5 py-4"><span className="flex items-center gap-2 text-sm font-medium"><LayoutDashboard className="h-4 w-4 text-muted-foreground" aria-hidden="true" /> Seu espaço de trabalho</span><span className="text-xs text-muted-foreground">Ilustração</span></div>
          <div className="p-5 sm:p-7">
            <p className="text-xs text-muted-foreground">PAINEL DO PERSONAL</p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight">Tudo pronto para a semana.</h2>
            <div className="my-6 grid grid-cols-2 gap-3">
              {[['Alunos', 'Organizados'], ['Fichas', 'Em um só lugar']].map(([label, value]) => <div key={label} className="rounded-xl border border-border bg-background/50 p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-2 text-sm font-semibold">{value}</p></div>)}
            </div>
            <div className="rounded-xl border border-border p-4">
              <div className="flex items-center justify-between gap-3"><span className="text-sm font-medium">Programação semanal</span><CalendarDays className="h-4 w-4 text-muted-foreground" aria-hidden="true" /></div>
              <div className="mt-4 grid grid-cols-5 gap-2">{['Seg', 'Ter', 'Qua', 'Qui', 'Sex'].map((day, index) => <div key={day} className="rounded-lg bg-background p-2 text-center"><p className="text-[10px] text-muted-foreground">{day}</p><p className={`mt-2 text-sm font-medium ${index % 2 === 0 ? 'text-primary' : 'text-muted-foreground'}`}>{index % 2 === 0 ? 'A' : 'B'}</p></div>)}</div>
            </div>
            <div className="mt-4 flex items-center gap-3 rounded-xl bg-primary/5 p-4"><Dumbbell className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" /><div><p className="text-sm font-medium">O próximo treino começa aqui</p><p className="mt-1 text-xs text-muted-foreground">Exercícios e fichas sempre à mão.</p></div></div>
          </div>
        </div>
      </section>

      <section id="recursos" className="scroll-mt-8 border-y border-border bg-card/30">
        <div className="mx-auto max-w-7xl px-5 py-16 md:px-8">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Do planejamento à rotina</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight md:text-3xl">Menos ferramentas espalhadas. Mais organização.</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">{features.map(({ icon: Icon, title, text }) => <Card key={title}><CardHeader><Icon className="mb-3 h-5 w-5 text-muted-foreground" aria-hidden="true" /><CardTitle className="text-base">{title}</CardTitle></CardHeader><CardContent><CardDescription className="leading-relaxed">{text}</CardDescription></CardContent></Card>)}</div>
        </div>
      </section>
      <section className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-16 md:flex-row md:items-center md:justify-between md:px-8"><div><h2 className="text-2xl font-semibold tracking-tight">Seu trabalho merece um espaço organizado.</h2><p className="mt-3 text-sm text-muted-foreground">Conheça a ShapeOS e encontre seu próximo passo.</p></div><Link href="/login" className={buttonVariants({ size: 'lg' })}>Acessar a plataforma <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link></section>
      <footer className="border-t border-border"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-6 text-xs text-muted-foreground md:px-8"><span>ShapeOS · Ficha Fácil</span><Link href="/cadastro/aluno" className="hover:text-foreground">Sou aluno · Criar conta</Link></div></footer>
    </main>
  )
}
