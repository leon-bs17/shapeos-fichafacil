import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUpRight,
  Check,
  Plus,
  Activity,
  CalendarDays,
  Dumbbell,
  TrendingUp,
} from "lucide-react";
import Logo from "@/davi/components/Logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import {
  LandingMotion,
  RotatingWord,
  MotionToggle,
} from "./presentation-motion";
import s from "./presentation.module.css";

export const metadata: Metadata = {
  title: "ShapeOS — Seu treino. Sua evolução.",
  description:
    "Conecte planejamento, treino e evolução. A ShapeOS aproxima personal trainers e alunos com fichas, agenda e acompanhamento em um só lugar.",
};

const resources = [
  {
    n: "01",
    name: "Planejar.",
    description: "Seu método ganha forma. Cada aluno ganha um plano.",
    tone: s.teal,
    Icon: Dumbbell,
    label: "PRESCRIÇÃO DE TREINOS",
    detail:
      "Organize exercícios, séries, repetições, cargas, intervalos e observações. Personalize a ficha com aquecimento e superséries para orientar cada etapa do treino.",
  },
  {
    n: "02",
    name: "Acompanhar.",
    description: "Mais proximidade, mesmo fora da academia.",
    tone: s.coral,
    Icon: CalendarDays,
    label: "ROTINA E CONSISTÊNCIA",
    detail:
      "Distribua treinos na agenda, acompanhe sessões registradas e consulte o histórico dos seus alunos. Quem treina tem a ficha e o cronômetro sempre à mão.",
  },
  {
    n: "03",
    name: "Evoluir.",
    description: "Transforme cada treino em uma história de progresso.",
    tone: s.lime,
    Icon: TrendingUp,
    label: "EVOLUÇÃO COM CONTEXTO",
    detail:
      "Visualize frequência, volume e evolução das cargas. Reúna avaliações e medidas para acompanhar o progresso e fundamentar os próximos ajustes.",
  },
];

