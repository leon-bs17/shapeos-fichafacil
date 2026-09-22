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
import { ArrowRight, Eye, EyeOff, KeyRound, Lock, Mail } from 'lucide-react'
import { Logo } from '@/components/layout/logo'

export default function LoginPage() {
  const router = useRouter()
  const [tipo, setTipo] = useState<'PERSONAL' | 'ALUNO'>('PERSONAL')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [captchaToken, setCaptchaToken] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)

    const parsed = loginSchema.safeParse({ email, senha })
    if (!parsed.success) {
      setErro(parsed.error.issues[0]?.message ?? 'Dados inválidos')
      return
    }

    if (captchaAtivo() && !captchaToken) {
      setErro('Confirme a verificação anti-robô antes de continuar.')
      return
    }

    setCarregando(true)
    const supabase = createClient()
    const { data, error: erroAuth } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.senha,
      options: { captchaToken: captchaToken || undefined },
    })

    if (erroAuth) {
      setCaptchaToken('')
      setErro(
        erroAuth.message.includes('not confirmed')
          ? 'Seu e-mail ainda não foi confirmado. Abra o link que enviamos na hora do cadastro e tente novamente.'
          : 'E-mail ou senha incorretos.'
      )
      setCarregando(false)
      return
    }

    const { data: perfil } = await supabase
      .from('usuarios')
      .select('tipo')
      .eq('id', data.user.id)
      .single()

    if (perfil?.tipo === 'ADMIN') {
      router.push('/admin')
    } else if (perfil?.tipo === 'ALUNO') {
      router.push('/painel')
    } else {
      router.push('/')
    }
    router.refresh()
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
          <div className="mb-6">
            <p className="shapeos-eyebrow mb-3">Acesso ShapeOS</p>
            <h1 className="shapeos-title text-3xl">Acesse sua ficha</h1>
            <p className="mt-3 text-sm text-zinc-500">Entre para treinar ou gerenciar sua base.</p>
          </div>

          <div className="mb-6 grid grid-cols-2 gap-1 rounded-2xl border border-white/[0.06] bg-white/[0.025] p-1" role="radiogroup" aria-label="Tipo de conta">
            {(['PERSONAL', 'ALUNO'] as const).map((opcao) => (
              <button
                key={opcao}
                type="button"
                role="radio"
                aria-checked={tipo === opcao}
                onClick={() => {
                  setTipo(opcao)
                  setErro(null)
                }}
                className={tipo === opcao
                  ? 'rounded-xl bg-[#00D2D2] px-3 py-2.5 text-sm font-semibold text-[#1A1A1A] shadow-[0_6px_20px_rgba(0,210,210,.28)] transition-all'
                  : 'rounded-xl px-3 py-2.5 text-sm font-medium text-zinc-500 transition-all hover:text-[#F5F5F5]'}
              >
                {opcao === 'PERSONAL' ? 'Personal (ADM)' : 'Aluno'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email" className="shapeos-eyebrow">E-mail</Label>
              <div className="relative mt-2">
                <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <Input
                  id="email"
                  type="email"
                  placeholder="voce@shapeos.app"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                  disabled={carregando}
                  className="h-12 rounded-xl pl-11 pr-4"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="senha" className="shapeos-eyebrow">Senha</Label>
                <Link href="/admin/redefinir-senha" className="text-xs text-[#00D2D2] hover:underline">
                  Esqueceu a senha?
                </Link>
              </div>
              <div className="relative mt-2">
                <KeyRound className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <Input
                  id="senha"
                  type={mostrarSenha ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  autoComplete="current-password"
                  required
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
              <Lock className="h-4 w-4" />
              {carregando ? 'Entrando...' : 'Acessar Ficha'}
              {!carregando ? <ArrowRight className="h-4 w-4" /> : null}
            </Button>
          </form>

          <div className="mt-6 border-t border-white/[0.06] pt-5 text-center text-sm text-zinc-500">
            {tipo === 'PERSONAL' ? (
              <>
                Não tem conta?{' '}
                <Link href="/cadastro" className="font-medium text-[#00D2D2] hover:underline">
                  Cadastre-se grátis
                </Link>
              </>
            ) : (
              'Alunos recebem acesso pelo convite enviado pelo personal.'
            )}
          </div>
        </section>
      </div>
    </main>
  )
}
