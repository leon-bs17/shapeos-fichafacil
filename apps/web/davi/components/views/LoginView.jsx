'use client';

import React, { useState } from "react";
import { Lock, Mail, KeyRound, ShieldCheck, ArrowRight, Fingerprint, CheckCircle2 } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";

export const LoginView = ({ onEnter, onBiometric, error }) => {
  const [role, setRole] = useState("personal"); // "personal" | "aluno" | "admin"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [bioState, setBioState] = useState("idle"); // idle | scanning | success | error
  const [bioError, setBioError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try { await onEnter(role, email, password); } finally { setSubmitting(false); }
  };

  const handleBiometric = async () => {
    if (bioState === "scanning") return;
    setBioError("");
    setBioState("scanning");

    try {
      await onBiometric?.();
      setBioState("success");
    } catch (error) {
      setBioState("error");
      setBioError(error instanceof Error ? error.message : "Não foi possível autenticar com biometria.");
    }
  };

  const activeTabStyle = (tab) => ({
    fontFamily: "'Sora', sans-serif",
    background: role === tab ? "#22C7C7" : "transparent",
    boxShadow: "none",
  });

  const tabClass = (tab) => `py-2.5 lg:py-2 rounded-xl text-sm lg:text-xs font-medium transition-all duration-300 ${
    role === tab ? "text-[#0E1116]" : "text-zinc-400 hover:text-[#F5F7FA]"
  }`;

  return (
    <AuthShell testId="login-view">
        <div
          className="rounded-xl p-6 sm:p-7"
          style={{
            background: "linear-gradient(160deg, rgba(255,255,255,0.05), rgba(255,255,255,0.015))",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "none",
          }}
        >
          <div className="mb-6 lg:mb-4">
            <h1
              className="text-3xl lg:text-2xl text-[#F5F7FA] tracking-tight"
              style={{ fontFamily: "'Sora', sans-serif", fontWeight: 600 }}
            >
              Bem-vindo à ShapeOS
            </h1>
            <p className="text-sm leading-relaxed text-zinc-400 mt-2" style={{ fontFamily: "'Sora', sans-serif" }}>
              Entre para treinar, gerenciar sua base ou administrar a plataforma.
            </p>
          </div>

          <div
            className="grid grid-cols-3 gap-1 p-1 rounded-2xl mb-6 lg:mb-4"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
            data-testid="role-tabs"
          >
            <button
              type="button"
              data-testid="role-tab-personal"
              onClick={() => setRole("personal")}
              className={tabClass("personal")}
              style={activeTabStyle("personal")}
            >
              Personal
            </button>
            <button
              type="button"
              data-testid="role-tab-aluno"
              onClick={() => setRole("aluno")}
              className={tabClass("aluno")}
              style={activeTabStyle("aluno")}
            >
              Aluno
            </button>
            <button
              type="button"
              data-testid="role-tab-admin"
              onClick={() => setRole("admin")}
              className={tabClass("admin")}
              style={activeTabStyle("admin")}
            >
              Admin
            </button>
          </div>

          {error && <p role="alert" className="mb-4 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
          <form aria-busy={submitting} onSubmit={handleSubmit} className="space-y-4" style={{ fontFamily: "'Sora', sans-serif" }}>
            <div>
              <label htmlFor="login-email" className="text-sm text-zinc-300">E-mail</label>
              <div className="mt-2 relative">
                <Mail className="w-4 h-4 text-zinc-500 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  id="login-email"
                  autoComplete="email"
                  data-testid="login-email-input"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="voce@shapeos.app"
                  className="w-full pl-11 pr-4 py-3.5 lg:py-2.5 rounded-xl text-[#F5F7FA] placeholder:text-zinc-600 outline-none transition-all focus:border-[#22C7C7]/60 focus:ring-2 focus:ring-[#22C7C7]/20"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between gap-3">
                <label htmlFor="login-password" className="text-sm text-zinc-300">Senha</label>
                <a
                  href="/recuperar-senha"
                  data-testid="forgot-password-link"
                  className="text-[11px] font-medium text-[#22C7C7] transition-colors hover:text-[#31D6D6] hover:underline"
                >
                  Esqueci minha senha
                </a>
              </div>
              <div className="mt-2 relative">
                <KeyRound className="w-4 h-4 text-zinc-500 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  id="login-password"
                  autoComplete="current-password"
                  data-testid="login-password-input"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-4 py-3.5 lg:py-2.5 rounded-xl text-[#F5F7FA] placeholder:text-zinc-600 outline-none transition-all focus:border-[#22C7C7]/60 focus:ring-2 focus:ring-[#22C7C7]/20"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              data-testid="login-submit-button"
              className="group w-full flex items-center justify-center gap-2 py-4 lg:py-3 rounded-2xl text-[#0E1116] font-semibold text-base lg:text-sm transition-all duration-300 hover:scale-[1.01] active:scale-[0.99]"
              style={{
                background: "#22C7C7",
                boxShadow: "none",
                fontFamily: "'Sora', sans-serif",
                letterSpacing: "0.02em",
              }}
            >
              {role === "admin" ? <ShieldCheck className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
              {submitting ? "Entrando…" : role === "admin" ? "Acessar Painel Admin" : "Entrar na ShapeOS"}
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>
          </form>

          <div className="md:hidden flex items-center gap-3 my-6">
            <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
            <span className="text-[10px] uppercase tracking-[0.3em] text-zinc-500" style={{ fontFamily: "'Sora', sans-serif" }}>
              ou entre com
            </span>
            <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
          </div>

          <div className="md:hidden flex flex-col items-center">
            <button
              type="button"
              data-testid="biometric-login-button"
              onClick={handleBiometric}
              disabled={bioState === "scanning"}
              aria-label="Entrar com biometria"
              className="relative w-24 h-24 lg:w-16 lg:h-16 rounded-full flex items-center justify-center transition-all duration-300 group disabled:cursor-wait"
              style={{
                background:
                  bioState === "success"
                    ? "radial-gradient(circle, rgba(34,199,199,0.35), rgba(34,199,199,0.05))"
                    : "radial-gradient(circle, rgba(34,199,199,0.15), rgba(34,199,199,0.02))",
                border: `1px solid ${bioState === "success" ? "rgba(34,199,199,0.7)" : "rgba(34,199,199,0.35)"}`,
                boxShadow:
                  bioState === "success"
                    ? "0 0 40px rgba(34,199,199,0.5), inset 0 0 20px rgba(34,199,199,0.2)"
                    : bioState === "scanning"
                      ? "0 0 30px rgba(34,199,199,0.35), inset 0 0 14px rgba(34,199,199,0.15)"
                      : "0 0 20px rgba(34,199,199,0.2), inset 0 0 8px rgba(34,199,199,0.08)",
              }}
            >
              {bioState === "scanning" && (
                <>
                  <span className="absolute inset-0 rounded-full border border-[#22C7C7]/40 animate-ping-slow" />
                  <span className="absolute inset-[-8px] rounded-full border border-[#22C7C7]/20 animate-ping-slower" />
                </>
              )}

              {bioState === "scanning" && (
                <span
                  aria-hidden
                  className="absolute inset-4 rounded-full overflow-hidden"
                  style={{ mask: "radial-gradient(circle, black 70%, transparent 71%)" }}
                >
                  <span className="bio-sweep" />
                </span>
              )}

              {bioState === "success" ? (
                <CheckCircle2 className="w-10 h-10 lg:w-7 lg:h-7 text-[#22C7C7]" />
              ) : (
                <Fingerprint
                  className={`w-10 h-10 lg:w-7 lg:h-7 transition-colors ${
                    bioState === "scanning" ? "text-[#31D6D6]" : "text-[#22C7C7] group-hover:text-[#31D6D6]"
                  }`}
                  strokeWidth={1.6}
                />
              )}
            </button>

            <p
              data-testid="biometric-status"
              className="mt-4 lg:mt-2 text-xs lg:text-[10px] tracking-widest uppercase text-center"
              style={{
                fontFamily: "'Sora', sans-serif",
                color: bioState === "success" ? "#22C7C7" : bioState === "scanning" ? "#F5F7FA" : "#a1a1aa",
                letterSpacing: "0.25em",
              }}
            >
              {bioState === "idle" && "Toque para usar biometria"}
              {bioState === "scanning" && "Lendo digital..."}
              {bioState === "success" && "Identidade confirmada"}
              {bioState === "error" && "Tentar novamente"}
            </p>
            {bioError ? (
              <p
                className="mt-2 text-center text-[11px] leading-relaxed text-red-300 max-w-[280px]"
                style={{ fontFamily: "'Sora', sans-serif" }}
              >
                {bioError}
              </p>
            ) : (
              <p
                className="mt-2 text-center text-[10px] leading-relaxed text-zinc-600 max-w-[280px]"
                style={{ fontFamily: "'Sora', sans-serif" }}
              >
                Primeiro acesso neste celular? Entre com e-mail e senha para cadastrar a biometria.
              </p>
            )}
          </div>

          <div className="flex items-center justify-center gap-2 pt-6 lg:pt-4 text-xs lg:text-[10px] text-zinc-500">
            <ShieldCheck className="w-3.5 h-3.5 text-[#22C7C7]" />
            Conexão criptografada · TLS 1.3 · WebAuthn
          </div>
        </div>

        <p className="text-center text-sm leading-relaxed text-zinc-400 mt-6" style={{ fontFamily: "'Sora', sans-serif" }}>
          Novo por aqui?{' '}
          <a href="/cadastro" className="text-[#22C7C7] cursor-pointer hover:underline">Criar conta de Personal</a>
          <span className="mx-2 text-zinc-700">•</span>
          <a href="/cadastro/aluno" className="text-[#22C7C7] cursor-pointer hover:underline">Criar conta de Aluno</a>
        </p>
    </AuthShell>
  );
};

export default LoginView;
