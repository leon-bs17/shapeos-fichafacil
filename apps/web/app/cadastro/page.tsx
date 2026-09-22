'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { loginSchema } from '@shapeos/shared'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Captcha, captchaAtivo } from '@/components/ui/captcha'
import { createClient } from '@/lib/supabase/client'
import { ArrowRight, CheckCircle2, Eye, EyeOff, KeyRound, Mail, User } from 'lucide-react'
import { Logo } from '@/components/layout/logo'

export default function CadastroPage() {
  const router = useRouter()
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [captchaToken, setCaptchaToken] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [aguardandoEmail, setAguardandoEmail] = useState(false)
  const [carregando, setCarregando] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)

    const parsed = loginSchema.safeParse({ email, senha })
    if (!parsed.success) {
      setErro(parsed.error.issues[0]?.message ?? 'Dados inválidos')
      return
    }
    if (nome.trim().length < 2) {
      setErro('Informe seu nome.')
      return
    }
    if (captchaAtivo() && !captchaToken) {
      setErro('Confirme a verificação anti-robô.')
      return
    }

    setCarregando(true)
    const supabase = createClient()
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.senha,
      options: {
        data: { nome: nome.trim(), tipo: 'PERSONAL' },
        captchaToken: captchaToken || undefined,
      },
    })

    if (error) {
      setErro(
        error.message.includes('already')
          ? 'Este e-mail já possui conta. Faça login.'
          : error.message.includes('captcha')
            ? 'Verificação anti-robô falhou.'
            : 'Não foi possível criar a conta.'
      )
      setCarregando(false)
      setCaptchaToken('')
      return
    }

    if (data.session) {
      router.push('/')
      router.refresh()
      return
    }

    setCarregando(false)
    setAguardandoEmail(true)
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#1A1A1A] px-4 py-12 text-[#F5F5F5]">
      <div className="pointer-events-none absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full blur-3xl opacity-30" style={{ background: 'radial-gradient(circle, #00D2D2 0%, transparent 70%)' }} />
      <div className="pointer-events-none absolute -bottom-40 -right-32 h-[520px] w-[520px] rounded-full blur-3xl opacity-20" style={{ background: 'radial-gradient(circle, #FF7043 0%, transparent 70%)' }} />
      <div className="pointer-events-none absolute inset-0 tech-grid opacity-40" />
      <div className="pointer-events-none absolute inset-0 tech-noise" />

      <div className="relative z-10 w-full max-w-md animate-fade-in">
        <div className="mb-9 flex justify-center">
          <Logo size="xl" stacked />
        </div>

        <section className="shapeos-panel rounded-3xl p-7 sm:p-8">
          {aguardandoEmail ? (
            <div className="py-3 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-[#00D2D2]/30 bg-[#00D2D2]/10">
                <CheckCircle2 className="h-8 w-8 text-[#00D2D2]" />
              </div>
              <p className="shapeos-eyebrow mt-6">Cadastro concluído</p>
              <h1 className="shapeos-title mt-3 text-2xl">Confirme seu e-mail</h1>
              <p className="mt-4 text-sm leading-6 text-zinc-400">
                Enviamos um link de confirmação para <span className="font-medium text-[#F5F5F5]">{email}</span>.
              </p>
              <Link href="/login" className="mt-6 block">
                <Button variant="outline" className="h-12 w-full rounded-xl border-white/10 bg-white/[0.03]">
                  Voltar ao login
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <p className="shapeos-eyebrow mb-3">Novo personal</p>
                <h1 className="shapeos-title text-3xl">Crie sua conta</h1>
                <p className="mt-3 text-sm text-zinc-500">Gerencie alunos, fichas e evolução em um só lugar.</p>
              </div>

              <div className="mb-5 rounded-xl border border-[#00D2D2]/15 bg-[#00D2D2]/[0.06] px-4 py-3 text-center text-xs leading-5 text-zinc-400">
                Seus alunos entram pelo convite enviado dentro do painel.
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="nome" className="shapeos-eyebrow">Nome completo</Label>
                  <div className="relative mt-2">
                    <User className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                    <Input
                      id="nome"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      placeholder="Seu nome completo"
                      required
                      autoComplete="name"
                      disabled={carregando}
                      className="h-12 rounded-xl pl-11"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="email" className="shapeos-eyebrow">E-mail</Label>
                  <div className="relative mt-2">
                    <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="voce@shapeos.app"
                      required
                      autoComplete="email"
                      disabled={carregando}
                      className="h-12 rounded-xl pl-11"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="senha" className="shapeos-eyebrow">Senha</Label>
                  <div className="relative mt-2">
                    <KeyRound className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                    <Input
                      id="senha"
                      type={mostrarSenha ? 'text' : 'password'}
                      value={senha}
                      onChange={(e) => setSenha(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      required
                      autoComplete="new-password"
                      disabled={carregando}
                      className="h-12 rounded-xl pl-11 pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setMostrarSenha((v) => !v)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 transition-colors hover:text-[#F5F5F5]"
                      aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                    >
                      {mostrarSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Captcha onToken={setCaptchaToken} />

                {erro ? (
                  <div className="rounded-xl border border-red-400/20 bg-red-400/[0.07] px-4 py-3">
                    <p className="text-sm text-red-300" role="alert">{erro}</p>
                  </div>
                ) : null}

                <Button
                  type="submit"
                  disabled={carregando || (captchaAtivo() && !captchaToken)}
                  className="shapeos-orange h-13 w-full rounded-2xl border-0 text-base font-semibold"
                >
                  {carregando ? 'Criando conta...' : 'Criar conta gratuita'}
                  {!carregando ? <ArrowRight className="h-4 w-4" /> : null}
                </Button>
              </form>

              <p className="mt-6 text-center text-sm text-zinc-500">
                Já tem conta?{' '}
                <Link href="/login" className="font-medium text-[#00D2D2] hover:underline">Entrar</Link>
              </p>
            </>
          )}
        </section>
      </div>
    </main>
  )
}
