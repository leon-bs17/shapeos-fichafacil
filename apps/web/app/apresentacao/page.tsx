import Link from 'next/link'

export default function ApresentacaoPage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <section className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-24 md:px-10 lg:flex-row lg:items-center">
        <div className="flex-1">
          <p className="mb-5 inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-300">
            ShapeOS · Gestão inteligente de treinos
          </p>
          <h1 className="text-5xl font-bold tracking-tight md:text-7xl">
            O sistema operacional do personal trainer moderno.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-zinc-400">
            Crie fichas de treino, acompanhe alunos e organize sua operação em
            uma única plataforma criada para profissionais de performance.
          </p>
          <div className="mt-8 flex gap-4">
            <Link href="/login" className="rounded-xl bg-white px-6 py-3 font-semibold text-black">
              Começar agora
            </Link>
            <Link href="#recursos" className="rounded-xl border border-white/20 px-6 py-3 font-semibold">
              Conhecer recursos
            </Link>
          </div>
        </div>

        <div className="flex-1 rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 to-white/5 p-8 shadow-2xl">
          <div className="rounded-2xl bg-black/40 p-6">
            <p className="text-sm text-zinc-400">Dashboard ShapeOS</p>
            <h2 className="mt-4 text-3xl font-bold">Seus alunos. Seus treinos. Seu controle.</h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {['Fichas dinâmicas', 'Evolução dos alunos', 'Biblioteca de exercícios', 'Gestão profissional'].map((item) => (
                <div key={item} className="rounded-xl border border-white/10 bg-white/5 p-4 text-zinc-200">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="recursos" className="mx-auto grid max-w-6xl gap-6 px-6 pb-24 md:grid-cols-3">
        {[
          ['Prescrição rápida', 'Monte e atualize treinos sem perder tempo.'],
          ['Acompanhamento', 'Tenha visão clara da rotina dos seus alunos.'],
          ['Escala profissional', 'Transforme seu atendimento em uma operação organizada.'],
        ].map(([title, text]) => (
          <article key={title} className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h3 className="text-xl font-bold">{title}</h3>
            <p className="mt-3 text-zinc-400">{text}</p>
          </article>
        ))}
      </section>
    </main>
  )
}
