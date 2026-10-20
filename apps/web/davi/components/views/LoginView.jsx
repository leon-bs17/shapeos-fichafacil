'use client';

import React, { useState } from "react";
import { Lock, Mail, ShieldCheck, ArrowRight, ArrowLeft, Fingerprint, CheckCircle2, UserRound, UsersRound, Eye, EyeOff } from "lucide-react";
import Logo from "@/davi/components/Logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export const LoginView = ({ onEnter, onBiometric, error }) => {
  const [role, setRole] = useState("personal"); // "personal" | "aluno"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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


  return (
    <main id="main-content" className="login-refined" data-testid="login-view">
      <div className="login-frame">
        <header className="login-top">
          <a href="/apresentacao" aria-label="ShapeOS — página de apresentação"><Logo size="sm" /></a>
          <nav aria-label="Opções de acesso">
            <a className="login-back" href="/apresentacao"><ArrowLeft size={15} aria-hidden="true"/><span>Conhecer a ShapeOS</span></a>
            <span className="login-top-divider" aria-hidden="true"/>
            <ThemeToggle />
          </nav>
        </header>
        <div className="login-center">
          <aside className="login-intro" aria-labelledby="login-intro-title">
            <p className="login-eyebrow">Personais e alunos</p>
            <h2 id="login-intro-title">Seu treino.<br/><span>Seu espaço.</span></h2>
            <p className="login-intro-description">Planeje, acompanhe e evolua com a ShapeOS.</p>
              <svg className="login-orbit" viewBox="0 0 160 130" fill="none" aria-hidden="true">
                <g stroke="currentColor" strokeWidth="1">
                  <ellipse cx="80" cy="65" rx="72" ry="40" transform="rotate(-24 80 65)"/><ellipse cx="80" cy="65" rx="72" ry="40" transform="rotate(24 80 65)"/><circle cx="80" cy="65" r="39"/><circle cx="80" cy="65" r="30"/><circle cx="80" cy="65" r="20"/>
                  <path d="M53 18a54 54 0 0 1 65 70M42 100a54 54 0 0 0 69 8M29 56h12m78 0h12M29 74h12m78 0h12"/>
                  <rect x="19" y="45" width="10" height="40" rx="2"/><rect x="10" y="51" width="9" height="28" rx="2"/>
                  <rect x="131" y="45" width="10" height="40" rx="2"/><rect x="141" y="51" width="9" height="28" rx="2"/>
                  <path d="M74 55a14 14 0 1 0 12 0m-6-6v14" strokeLinecap="round"/>
                </g>
              </svg>
          </aside>
          <section className="login-card" aria-labelledby="login-title">
            <header className="login-heading">
              <h1 id="login-title">Entrar na ShapeOS</h1>
              <p>Acesse sua conta para continuar.</p>
            </header>
            <div className="login-body">
              <div className="login-roles" data-testid="role-tabs" role="group" aria-label="Perfil de acesso">
                <button type="button" data-testid="role-tab-personal" aria-pressed={role === "personal"} onClick={() => setRole("personal")} disabled={submitting || bioState === "scanning"}><UserRound size={18} aria-hidden="true"/>Personal</button>
                <button type="button" data-testid="role-tab-aluno" aria-pressed={role === "aluno"} onClick={() => setRole("aluno")} disabled={submitting || bioState === "scanning"}><UsersRound size={18} aria-hidden="true"/>Aluno</button>
              </div>
              {error && <p id="login-error" role="alert" className="login-error">{error}</p>}
              <form aria-busy={submitting} onSubmit={handleSubmit}>
                <div className="login-form-row">
                  <label htmlFor="login-email">E-mail</label>
                  <div className="login-field">
                    <Mail size={18} aria-hidden="true"/>
                    <input id="login-email" autoComplete="email" data-testid="login-email-input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@shapeos.app" aria-describedby={error ? "login-error" : undefined}/>
                  </div>
                </div>
                <div className="login-form-row">
                  <div className="login-password-label"><label htmlFor="login-password">Senha</label><a href="/recuperar-senha" data-testid="forgot-password-link">Esqueci minha senha</a></div>
                  <div className="login-field">
                    <Lock size={18} aria-hidden="true"/>
                    <input id="login-password" autoComplete="current-password" data-testid="login-password-input" type={showPassword ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Digite sua senha" aria-describedby={error ? "login-error" : undefined}/>
                    <button type="button" className="login-eye" aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"} aria-pressed={showPassword} aria-controls="login-password" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={18} aria-hidden="true"/> : <Eye size={18} aria-hidden="true"/>}</button>
                  </div>
                </div>
                <button type="submit" disabled={submitting || bioState === "scanning"} data-testid="login-submit-button" className="login-submit"><Lock size={17} aria-hidden="true"/><span>{submitting ? "Entrando…" : "Entrar na ShapeOS"}</span><ArrowRight size={18} aria-hidden="true"/></button>
              </form>
              {onBiometric && <div className="login-biometric">
                <button type="button" data-testid="biometric-login-button" onClick={handleBiometric} disabled={bioState === "scanning" || submitting} aria-label="Entrar com biometria" className="login-bio-button">{bioState === "success" ? <CheckCircle2 size={20} aria-hidden="true"/> : <Fingerprint size={20} aria-hidden="true"/>}<span>{bioState === "scanning" ? "Lendo digital..." : bioState === "success" ? "Identidade confirmada" : bioState === "error" ? "Tentar biometria novamente" : "Entrar com biometria"}</span></button>
                <p data-testid="biometric-status" role="status">{bioState === "scanning" ? "Confirme sua identidade no aparelho." : bioState === "success" ? "Identidade confirmada" : "Primeiro acesso? Entre com e-mail e senha para cadastrar a biometria."}</p>
                {bioError && <p className="login-error" role="alert">{bioError}</p>}
              </div>}
              <p className="login-secure"><ShieldCheck size={16} aria-hidden="true"/>Acesso para Personais e Alunos</p>
              <footer className="login-register"><p>Ainda não tem conta?</p><div><a href="/cadastro">Criar conta de Personal</a><span aria-hidden="true">·</span><a href="/cadastro/aluno">Criar conta de Aluno</a></div></footer>
            </div>
          </section>
        </div>
      </div>
      <style jsx>{`
        .login-refined { --login-bg:#f7f8f2;--login-panel:#fcfdf9;--login-line:#d7ded3;--login-ink:#162623;--login-muted:#5f6f68;--login-brand:#129b89;--login-button-ink:#fff;--login-error:#b42336;min-height:100svh;background:var(--login-bg);color:var(--login-ink);font-family:'Sora',sans-serif; }
        :global(.dark) .login-refined { --login-bg:#041512;--login-panel:#091c18;--login-line:#1c4037;--login-ink:#f5faf9;--login-muted:#a3becd;--login-brand:#00e9df;--login-button-ink:#041512;--login-error:#ff8f9b; }
        .login-refined * { box-sizing:border-box; }
        .login-frame { min-height:100svh;max-width:1216px;margin:0 auto;padding:24px 28px;display:flex;flex-direction:column; }
        .login-top { display:flex;align-items:center;justify-content:space-between;gap:16px;width:100%;margin:0 auto;padding-bottom:22px;border-bottom:1px solid var(--login-line); }
        .login-top>a { text-decoration:none;flex-shrink:0; }
        .login-top nav { display:flex;align-items:center;gap:12px; }
        .login-back { display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:44px;padding:0 6px;border:1px solid transparent;border-radius:13px;color:var(--login-muted);font-size:12px;text-decoration:none; }
        .login-top-divider { display:none; }
        .login-center { flex:1;display:grid;grid-template-columns:minmax(0,.85fr) minmax(0,1fr);align-items:center;gap:40px;width:100%;max-width:960px;margin:0 auto;padding:52px 0; }
        .login-intro { min-width:0;min-height:480px;display:flex;flex-direction:column;justify-content:center;align-items:flex-start;border-right:1px solid var(--login-line);padding:20px 40px 20px 0; }
        .login-eyebrow { margin:0 0 16px;font-size:11px;line-height:1.5;letter-spacing:.1em;text-transform:uppercase;font-weight:600;color:var(--login-brand); }
        .login-intro h2 { margin:0;font-size:38px;font-weight:600;line-height:1.2;letter-spacing:-.045em; }
        .login-intro h2 span { color:var(--login-brand); }
        .login-intro-description { margin:17px 0 0;max-width:280px;color:var(--login-muted);font-size:14px;line-height:1.8; }
        .login-orbit { margin-top:32px;width:100%;max-width:290px;height:auto;color:var(--login-brand);opacity:.22;pointer-events:none; }
        .login-card { width:100%;max-width:500px;min-width:0;border:1px solid var(--login-line);border-radius:20px;background:var(--login-panel);overflow:hidden; }
        .login-heading { position:relative;isolation:isolate;padding:32px 32px 24px;background:transparent; }
        .login-heading h1 { position:relative;margin:0;font-size:26px;line-height:1.3;font-weight:600;letter-spacing:-.045em; }
        .login-heading p { position:relative;margin:12px 0 0;max-width:330px;font-size:13px;line-height:1.7;color:var(--login-muted); }
        .login-body { margin:0 32px;padding:22px 0 25px;border-top:1px solid var(--login-line); }
        .login-roles { display:grid;grid-template-columns:1fr 1fr;gap:4px;padding:4px;border:1px solid var(--login-line);border-radius:16px;margin-bottom:22px; }
        .login-refined button { font:inherit;cursor:pointer;box-shadow:none;transform:none;transition:background-color 150ms ease,border-color 150ms ease; }
        .login-roles button { min-height:42px;display:flex;align-items:center;justify-content:center;gap:10px;border:1px solid transparent;border-radius:13px;background:transparent;color:var(--login-muted);font-size:13px;font-weight:500; }
        .login-roles button[aria-pressed="true"] { border-color:color-mix(in srgb,var(--login-brand) 40%,transparent);background:color-mix(in srgb,var(--login-brand) 7%,transparent);color:var(--login-brand); }
        form { display:grid;gap:19px; }
        .login-form-row { display:grid;gap:9px;min-width:0; }
        label { font-size:13px;font-weight:500; }
        .login-password-label { display:flex;justify-content:space-between;align-items:center;gap:12px; }
        .login-password-label a { color:var(--login-brand);font-size:11px;font-weight:500;text-decoration:none;line-height:1.5; }
        .login-field { display:flex;align-items:center;gap:12px;min-height:48px;padding:0 14px;border:1px solid var(--login-line);border-radius:13px;background:transparent;color:var(--login-muted);transition:background-color 150ms ease,border-color 150ms ease; }
        .login-field> :global(svg) { flex-shrink:0; }
        .login-field input { width:100%;min-width:0;min-height:46px;border:0;padding:0;border-radius:0;background:transparent;color:var(--login-ink);outline:none;box-shadow:none;font:inherit;font-size:14px; }
        .login-field input::placeholder { color:var(--login-muted);opacity:1; }
        .login-field:focus-within { border-color:var(--login-brand); }
        .login-eye { display:flex;align-items:center;justify-content:center;flex-shrink:0;width:44px;height:44px;margin-right:-12px;padding:0;border:1px solid transparent;border-radius:13px;background:transparent;color:var(--login-muted); }
        .login-submit { display:flex;align-items:center;justify-content:center;gap:10px;min-height:48px;margin-top:1px;padding:10px 12px;width:100%;border:1px solid var(--login-brand);border-radius:13px;background:var(--login-brand);color:var(--login-button-ink);font-size:14px!important;font-weight:600!important; }
        .login-submit:focus-visible { outline:2px solid var(--login-brand);outline-offset:3px; }
        .login-refined button:disabled { cursor:wait;opacity:.6; }
        .login-refined a:focus-visible,.login-roles button:focus-visible,.login-eye:focus-visible,.login-bio-button:focus-visible { outline:2px solid var(--login-brand);outline-offset:3px;border-radius:13px; }
        .login-secure { display:flex;align-items:center;justify-content:center;gap:9px;margin:18px 0 22px;font-size:11px;color:var(--login-muted); }
        .login-secure :global(svg) { color:var(--login-brand); }
        .login-register { border-top:1px solid var(--login-line);padding-top:19px;text-align:center;font-size:11px;line-height:1.8; }
        .login-register p { margin:0 0 6px;color:var(--login-muted); }
        .login-register div { display:flex;align-items:center;justify-content:center;flex-wrap:wrap;column-gap:9px;row-gap:4px; }
        .login-register a { color:var(--login-brand);text-decoration:none; }
        .login-register span { color:var(--login-muted); }
        .login-password-label a:hover,.login-register a:hover { text-decoration:underline;text-underline-offset:3px; }
        .login-error { margin:0 0 16px;padding:12px;border:1px solid color-mix(in srgb,var(--login-error) 30%,transparent);border-radius:13px;background:color-mix(in srgb,var(--login-error) 7%,transparent);color:var(--login-error);font-size:12px;line-height:1.6;overflow-wrap:anywhere; }
        .login-biometric { display:none; }
        @media (hover:hover) { .login-roles button:not(:disabled):hover,.login-eye:not(:disabled):hover,.login-bio-button:not(:disabled):hover { background:color-mix(in srgb,var(--login-brand) 7%,transparent);border-color:color-mix(in srgb,var(--login-brand) 40%,transparent); } .login-field:not(:focus-within):hover { background:color-mix(in srgb,var(--login-brand) 7%,transparent);border-color:color-mix(in srgb,var(--login-brand) 40%,transparent); } .login-submit:not(:disabled):hover { background:color-mix(in srgb,var(--login-brand) 93%,var(--login-panel));border-color:color-mix(in srgb,var(--login-brand) 40%,transparent); } }
        @media (min-width:768px) and (max-width:1023px) { .login-center { gap:28px; }.login-intro { padding-right:28px; }.login-intro h2 { font-size:32px; }.login-heading { padding:26px 24px 22px; }.login-heading h1 { font-size:24px; }.login-body { margin:0 24px; } }
        @media (max-width:767px) {
          .login-frame { padding:18px 20px; }
          .login-top { flex-wrap:wrap;gap:8px; }
          .login-top nav { margin-left:auto;gap:8px; }
          .login-back { font-size:11px;gap:6px; }
          .login-center { display:flex;padding:24px 0;align-items:flex-start;justify-content:center; }
          .login-intro { display:none; }
          .login-heading { padding:26px 22px 22px; }
          .login-heading h1 { font-size:23px; }
          .login-heading p { max-width:250px;font-size:12px; }
          .login-body { margin:0 22px;padding:20px 0 23px; }
          .login-field input { font-size:16px; }
          .login-biometric { display:grid;gap:9px;margin-top:14px; }
          .login-bio-button { display:flex;align-items:center;justify-content:center;gap:10px;min-height:46px;width:100%;border:1px solid var(--login-line);border-radius:13px;background:transparent;color:var(--login-brand);font-size:12px!important; }
          .login-biometric>p:not(.login-error) { margin:0;text-align:center;color:var(--login-muted);font-size:10px;line-height:1.7; }
          .login-biometric .login-error { margin:0; }
          .login-roles button:not(:disabled):active,.login-eye:not(:disabled):active,.login-bio-button:not(:disabled):active { background:color-mix(in srgb,var(--login-brand) 7%,transparent);border-color:color-mix(in srgb,var(--login-brand) 40%,transparent); }
        }
        @media (max-width:359px) { .login-frame { padding:16px 14px; }.login-heading { padding:24px 18px 20px; }.login-heading h1 { font-size:21px; }.login-body { margin:0 18px; }.login-register div { flex-direction:column; }.login-register span { display:none; } }

        /* Compact spacing on shorter desktop viewports; content remains scrollable when needed. */
        @media (min-width:768px) and (max-height:800px) {
          .login-frame { padding-top:12px;padding-bottom:12px; }
          .login-top { padding-bottom:8px; }
          .login-center { padding:12px 0; }
          .login-intro { min-height:380px;padding-top:12px;padding-bottom:12px; }
          .login-eyebrow { margin-bottom:12px; }
          .login-intro h2 { font-size:34px; }
          .login-intro-description { margin-top:12px; }
          .login-orbit { margin-top:18px;max-width:230px;max-height:185px; }
          .login-heading { padding:18px 28px 14px; }
          .login-heading h1 { font-size:24px; }
          .login-heading p { margin-top:8px; }
          .login-body { margin:0 28px;padding:14px 0 16px; }
          .login-roles { margin-bottom:14px; }
          form { gap:12px; }
          .login-form-row { gap:6px; }
          .login-secure { margin:12px 0; }
          .login-register { padding-top:12px; }
          .login-register p { margin-bottom:4px; }
        }
        @media (max-width:767px) and (max-height:800px) {
          .login-frame { padding-top:12px;padding-bottom:12px; }
          .login-top { padding-bottom:8px; }
          .login-center { padding:16px 0; }
          .login-heading { padding-top:20px;padding-bottom:16px; }
          .login-heading p { margin-top:8px; }
          .login-body { padding-top:16px;padding-bottom:18px; }
          .login-roles { margin-bottom:16px; }
          form { gap:14px; }
          .login-form-row { gap:7px; }
          .login-biometric { margin-top:12px;gap:7px; }
          .login-secure { margin:12px 0; }
          .login-register { padding-top:12px; }
        }
        @media (prefers-reduced-motion:reduce) { .login-refined button,.login-field { transition:none; } }
      `}</style>
    </main>
  );
};

export default LoginView;
