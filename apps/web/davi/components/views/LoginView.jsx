'use client';

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Github,
  KeyRound,
  Mail,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Logo from "@/davi/components/Logo";

export const LoginView = ({ onEnter, onGithub, error }) => {
  const [role, setRole] = useState("personal");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onEnter(role, email, password);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground" data-testid="login-view">
      <div className="mx-auto grid min-h-screen max-w-7xl lg:grid-cols-[1.05fr_.95fr]">
        <section className="relative hidden overflow-hidden border-r border-border/60 px-12 py-10 lg:flex lg:flex-col lg:justify-between">
          <div className="absolute inset-0 tech-grid-subtle opacity-60" aria-hidden="true" />
          <div className="absolute -left-36 top-24 h-96 w-96 rounded-full bg-primary/10 blur-3xl" aria-hidden="true" />

          <div className="relative">
            <Logo size="lg" />
          </div>

          <div className="relative max-w-xl pb-10">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-primary/8 px-3 py-1.5 text-[11px] font-semibold text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              Operação de treino sem ruído
            </div>
            <h1 className="max-w-lg text-5xl font-semibold leading-[1.02] tracking-[-0.045em]">
              Sua rotina de alunos em um lugar que parece simples porque foi bem pensado.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-muted-foreground">
              Fichas, exercícios, acompanhamento e execução em uma experiência rápida para personal e aluno.
            </p>
          </div>

          <div className="relative flex items-center gap-2 text-xs text-muted-foreground">
            <span>ShapeOS</span>
            <span>·</span>
            <span>Produto Dream Vision®</span>
          </div>
        </section>

        <main className="flex items-center justify-center px-5 py-10 sm:px-10">
          <div className="w-full max-w-md">
            <div className="mb-9 flex justify-center lg:hidden">
              <Logo size="lg" />
            </div>

            <div className="mb-7">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Acesso</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-[-0.035em]">Entre no ShapeOS</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Use sua conta de personal ou o acesso recebido pelo seu personal.
              </p>
            </div>

            <div
              role="radiogroup"
              aria-label="Tipo de acesso"
              className="mb-6 grid grid-cols-2 rounded-2xl bg-foreground/[0.035] p-1"
              data-testid="role-tabs"
            >
              <button
                type="button"
                role="radio"
                aria-checked={role === "personal"}
                data-testid="role-tab-personal"
                onClick={() => setRole("personal")}
                className={
                  "rounded-xl px-3 py-2.5 text-sm font-semibold transition " +
                  (role === "personal"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground")
                }
              >
                Sou personal
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={role === "aluno"}
                data-testid="role-tab-aluno"
                onClick={() => setRole("aluno")}
                className={
                  "rounded-xl px-3 py-2.5 text-sm font-semibold transition " +
                  (role === "aluno"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground")
                }
              >
                Sou aluno
              </button>
            </div>

            {role === "aluno" ? (
              <div className="mb-5 rounded-2xl bg-info/8 px-4 py-3 text-xs leading-5 text-muted-foreground">
                Alunos recebem acesso pelo convite do personal. Entre com o e-mail cadastrado no convite.
              </div>
            ) : null}

            {error ? (
              <div role="alert" className="mb-5 rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            ) : null}

            {role === "personal" ? (
              <>
                <button
                  type="button"
                  onClick={onGithub}
                  className="flex h-11 w-full items-center justify-center gap-2.5 rounded-2xl bg-foreground text-background text-sm font-semibold transition hover:opacity-90"
                >
                  <Github className="h-4 w-4" />
                  Continuar com GitHub
                </button>

                <div className="my-5 flex items-center gap-3">
                  <div className="h-px flex-1 bg-border/70" />
                  <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">ou</span>
                  <div className="h-px flex-1 bg-border/70" />
                </div>
              </>
            ) : null}

            <form onSubmit={handleSubmit} className="space-y-4">
              <label className="block">
                <span className="mb-2 block text-xs font-semibold text-muted-foreground">E-mail</span>
                <span className="relative block">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    aria-label="E-mail"
                    data-testid="login-email-input"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="voce@exemplo.com"
                    className="h-12 w-full rounded-2xl bg-field pl-11 pr-4 text-sm outline-none shadow-[inset_0_0_0_1px_hsl(var(--border)/0.68)] transition placeholder:text-muted-foreground/55 hover:shadow-[inset_0_0_0_1px_hsl(var(--border))] focus:shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.7),0_0_0_3px_hsl(var(--primary)/0.12)]"
                  />
                </span>
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-semibold text-muted-foreground">Senha</span>
                <span className="relative block">
                  <KeyRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    aria-label="Senha"
                    data-testid="login-password-input"
                    type="password"
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Sua senha"
                    className="h-12 w-full rounded-2xl bg-field pl-11 pr-4 text-sm outline-none shadow-[inset_0_0_0_1px_hsl(var(--border)/0.68)] transition placeholder:text-muted-foreground/55 hover:shadow-[inset_0_0_0_1px_hsl(var(--border))] focus:shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.7),0_0_0_3px_hsl(var(--primary)/0.12)]"
                  />
                </span>
              </label>

              <button
                type="submit"
                data-testid="login-submit-button"
                disabled={submitting}
                className="group flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-sm font-semibold text-primary-foreground shadow-[0_12px_26px_hsl(var(--primary)/0.16)] transition hover:-translate-y-px hover:brightness-105 disabled:pointer-events-none disabled:opacity-60"
              >
                {submitting ? "Entrando..." : "Entrar"}
                {!submitting ? <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" /> : null}
              </button>
            </form>

            <div className="mt-6 flex items-center justify-between gap-4">
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                Sessão protegida pelo Supabase Auth
              </div>
              {role === "personal" ? (
                <Link href="/cadastro" className="text-xs font-semibold text-primary hover:underline">
                  Cadastre-se
                </Link>
              ) : null}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default LoginView;
