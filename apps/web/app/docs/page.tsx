import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Database, KeyRound, Megaphone, Sparkles } from 'lucide-react'
import { Breadcrumbs } from '@/components/ui/breadcrumbs'
import { CodeBlock } from '@/components/ui/code-block'
import { DocsTree } from '@/components/docs/docs-tree'
import { Logo } from '@/components/layout/logo'
import { ProductFooter } from '@/components/layout/product-footer'

const authCode = `const supabase = createClient()

const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password,
})`;

const fichaCode = `const { data: fichaId, error } = await supabase.rpc('criar_ficha_atomica', {
  p_aluno_id: alunoId,
  p_titulo: 'Push A',
  p_itens: [
    {
      exercicio_id: exercicioId,
      series: 4,
      repeticoes: '8-10',
      descanso_segundos: 90,
      ordem: 0,
    },
  ],
})`;

const registroCode = `const { error } = await supabase
  .from('registro_execucao')
  .insert({
    aluno_id: user.id,
    item_treino_id: itemId,
    carga_utilizada: 72.5,
    repeticoes_feitas: 10,
  })`;

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5">
          <Logo size="md" />
          <span className="text-xs font-semibold text-muted-foreground">Documentação</span>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-8 px-5 py-8 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <div className="sticky top-24">
            <DocsTree />
          </div>
        </aside>

        <main className="min-w-0">
          <Breadcrumbs items={[{ label: 'ShapeOS', href: '/' }, { label: 'Docs' }]} />

          <section id="visao-geral" className="pt-6">
            <div className="mb-8">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/8 px-3 py-1.5 text-[11px] font-semibold text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                Docs do produto
              </div>
              <h1 className="max-w-3xl text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">
                Entenda como o ShapeOS organiza acesso, treinos e dados.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
                Esta documentação descreve os fluxos que já existem na plataforma. Os exemplos usam o cliente Supabase do próprio projeto e respeitam RLS.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <InfoCard icon={KeyRound} title="Auth" text="E-mail, senha e OAuth com sessão Supabase." />
              <InfoCard icon={Database} title="Treinos" text="Criação e edição de ficha em transações atômicas." />
              <InfoCard icon={Megaphone} title="Broadcast" text="Avisos por público com leitura individual." />
            </div>
          </section>

          <Section id="autenticacao" title="Autenticação" description="O browser usa a sessão Supabase. O papel real vem de public.usuarios e o middleware direciona personal, aluno e admin.">
            <CodeBlock code={authCode} language="ts" title="Login com e-mail" />
          </Section>

          <Section id="ficha-atomica" title="Ficha atômica" description="A criação da ficha e dos exercícios acontece em uma única transação no banco. Se um item falhar, a ficha inteira volta atrás.">
            <CodeBlock code={fichaCode} language="ts" title="Criar ficha" />
          </Section>

          <Section id="registro-execucao" title="Registro de execução" description="O aluno registra carga e repetições. As policies garantem que ele só escreva nos próprios treinos.">
            <CodeBlock code={registroCode} language="ts" title="Registrar execução" />
          </Section>

          <Section id="planos" title="Planos" description="Contas de personal podem ser Starter, Pro ou Dream. O plano é administrado pelo painel de admin e exibido no perfil da topbar.">
            <div className="grid gap-3 sm:grid-cols-3">
              {['Starter', 'Pro', 'Dream'].map((plan) => (
                <div key={plan} className="rounded-2xl bg-card p-4 shadow-[inset_0_0_0_1px_hsl(var(--border)/0.7)]">
                  <p className="text-sm font-semibold">{plan}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">Camada comercial configurável pelo administrador.</p>
                </div>
              ))}
            </div>
          </Section>

          <Section id="broadcasts" title="Broadcasts" description="O admin cria mensagens segmentadas para todos, personais, alunos ou admins. Elas aparecem como banner e também no sino de notificações." />

          <ProductFooter />
        </main>
      </div>
    </div>
  )
}

function Section({ id, title, description, children }: { id: string; title: string; description: string; children?: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-border/60 py-10">
      <div className="mb-5">
        <h2 className="text-2xl font-semibold tracking-[-0.025em]">{title}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  )
}

function InfoCard({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return (
    <div className="rounded-2xl bg-card p-4 shadow-[inset_0_0_0_1px_hsl(var(--border)/0.7)]">
      <Icon className="h-4 w-4 text-primary" />
      <p className="mt-3 text-sm font-semibold">{title}</p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{text}</p>
    </div>
  )
}