export default function ApresentacaoPage() {
  return (
    <LandingMotion className={s.page}>
      <section className={s.hero} id="inicio" aria-labelledby="hero-title">
        <div className={s.atmosphere} aria-hidden="true">
          <div className={s.glow} />
          <div className={s.orbit}>
            <svg viewBox="0 0 800 800" fill="none">
              <defs>
                <linearGradient
                  id="shape-orbit"
                  x1="0"
                  y1="0"
                  x2="800"
                  y2="800"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop stopColor="#c9ff82" />
                  <stop offset=".45" stopColor="#65e7d5" />
                  <stop offset="1" stopColor="#16605e" />
                </linearGradient>
              </defs>
              <g stroke="url(#shape-orbit)" strokeWidth="1.2">
                {Array.from({ length: 24 }, (_, i) => (
                  <ellipse
                    key={i}
                    cx="400"
                    cy="400"
                    rx="320"
                    ry="130"
                    transform={`rotate(${i * 7.5} 400 400)`}
                  />
                ))}
              </g>
            </svg>
          </div>
          <div className={s.grain} />
        </div>
        <header className={s.header}>
          <Link
            href="#inicio"
            className={s.heroLogo}
            aria-label="ShapeOS — início"
          >
            <Logo size="sm" showTagline={false} />
          </Link>
          <div className={s.headerActions}>
            <nav className={s.nav} aria-label="Navegação da apresentação">
              <a href="#visao">A visão</a>
              <a href="#recursos">Recursos</a>
              <a href="#conexao">Para você</a>
              <Link href="/login" className={s.navCta}>
                Entrar <ArrowUpRight size={16} />
              </Link>
            </nav>
            <details className={s.mobileMenu}>
              <summary>
                Menu <Plus size={18} />
              </summary>
              <nav aria-label="Menu móvel">
                <a href="#visao">A visão</a>
                <a href="#recursos">Recursos</a>
                <a href="#conexao">Para você</a>
                <Link href="/login">
                  Entrar <ArrowUpRight size={16} />
                </Link>
              </nav>
            </details>
            <ThemeToggle />
          </div>
        </header>
        <div className={s.heroTitle}>
          <p className={s.eyebrow}>
            <span className={s.liveDot} /> TECNOLOGIA QUE ACOMPANHA SEU RITMO
          </p>
          <h1 id="hero-title">
            Seu <RotatingWord />.<br />
            Sua evolução.
          </h1>
        </div>
        <div className={s.heroBottom}>
          <div>
            <p>
              Você cuida do movimento.
              <br />A ShapeOS conecta o resto.
            </p>
            <span>
              Treinos, alunos e evolução.
              <br className={s.mobileBreak} /> Um só lugar. Mais possibilidades.
            </span>
          </div>
          <a href="#recursos" className={s.heroCta}>
            Explore a ShapeOS <ArrowDown size={19} />
          </a>
        </div>
        <MotionToggle />
      </section>

      <main>
        <section className={s.vision} id="visao" aria-labelledby="vision-title">
          <span className={s.eyebrow}>01 / A VISÃO</span>
          <h2 id="vision-title" data-reveal>
            O próximo passo do seu trabalho.
            <br />
            <span>E de cada pessoa que treina com você.</span>
          </h2>
          <p data-reveal>
            Menos tempo entre planilhas, mensagens e fichas soltas. Mais espaço
            para planejar, acompanhar e perceber a evolução de verdade.
          </p>
        </section>

        <section
          className={s.resources}
          id="recursos"
          aria-label="Recursos ShapeOS"
        >
          {resources.map(
            ({ n, name, description, tone, Icon, label, detail }, index) => (
              <article key={n} className={`${s.resource} ${tone}`} data-reveal>
                <div className={s.resourceTop}>
                  <span>{n}.</span>
                  <Icon size={22} strokeWidth={1.5} />
                </div>
                <p className={s.resourceIntro}>{description}</p>
                <div className={s.art} aria-hidden="true">
                  {index === 0 ? (
                    <div className={s.workoutArt}>
                      <div>
                        <span>TREINO A</span>
                        <span>FORÇA ↗</span>
                      </div>
                      {[
                        ["Agachamento", "3 × 12"],
                        ["Supino reto", "3 × 10"],
                        ["Remada", "3 × 12"],
                      ].map(([exercise, sets], i) => (
                        <div key={exercise}>
                          <b>0{i + 1}</b>
                          <span>{exercise}</span>
                          <span>{sets}</span>
                        </div>
                      ))}
                    </div>
                  ) : index === 1 ? (
                    <div className={s.weekArt}>
                      <span>SUA SEMANA EM MOVIMENTO</span>
                      <div>
                        {["S", "T", "Q", "Q", "S", "S", "D"].map((day, i) => (
                          <span
                            key={i}
                            className={i % 2 === 0 && i < 5 ? s.activeDay : ""}
                          >
                            {day}
                            <b>
                              {i % 2 === 0 && i < 5 ? <Check size={17} /> : "·"}
                            </b>
                          </span>
                        ))}
                      </div>
                      <p>
                        <Activity size={16} /> Um treino de cada vez.
                      </p>
                    </div>
                  ) : (
                    <div className={s.chartArt}>
                      <span>PROGRESSO QUE VOCÊ ENXERGA</span>
                      <svg viewBox="0 0 300 120">
                        <path
                          d="M0 100H300M0 60H300M0 20H300"
                          stroke="currentColor"
                          opacity=".12"
                        />
                        <path
                          d="M5 100L55 86L100 90L148 58L198 65L249 28L292 10"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <circle cx="292" cy="10" r="5" fill="currentColor" />
                      </svg>
                      <p>Histórico · Cargas · Frequência</p>
                    </div>
                  )}
                </div>
                <span className={s.micro}>{label}</span>
                <h3>{name}</h3>
                <details className={s.resourceDetails}>
                  <summary>
                    Conhecer recurso <Plus size={20} />
                  </summary>
                  <p>{detail}</p>
                </details>
              </article>
            ),
          )}
        </section>

        <div className={s.marquee} aria-label="Seu movimento tem futuro">
          <div aria-hidden="true">
            {[0, 1, 2, 3].map((i) => (
              <span key={i}>
                Seu movimento tem futuro{" "}
                <span className={s.marqueeStar}>✳</span>{" "}
              </span>
            ))}
          </div>
        </div>

        <section
          className={s.connection}
          id="conexao"
          aria-labelledby="connection-title"
        >
          <div className={s.connectionIntro} data-reveal>
            <span className={s.eyebrow}>02 / A CONEXÃO</span>
            <h2 id="connection-title">
              Dois lados.
              <br />O mesmo
              <br />
              <em>objetivo.</em>
            </h2>
            <p>
              Quem orienta e quem treina, em sintonia. Uma experiência feita
              para o que importa: continuar evoluindo.
            </p>
          </div>
          <div className={s.audiences}>
            <article data-reveal>
              <span className={s.micro}>PARA PERSONAL TRAINERS</span>
              <h3>
                Seu método.
                <br />
                Mais alcance.
              </h3>
              <p>
                Conheça a rotina de cada aluno, organize suas fichas e use o
                histórico para decidir o próximo passo.
              </p>
              <ul>
                <li>
                  <Check size={16} /> Prescrições do seu jeito
                </li>
                <li>
                  <Check size={16} /> Alunos e agenda organizados
                </li>
                <li>
                  <Check size={16} /> Evolução para acompanhar
                </li>
              </ul>
              <Link href="/cadastro">
                Criar conta de personal <ArrowUpRight size={20} />
              </Link>
            </article>
            <article data-reveal>
              <span className={s.micro}>PARA QUEM TREINA</span>
              <h3>
                Abra a ficha.
                <br />
                Entre no ritmo.
              </h3>
              <p>
                Saiba o que fazer, registre suas séries e acompanhe suas
                conquistas. No celular, junto com você.
              </p>
              <ul>
                <li>
                  <Check size={16} /> Treino guiado e intervalo cronometrado
                </li>
                <li>
                  <Check size={16} /> Registro de cargas e repetições
                </li>
                <li>
                  <Check size={16} /> Histórico sempre por perto
                </li>
              </ul>
              <Link href="/cadastro/aluno">
                Criar conta de aluno <ArrowUpRight size={20} />
              </Link>
            </article>
          </div>
        </section>

        <section className={s.method} aria-labelledby="method-title">
          <div data-reveal>
            <span className={s.eyebrow}>03 / NO SEU RITMO</span>
            <h2 id="method-title">
              Da primeira ficha
              <br />
              ao próximo recorde.
            </h2>
          </div>
          <div className={s.steps}>
            {[
              [
                "01",
                "Conecte.",
                "Crie sua conta e reúna personal e aluno na mesma plataforma.",
              ],
              [
                "02",
                "Planeje.",
                "Organize a ficha e a semana de acordo com cada objetivo.",
              ],
              [
                "03",
                "Acompanhe.",
                "Registre o treino, consulte o histórico e ajuste o próximo passo.",
              ],
            ].map(([n, title, text]) => (
              <div key={n} data-reveal>
                <span>{n}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className={s.cta} aria-labelledby="cta-title">
          <div className={s.ctaGlow} aria-hidden="true" />
          <span className={s.eyebrow}>SEU PRÓXIMO PASSO COMEÇA AQUI</span>
          <h2 id="cta-title" data-reveal>
            Menos distância.
            <br />
            Mais <em>evolução.</em>
          </h2>
          <div className={s.ctaLinks}>
            <Link href="/cadastro" className={s.heroCta}>
              Começar como personal <ArrowUpRight size={19} />
            </Link>
            <Link href="/login">
              Já tenho uma conta <ArrowUpRight size={18} />
            </Link>
          </div>
          <p>No computador ou no celular. No seu ritmo.</p>
        </section>
      </main>

      <footer className={s.footer}>
        <div className={s.footerTop}>
          <div>
            <Link href="#inicio" aria-label="ShapeOS — voltar ao início">
              <Logo size="sm" showTagline={false} />
            </Link>
            <p>
              O treino conecta.
              <br />A evolução aproxima.
            </p>
          </div>
          <nav aria-label="Links do rodapé">
            <a href="#recursos">Recursos</a>
            <Link href="/cadastro">Sou personal</Link>
            <Link href="/cadastro/aluno">Sou aluno</Link>
            <Link href="/login">Entrar na plataforma</Link>
          </nav>
          <a href="#inicio" className={s.backTop}>
            Voltar ao topo <ArrowUpRight size={19} />
          </a>
        </div>
        <div className={s.footerBottom}>
          <span>© {new Date().getFullYear()} ShapeOS · Ficha Fácil</span>
          <span>FEITO PARA MANTER VOCÊ EM MOVIMENTO</span>
        </div>
      </footer>
    </LandingMotion>
  );
}
