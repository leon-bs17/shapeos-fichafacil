'use client';

import React, { useEffect, useState } from "react";
import {
  Users,
  ClipboardList,
  TrendingUp,
  Copy,
  Eye,
  Plus,
  Search,
  LogOut,
  Flame,
  CheckCheck,
  Pencil,
  Trash2,
  X,
  AlertTriangle,
  Save,
  Calendar,
  ChevronDown,
  ChevronUp,
  Dumbbell,
  UserPlus,
  LayoutDashboard,
  PanelLeft,
  ChevronRight,
} from "lucide-react";
import Logo from "@/davi/components/Logo";
import WorkoutEditor from "@/davi/components/WorkoutEditor";
import {
  personalStats,
  weekDays,
  workoutTemplates,
} from "@/davi/data/mockData";

const StatCard = ({ icon: Icon, label, value, unit, accent, testId }) => (
  <div
    data-testid={testId}
    className="relative rounded-2xl p-5 overflow-hidden transition-transform hover:-translate-y-0.5"
    style={{
      background: "var(--shapeos-surface)",
      border: "1px solid rgba(var(--shapeos-neutral-rgb),0.07)",
      boxShadow: "0 12px 30px rgba(17,53,71,0.06)",
      borderTop: `3px solid ${accent || "var(--shapeos-brand)"}`,
    }}
  >
    <div className="relative">
      <div
        className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-widest"
        style={{ fontFamily: "'Sora', sans-serif" }}
      >
        <Icon className="w-3.5 h-3.5" style={{ color: accent }} />
        {label}
      </div>
      <div className="mt-3 flex items-baseline gap-1">
        <span
          className="text-4xl text-[var(--shapeos-text)]"
          style={{ fontFamily: "'Sora', sans-serif", fontWeight: 600, letterSpacing: "-0.03em" }}
        >
          {value}
        </span>
        {unit && (
          <span className="text-sm text-muted-foreground" style={{ fontFamily: "'Sora', sans-serif" }}>
            {unit}
          </span>
        )}
      </div>
    </div>
  </div>
);

/* ---------- Schedule Editor per student ---------- */

const DayPicker = ({ student, onChange }) => {
  const [openDay, setOpenDay] = useState(null);

  const handleSelect = (dayKey, workoutId) => {
    onChange(student.id, dayKey, workoutId);
    setOpenDay(null);
  };

  return (
    <div className="grid grid-cols-7 gap-1.5 md:gap-2" data-testid={`schedule-${student.id}`}>
      {weekDays.map((day) => {
        const wId = student.schedule[day.key];
        const template = workoutTemplates.find((t) => t.id === wId);
        const isRest = wId === "rest";
        const isOpen = openDay === day.key;

        return (
          <div key={day.key} className="relative">
            <button
              data-testid={`schedule-day-${student.id}-${day.key}`}
              onClick={() => setOpenDay(isOpen ? null : day.key)}
              className="w-full rounded-xl p-2 md:p-2.5 transition-all hover:-translate-y-0.5"
              style={{
                background: isRest ? "rgba(var(--shapeos-neutral-rgb),0.02)" : "rgba(34,199,199,0.06)",
                border: `1px solid ${isRest ? "rgba(var(--shapeos-neutral-rgb),0.06)" : "rgba(34,199,199,0.25)"}`,
                boxShadow: isOpen ? "0 0 14px rgba(34,199,199,0.25)" : "none",
              }}
            >
              <div
                className="text-[10px] uppercase tracking-widest text-muted-foreground"
                style={{ fontFamily: "'Sora', sans-serif" }}
              >
                {day.short}
              </div>
              <div
                className={`mt-1 text-xs md:text-sm ${isRest ? "text-muted-foreground" : "text-[var(--shapeos-brand)]"}`}
                style={{ fontFamily: "'Sora', sans-serif", fontWeight: 600 }}
              >
                {isRest ? "Off" : template?.id}
              </div>
            </button>

            {isOpen && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setOpenDay(null)}
                />
                <div
                  className="absolute z-40 top-full mt-2 left-1/2 -translate-x-1/2 w-52 rounded-xl p-2 shadow-2xl"
                  style={{
                    background: "var(--shapeos-surface)",
                    border: "1px solid rgba(var(--shapeos-neutral-rgb),0.1)",
                    backdropFilter: "blur(8px)",
                  }}
                  data-testid={`schedule-popover-${student.id}-${day.key}`}
                >
                  <div
                    className="px-3 py-2 text-[10px] uppercase tracking-widest text-muted-foreground"
                    style={{ fontFamily: "'Sora', sans-serif" }}
                  >
                    Treino para {day.label}
                  </div>
                  {workoutTemplates.map((t) => {
                    const selected = t.id === wId;
                    return (
                      <button
                        key={t.id}
                        data-testid={`schedule-option-${student.id}-${day.key}-${t.id}`}
                        onClick={() => handleSelect(day.key, t.id)}
                        className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm transition-colors hover:bg-white/5"
                        style={{ fontFamily: "'Sora', sans-serif" }}
                      >
                        <span className="flex items-center gap-2 min-w-0">
                          <span
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ background: t.accent }}
                          />
                          <span className="text-[var(--shapeos-text)] truncate">{t.code}</span>
                          {t.id !== "rest" && (
                            <span className="text-xs text-muted-foreground truncate">· {t.title}</span>
                          )}
                        </span>
                        {selected && <CheckCheck className="w-3.5 h-3.5 text-[var(--shapeos-brand)] flex-shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
};

const StudentRow = ({ student, onClone, cloned, onEdit, onDelete, onScheduleChange }) => {
  const [scheduleOpen, setScheduleOpen] = useState(false);

  return (
    <div
      data-testid={`student-row-${student.id}`}
      className="rounded-2xl p-4 md:p-5 transition-all duration-300"
      style={{
        background: "var(--shapeos-surface)",
        border: "1px solid rgba(var(--shapeos-neutral-rgb),0.07)",
        boxShadow: "0 12px 30px rgba(0,0,0,0.25)",
      }}
    >
      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
        {/* Avatar + name */}
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-sm flex-shrink-0"
            style={{
              background: "var(--shapeos-surface)",
              border: "1px solid rgba(34,199,199,0.3)",
              color: "var(--shapeos-brand)",
              fontFamily: "'Sora', sans-serif",
              fontWeight: 600,
            }}
          >
            {student.initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3
                className="text-[var(--shapeos-text)] truncate"
                style={{
                  fontFamily: "'Sora', sans-serif",
                  fontWeight: 500,
                  fontSize: "1.05rem",
                  letterSpacing: "-0.01em",
                }}
              >
                {student.name}
              </h3>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-widest ${
                  student.status === "ativo" ? "text-[var(--shapeos-brand)]" : "text-muted-foreground"
                }`}
                style={{
                  background:
                    student.status === "ativo"
                      ? "rgba(34,199,199,0.1)"
                      : "rgba(var(--shapeos-neutral-rgb),0.05)",
                  border: `1px solid ${
                    student.status === "ativo" ? "rgba(34,199,199,0.3)" : "rgba(var(--shapeos-neutral-rgb),0.08)"
                  }`,
                  fontFamily: "'Sora', sans-serif",
                }}
              >
                {student.status}
              </span>
            </div>
            <div
              className="text-xs text-muted-foreground mt-1 flex items-center gap-3 flex-wrap"
              style={{ fontFamily: "'Sora', sans-serif" }}
            >
              <span>{student.age} anos</span>
              <span className="w-1 h-1 rounded-full bg-zinc-700" />
              <span>{student.plan}</span>
              <span className="w-1 h-1 rounded-full bg-zinc-700" />
              <span>{student.lastSeen}</span>
            </div>
          </div>
        </div>

        {/* Progress */}
        <div className="hidden lg:block w-36 flex-shrink-0">
          <div
            className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            Aderência
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(var(--shapeos-neutral-rgb),0.06)" }}>
            <div
              className="h-full rounded-full"
              style={{
                width: `${student.progress}%`,
                background: student.progress > 70 ? "var(--shapeos-brand)" : "#936300",
              }}
            />
          </div>
          <div className="text-xs text-[var(--shapeos-text)] mt-1.5" style={{ fontFamily: "'Sora', sans-serif" }}>
            {student.progress}% <span className="text-muted-foreground">· {student.streak}d</span>
          </div>
        </div>

        {/* Actions */}
        <div
          className="flex items-center gap-2 flex-wrap flex-shrink-0"
          style={{ fontFamily: "'Sora', sans-serif" }}
        >
          <button
            data-testid={`toggle-schedule-btn-${student.id}`}
            onClick={() => setScheduleOpen((v) => !v)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-sm transition-all"
            style={{
              background: scheduleOpen ? "rgba(34,199,199,0.12)" : "rgba(var(--shapeos-neutral-rgb),0.03)",
              border: `1px solid ${scheduleOpen ? "rgba(34,199,199,0.35)" : "rgba(var(--shapeos-neutral-rgb),0.08)"}`,
              color: scheduleOpen ? "var(--shapeos-brand)" : "var(--shapeos-text)",
            }}
          >
            <Calendar className="w-3.5 h-3.5" /> Cronograma
            {scheduleOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          <button
            data-testid={`view-ficha-btn-${student.id}`}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-sm text-[var(--shapeos-text)] transition-all hover:bg-white/5"
            style={{
              background: "rgba(var(--shapeos-neutral-rgb),0.03)",
              border: "1px solid rgba(var(--shapeos-neutral-rgb),0.08)",
            }}
          >
            <Eye className="w-3.5 h-3.5" /> Ver
          </button>
          <button
            data-testid={`edit-ficha-btn-${student.id}`}
            onClick={() => onEdit(student)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-sm text-[var(--shapeos-text)] transition-all hover:bg-white/5"
            style={{
              background: "rgba(var(--shapeos-neutral-rgb),0.03)",
              border: "1px solid rgba(var(--shapeos-neutral-rgb),0.08)",
            }}
          >
            <Pencil className="w-3.5 h-3.5" /> Editar
          </button>
          <button
            data-testid={`clone-ficha-btn-${student.id}`}
            onClick={() => onClone(student.id)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all hover:scale-[1.02]"
            style={{
              background: cloned ? "var(--shapeos-brand)" : "rgba(34,199,199,0.1)",
              color: cloned ? "var(--shapeos-bg)" : "var(--shapeos-brand)",
              border: `1px solid ${cloned ? "var(--shapeos-brand)" : "rgba(34,199,199,0.3)"}`,
              boxShadow: cloned ? "0 6px 18px rgba(34,199,199,0.35)" : "none",
            }}
          >
            {cloned ? (
              <>
                <CheckCheck className="w-3.5 h-3.5" /> Duplicada
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" /> Duplicar
              </>
            )}
          </button>
          <button
            data-testid={`delete-ficha-btn-${student.id}`}
            onClick={() => onDelete(student)}
            aria-label="Apagar ficha"
            className="flex items-center justify-center w-10 h-10 rounded-xl transition-all hover:scale-105"
            style={{
              background: "rgba(255,80,80,0.08)",
              color: "#c13d4a",
              border: "1px solid rgba(255,80,80,0.25)",
            }}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Schedule editor */}
      {scheduleOpen && (
        <div
          className="mt-4 pt-4"
          style={{ borderTop: "1px solid rgba(var(--shapeos-neutral-rgb),0.06)" }}
        >
          <div
            className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-3"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            <Calendar className="w-3 h-3" />
            Toque num dia para atribuir um treino
          </div>
          <DayPicker student={student} onChange={onScheduleChange} />
          <div
            className="mt-3 flex flex-wrap gap-3 text-[10px] uppercase tracking-widest text-muted-foreground"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            {workoutTemplates.map((t) => (
              <span key={t.id} className="inline-flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: t.accent }} />
                {t.code} · {t.title}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/* ---------- Modals ---------- */

const ModalShell = ({ children, onClose, testId }) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center px-4"
    data-testid={testId}
    role="dialog"
    aria-modal="true"
  >
    <div
      className="absolute inset-0 backdrop-blur-sm"
      style={{ background: "rgba(10,10,10,0.7)" }}
      onClick={onClose}
    />
    <div
      className="relative w-full max-w-md rounded-3xl p-7 animate-in fade-in-0 zoom-in-95 duration-200"
      style={{
        background: "var(--shapeos-surface)",
        border: "1px solid rgba(var(--shapeos-neutral-rgb),0.08)",
        boxShadow: "0 30px 70px rgba(0,0,0,0.6), inset 0 1px 0 rgba(var(--shapeos-neutral-rgb),0.06)",
      }}
    >
      {children}
    </div>
  </div>
);

const DeleteFichaModal = ({ student, onCancel, onConfirm }) => (
  <ModalShell onClose={onCancel} testId="delete-ficha-modal">
    <button
      onClick={onCancel}
      className="absolute top-4 right-4 text-muted-foreground hover:text-[var(--shapeos-text)] transition-colors"
      aria-label="Fechar"
    >
      <X className="w-4 h-4" />
    </button>
    <div className="flex items-start gap-4">
      <div
        className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
        style={{ background: "rgba(255,80,80,0.1)", border: "1px solid rgba(255,80,80,0.3)" }}
      >
        <AlertTriangle className="w-5 h-5 text-[#c13d4a]" />
      </div>
      <div className="flex-1">
        <h2
          className="text-xl text-[var(--shapeos-text)]"
          style={{ fontFamily: "'Sora', sans-serif", fontWeight: 600, letterSpacing: "-0.01em" }}
        >
          Apagar ficha?
        </h2>
        <p className="text-sm text-muted-foreground mt-2" style={{ fontFamily: "'Sora', sans-serif" }}>
          Você está prestes a apagar a ficha de{" "}
          <span className="text-[var(--shapeos-text)] font-semibold">{student.name}</span>. Essa ação
          remove o aluno e o cronograma. Não pode ser desfeita.
        </p>
      </div>
    </div>
    <div className="flex gap-3 mt-7" style={{ fontFamily: "'Sora', sans-serif" }}>
      <button
        data-testid="delete-cancel-button"
        onClick={onCancel}
        className="flex-1 py-3 rounded-xl text-sm text-[var(--shapeos-text)] transition-all hover:bg-white/5"
        style={{
          background: "rgba(var(--shapeos-neutral-rgb),0.03)",
          border: "1px solid rgba(var(--shapeos-neutral-rgb),0.08)",
        }}
      >
        Cancelar
      </button>
      <button
        data-testid="delete-confirm-button"
        onClick={onConfirm}
        className="flex-1 py-3 rounded-xl text-sm font-semibold text-[var(--shapeos-text)] transition-all hover:scale-[1.01]"
        style={{
          background: "#e64545",
          boxShadow: "none",
        }}
      >
        Apagar ficha
      </button>
    </div>
  </ModalShell>
);

const EditFichaModal = ({ student, onCancel, onSave }) => {
  const [workout, setWorkout] = useState(student.currentWorkout);
  const [plan, setPlan] = useState(student.plan);

  return (
    <ModalShell onClose={onCancel} testId="edit-ficha-modal">
      <button
        onClick={onCancel}
        className="absolute top-4 right-4 text-muted-foreground hover:text-[var(--shapeos-text)] transition-colors"
        aria-label="Fechar"
      >
        <X className="w-4 h-4" />
      </button>
      <div className="flex items-center gap-3 mb-5">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "rgba(34,199,199,0.1)", border: "1px solid rgba(34,199,199,0.3)" }}
        >
          <Pencil className="w-4 h-4 text-[var(--shapeos-brand)]" />
        </div>
        <div>
          <h2
            className="text-xl text-[var(--shapeos-text)] leading-tight"
            style={{ fontFamily: "'Sora', sans-serif", fontWeight: 600, letterSpacing: "-0.01em" }}
          >
            Editar ficha
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5" style={{ fontFamily: "'Sora', sans-serif" }}>
            {student.name}
          </p>
        </div>
      </div>

      <div className="space-y-4" style={{ fontFamily: "'Sora', sans-serif" }}>
        <div>
          <label className="text-xs text-muted-foreground uppercase tracking-widest">Ficha atual</label>
          <input
            data-testid="edit-workout-input"
            type="text"
            value={workout}
            onChange={(e) => setWorkout(e.target.value)}
            className="mt-2 w-full px-4 py-3 rounded-xl text-[var(--shapeos-text)] outline-none focus:border-[var(--shapeos-brand)]/60 focus:ring-2 focus:ring-[var(--shapeos-brand)]/20"
            style={{ background: "rgba(var(--shapeos-neutral-rgb),0.03)", border: "1px solid rgba(var(--shapeos-neutral-rgb),0.08)" }}
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground uppercase tracking-widest">Objetivo do plano</label>
          <select
            data-testid="edit-plan-select"
            value={plan}
            onChange={(e) => setPlan(e.target.value)}
            className="mt-2 w-full px-4 py-3 rounded-xl text-[var(--shapeos-text)] outline-none focus:border-[var(--shapeos-brand)]/60 focus:ring-2 focus:ring-[var(--shapeos-brand)]/20"
            style={{ background: "rgba(var(--shapeos-neutral-rgb),0.03)", border: "1px solid rgba(var(--shapeos-neutral-rgb),0.08)" }}
          >
            <option value="Hipertrofia" style={{ background: "var(--shapeos-bg)" }}>Hipertrofia</option>
            <option value="Emagrecimento" style={{ background: "var(--shapeos-bg)" }}>Emagrecimento</option>
            <option value="Força Máxima" style={{ background: "var(--shapeos-bg)" }}>Força Máxima</option>
            <option value="Resistência" style={{ background: "var(--shapeos-bg)" }}>Resistência</option>
          </select>
        </div>
      </div>

      <div className="flex gap-3 mt-7" style={{ fontFamily: "'Sora', sans-serif" }}>
        <button
          data-testid="edit-cancel-button"
          onClick={onCancel}
          className="flex-1 py-3 rounded-xl text-sm text-[var(--shapeos-text)] transition-all hover:bg-white/5"
          style={{
            background: "rgba(var(--shapeos-neutral-rgb),0.03)",
            border: "1px solid rgba(var(--shapeos-neutral-rgb),0.08)",
          }}
        >
          Cancelar
        </button>
        <button
          data-testid="edit-save-button"
          onClick={() => onSave({ ...student, currentWorkout: workout, plan })}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-[var(--shapeos-on-brand)] transition-all hover:scale-[1.01]"
          style={{
            background: "var(--shapeos-brand)",
            boxShadow: "none",
          }}
        >
          <Save className="w-4 h-4" /> Salvar alterações
        </button>
      </div>
    </ModalShell>
  );
};

const PLANS = ["Hipertrofia", "Emagrecimento", "Força Máxima", "Resistência"];

const fieldStyle = { background: "rgba(var(--shapeos-neutral-rgb),0.03)", border: "1px solid rgba(var(--shapeos-neutral-rgb),0.08)" };
const fieldClass =
  "mt-2 w-full px-4 py-3 rounded-xl text-[var(--shapeos-text)] placeholder:text-muted-foreground outline-none focus:border-[var(--shapeos-brand)]/60 focus:ring-2 focus:ring-[var(--shapeos-brand)]/20";

const NewStudentModal = ({ onCancel, onSave }) => {
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [plan, setPlan] = useState(PLANS[0]);
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 3) return setError("Informe o nome completo do aluno.");
    const ageNum = Number(age);
    if (!ageNum || ageNum < 10 || ageNum > 100) return setError("Informe uma idade válida (10 a 100).");
    onSave({ name: trimmed, age: ageNum, plan });
  };

  return (
    <ModalShell onClose={onCancel} testId="new-student-modal">
      <button
        onClick={onCancel}
        className="absolute top-4 right-4 text-muted-foreground hover:text-[var(--shapeos-text)] transition-colors"
        aria-label="Fechar"
        data-testid="new-student-close-button"
      >
        <X className="w-4 h-4" />
      </button>
      <div className="flex items-center gap-3 mb-5">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.35)" }}
        >
          <UserPlus className="w-4 h-4 text-muted-foreground" />
        </div>
        <div>
          <h2
            className="text-xl text-[var(--shapeos-text)] leading-tight"
            style={{ fontFamily: "'Sora', sans-serif", fontWeight: 600, letterSpacing: "-0.01em" }}
          >
            Novo aluno
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5" style={{ fontFamily: "'Sora', sans-serif" }}>
            Cadastre e monte o cronograma em seguida
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" style={{ fontFamily: "'Sora', sans-serif" }}>
        <div>
          <label className="text-xs text-muted-foreground uppercase tracking-widest">Nome completo</label>
          <input
            data-testid="new-student-name-input"
            type="text"
            autoFocus
            placeholder="Ex.: Ana Souza"
            value={name}
            onChange={(e) => { setName(e.target.value); setError(""); }}
            className={fieldClass}
            style={fieldStyle}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-widest">Idade</label>
            <input
              data-testid="new-student-age-input"
              type="number"
              min="10"
              max="100"
              placeholder="25"
              value={age}
              onChange={(e) => { setAge(e.target.value); setError(""); }}
              className={fieldClass}
              style={fieldStyle}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-widest">Objetivo</label>
            <select
              data-testid="new-student-plan-select"
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
              className={fieldClass}
              style={fieldStyle}
            >
              {PLANS.map((p) => (
                <option key={p} value={p} style={{ background: "var(--shapeos-bg)" }}>{p}</option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <p data-testid="new-student-error" className="text-xs text-[#c13d4a] flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" /> {error}
          </p>
        )}

        <div className="flex gap-3 pt-3">
          <button
            type="button"
            data-testid="new-student-cancel-button"
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl text-sm text-[var(--shapeos-text)] transition-all hover:bg-white/5"
            style={fieldStyle}
          >
            Cancelar
          </button>
          <button
            type="submit"
            data-testid="new-student-save-button"
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-[var(--shapeos-on-brand)] transition-all hover:scale-[1.01]"
            style={{
              background: "var(--shapeos-brand)",
              boxShadow: "none",
            }}
          >
            <UserPlus className="w-4 h-4" /> Cadastrar aluno
          </button>
        </div>
      </form>
    </ModalShell>
  );
};

const buildStudent = ({ name, age, plan }) => {
  const parts = name.split(/\s+/);
  const initials = (parts[0][0] + (parts[1]?.[0] || parts[0][1] || "")).toUpperCase();
  return {
    id: `std-${Date.now()}`,
    name,
    age,
    plan,
    currentWorkout: "Treino A",
    lastSeen: "Cadastrado agora",
    progress: 0,
    streak: 0,
    initials,
    status: "ativo",
    schedule: { seg: "A", ter: "rest", qua: "B", qui: "rest", sex: "C", sab: "rest", dom: "rest" },
  };
};

export const PersonalView = ({
  onLogout,
  workouts,
  onUpdateWorkout,
  customExercises = [],
  onAddCustomExercise,
  students,
  setStudents,
}) => {
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState("");
  const [clonedId, setClonedId] = useState(null);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [toast, setToast] = useState(null);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [activeSection, setActiveSection] = useState("overview");

  const menuItems = [
    { id: "overview", label: "Visão geral", icon: LayoutDashboard },
    { id: "workouts", label: "Meus treinos", icon: Dumbbell },
    { id: "students", label: "Alunos", icon: Users },
  ];

  const goToSection = (id) => {
    setActiveSection(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  useEffect(() => {
    const ids = ["overview", "workouts", "students"];
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target?.id) setActiveSection(visible.target.id);
      },
      { rootMargin: "-20% 0px -65% 0px", threshold: [0.05, 0.2, 0.5] }
    );

    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const filtered = students.filter((s) =>
    s.name.toLowerCase().includes(query.toLowerCase())
  );

  const handleClone = (id) => {
    setClonedId(id);
    setTimeout(() => setClonedId(null), 2000);
  };

  const showToast = (msg, tone = "success") => {
    setToast({ msg, tone });
    setTimeout(() => setToast(null), 2500);
  };

  const handleSaveEdit = (updated) => {
    setStudents((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    setEditing(null);
    showToast(`Ficha de ${updated.name} atualizada`);
  };

  const handleConfirmDelete = () => {
    const name = deleting.name;
    setStudents((prev) => prev.filter((s) => s.id !== deleting.id));
    setDeleting(null);
    showToast(`Ficha de ${name} apagada`, "danger");
  };

  const handleScheduleChange = (studentId, dayKey, workoutId) => {
    setStudents((prev) =>
      prev.map((s) =>
        s.id === studentId
          ? { ...s, schedule: { ...s.schedule, [dayKey]: workoutId } }
          : s
      )
    );
    const template = workoutTemplates.find((t) => t.id === workoutId);
    const day = weekDays.find((d) => d.key === dayKey);
    showToast(`${day.label}: ${template.code}`);
  };

  const handleCreateStudent = (data) => {
    const student = buildStudent(data);
    setStudents((prev) => [student, ...prev]);
    setCreating(false);
    setQuery("");
    showToast(`${student.name} cadastrado(a) com sucesso`);
  };

  const handleSaveWorkout = (updated) => {
    onUpdateWorkout(editingTemplate.id, updated);
    setEditingTemplate(null);
    showToast(`${editingTemplate.code} salvo com ${updated.exercises.length} exercícios`);
  };

  return (
    <div className="min-h-screen bg-[var(--shapeos-bg)]" data-testid="personal-view">
      {/* Desktop navigation */}
      <aside
        className="shapeos-navigation fixed inset-y-0 left-0 z-40 hidden w-64 flex-col lg:flex"
        style={{
          background: "var(--shapeos-surface)",
          borderRight: "1px solid var(--shapeos-border)",
          boxShadow: "none",
        }}
      >
        <div className="flex h-20 items-center px-5" style={{ borderBottom: "1px solid var(--shapeos-border)" }}>
          <Logo size="sm" />
        </div>

        <div className="px-4 pt-5">
          <div
            className="flex items-center gap-2 rounded-xl px-3 py-2.5"
            style={{ background: "rgba(34,199,199,0.08)", border: "1px solid rgba(34,199,199,0.16)" }}
          >
            <PanelLeft className="h-3.5 w-3.5 text-[var(--shapeos-brand)]" />
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-foreground">Espaço do personal</p>
              <p className="mt-0.5 truncate text-[9px] text-[var(--shapeos-subtle)]">Alunos e programação</p>
            </div>
          </div>
        </div>

        <nav aria-label="Painel do personal" className="flex-1 space-y-1 overflow-y-auto p-4 pt-5">
          {menuItems.map(({ id, label, icon: Icon }) => {
            const active = activeSection === id;
            return (
              <button
                key={id}
                type="button"
                aria-current={active ? "location" : undefined}
                onClick={() => goToSection(id)}
                className="group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-all"
                style={{
                  color: active ? "var(--shapeos-text)" : "var(--shapeos-muted)",
                  background: active ? "rgba(34,199,199,0.10)" : "transparent",
                  border: active ? "1px solid rgba(34,199,199,0.18)" : "1px solid transparent",
                }}
              >
                {active && <span className="absolute left-0 h-5 w-0.5 rounded-full bg-[var(--shapeos-brand)]" />}
                <Icon className="h-4 w-4" style={{ color: active ? "var(--shapeos-brand)" : undefined }} />
                <span className="flex-1">{label}</span>
                <ChevronRight
                  className="h-3.5 w-3.5 transition-all"
                  style={{ color: active ? "var(--shapeos-brand)" : "#637780", opacity: active ? 1 : 0.55 }}
                />
              </button>
            );
          })}
        </nav>

        <div className="px-4 pb-4">
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all hover:-translate-y-0.5"
            style={{
              background: "var(--shapeos-brand)",
              color: "var(--shapeos-on-brand)",
              boxShadow: "none",
            }}
          >
            <UserPlus className="h-4 w-4" /> Novo aluno
          </button>
          <div className="mt-3 rounded-xl px-3 py-3" style={{ background: "var(--shapeos-surface)", border: "1px solid var(--shapeos-border)" }}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--shapeos-subtle)]">Sua base</p>
                <p className="mt-1 text-sm font-semibold text-[var(--shapeos-text)]">{students.length} alunos ativos</p>
              </div>
              <div className="grid h-8 w-8 place-items-center rounded-lg" style={{ background: "rgba(34,199,199,0.10)" }}>
                <Users className="h-3.5 w-3.5 text-[var(--shapeos-brand)]" />
              </div>
            </div>
          </div>
        </div>

        <div className="p-4" style={{ borderTop: "1px solid var(--shapeos-border)" }}>
          <button
            data-testid="personal-logout-button"
            onClick={onLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs text-[var(--shapeos-subtle)] transition-colors hover:bg-red-400/[0.05] hover:text-red-300"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            <LogOut className="h-3.5 w-3.5" /> Sair da conta
          </button>
        </div>
      </aside>

      {/* Mobile navigation */}
      <div
        className="sticky top-0 z-40 lg:hidden"
        style={{ background: "rgba(14,17,22,0.94)", borderBottom: "1px solid var(--shapeos-border)", backdropFilter: "blur(18px)" }}
      >
        <div className="flex items-center justify-between px-4 py-3">
          <Logo size="sm" />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="grid h-9 w-9 place-items-center rounded-xl text-[var(--shapeos-on-brand)]"
              style={{ background: "var(--shapeos-brand)" }}
              aria-label="Novo aluno"
            >
              <UserPlus className="h-4 w-4" />
            </button>
            <button
              data-testid="personal-logout-button-mobile"
              onClick={onLogout}
              className="grid h-9 w-9 place-items-center rounded-xl text-[var(--shapeos-subtle)]"
              style={{ background: "var(--shapeos-surface)", border: "1px solid var(--shapeos-border)" }}
              aria-label="Sair"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
        <nav className="flex gap-2 overflow-x-auto px-4 pb-3">
          {menuItems.map(({ id, label, icon: Icon }) => {
            const active = activeSection === id;
            return (
              <button
                key={id}
                type="button"
                aria-current={active ? "location" : undefined}
                onClick={() => goToSection(id)}
                className="flex flex-shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-[11px] font-medium"
                style={{
                  background: active ? "rgba(34,199,199,0.11)" : "var(--shapeos-surface)",
                  border: active ? "1px solid rgba(34,199,199,0.20)" : "1px solid var(--shapeos-border)",
                  color: active ? "var(--shapeos-brand)" : "var(--shapeos-muted)",
                }}
              >
                <Icon className="h-3.5 w-3.5" /> {label}
              </button>
            );
          })}
        </nav>
      </div>

      <main className="lg:ml-64 shapeos-workspace">
        <div className="mx-auto max-w-6xl px-5 pt-8 pb-16 md:pt-10">
        {/* Header */}
        <section id="overview" className="scroll-mt-32 lg:scroll-mt-8">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
          <div>
            <div
              className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-[0.3em]"
              style={{ fontFamily: "'Sora', sans-serif" }}
            >
              <Flame className="w-3.5 h-3.5 text-muted-foreground" />
              Painel do Personal
            </div>
            <h1
              className="mt-3 text-3xl sm:text-4xl text-[var(--shapeos-text)] leading-tight"
              style={{ fontFamily: "'Sora', sans-serif", fontWeight: 600, letterSpacing: "-0.03em" }}
            >
              Bem-vindo, <span className="text-[var(--shapeos-brand)]">Personal</span>
            </h1>
            <p
              className="mt-3 text-base md:text-lg text-muted-foreground"
              style={{ fontFamily: "'Sora', sans-serif" }}
            >
              Monte a semana de cada aluno, edite fichas e clone treinos em segundos.
            </p>
          </div>

          <button
            data-testid="new-student-button"
            onClick={() => setCreating(true)}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl font-semibold transition-all hover:scale-[1.02] self-start md:self-auto"
            style={{
              background: "var(--shapeos-brand)",
              color: "var(--shapeos-on-brand)",
              boxShadow: "none",
              fontFamily: "'Sora', sans-serif",
              letterSpacing: "0.02em",
            }}
          >
            <Plus className="w-4 h-4" /> Novo Aluno
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          <StatCard
            testId="stat-active-students"
            icon={Users}
            label="Alunos Ativos"
            value={students.length}
            accent="var(--shapeos-brand)"
          />
          <StatCard
            testId="stat-workouts"
            icon={ClipboardList}
            label="Fichas Criadas"
            value={personalStats.workoutsCreated}
            accent="#2162b4"
          />
          <StatCard
            testId="stat-adherence"
            icon={TrendingUp}
            label="Aderência semanal"
            value={personalStats.weeklyAdherence}
            unit="%"
            accent="var(--shapeos-brand)"
          />
        </div>
        </section>

        {/* My Workouts (templates) */}
        <section id="workouts" className="scroll-mt-32 lg:scroll-mt-8 mb-10" data-testid="workout-templates-section">
          <div className="flex items-center justify-between mb-4">
            <h2
              className="text-lg text-[var(--shapeos-text)]"
              style={{ fontFamily: "'Sora', sans-serif", fontWeight: 500 }}
            >
              Meus Treinos <span className="text-muted-foreground">(edite os exercícios de cada ficha)</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {workoutTemplates
              .filter((t) => t.id !== "rest")
              .map((t) => {
                const w = workouts[t.id];
                return (
                  <button
                    key={t.id}
                    data-testid={`edit-template-${t.id}`}
                    onClick={() => setEditingTemplate(t)}
                    className="group text-left rounded-2xl p-5 transition-all duration-300 hover:-translate-y-0.5 relative overflow-hidden"
                    style={{
                      background:
                        "var(--shapeos-surface)",
                      border: "1px solid rgba(var(--shapeos-neutral-rgb),0.07)",
                      boxShadow: "0 12px 30px rgba(0,0,0,0.25)",
                    }}
                  >
                    <div
                      className="absolute -top-8 -right-8 w-24 h-24 rounded-full opacity-30 blur-2xl"
                      style={{ background: t.accent }}
                    />
                    <div className="relative">
                      <div className="flex items-center justify-between">
                        <span
                          className="w-9 h-9 rounded-xl flex items-center justify-center"
                          style={{
                            background: `${t.accent}1a`,
                            border: `1px solid ${t.accent}66`,
                            color: t.accent,
                            fontFamily: "'Sora', sans-serif",
                            fontWeight: 700,
                          }}
                        >
                          {t.id}
                        </span>
                        <Pencil className="w-3.5 h-3.5 text-muted-foreground group-hover:text-[var(--shapeos-brand)] transition-colors" />
                      </div>
                      <h3
                        className="mt-4 text-xl text-[var(--shapeos-text)] leading-tight"
                        style={{
                          fontFamily: "'Sora', sans-serif",
                          fontWeight: 600,
                          letterSpacing: "-0.01em",
                        }}
                      >
                        {w?.title || t.title}
                      </h3>
                      <div
                        className="mt-1 text-xs text-muted-foreground"
                        style={{ fontFamily: "'Sora', sans-serif" }}
                      >
                        {t.code}
                      </div>
                      <div
                        className="mt-4 flex items-center gap-3 text-xs text-muted-foreground"
                        style={{ fontFamily: "'Sora', sans-serif" }}
                      >
                        <span className="inline-flex items-center gap-1">
                          <Dumbbell className="w-3 h-3 text-[var(--shapeos-brand)]" />
                          {w?.exercises?.length || 0} exercícios
                        </span>
                        {w?.duration && (
                          <>
                            <span className="w-1 h-1 rounded-full bg-zinc-700" />
                            <span>{w.duration}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
          </div>
        </section>

        <section id="students" className="scroll-mt-32 lg:scroll-mt-8">
        {/* Search + list header */}
        <div className="flex items-center justify-between mb-4">
          <h2
            className="text-lg text-[var(--shapeos-text)]"
            style={{ fontFamily: "'Sora', sans-serif", fontWeight: 500 }}
          >
            Sua base <span className="text-muted-foreground">({filtered.length})</span>
          </h2>
          <div className="relative w-full max-w-xs">
            <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              data-testid="student-search-input"
              type="text"
              placeholder="Buscar aluno..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm text-[var(--shapeos-text)] placeholder:text-muted-foreground outline-none focus:border-[var(--shapeos-brand)]/60 focus:ring-2 focus:ring-[var(--shapeos-brand)]/20"
              style={{
                background: "rgba(var(--shapeos-neutral-rgb),0.03)",
                border: "1px solid rgba(var(--shapeos-neutral-rgb),0.08)",
                fontFamily: "'Sora', sans-serif",
              }}
            />
          </div>
        </div>

        {/* Student list */}
        <div className="space-y-3" data-testid="student-list">
          {filtered.map((s) => (
            <StudentRow
              key={s.id}
              student={s}
              cloned={clonedId === s.id}
              onClone={handleClone}
              onEdit={setEditing}
              onDelete={setDeleting}
              onScheduleChange={handleScheduleChange}
            />
          ))}
          {filtered.length === 0 && (
            <div
              className="text-center py-10 rounded-2xl text-muted-foreground text-sm"
              style={{
                background: "rgba(var(--shapeos-neutral-rgb),0.02)",
                border: "1px dashed rgba(var(--shapeos-neutral-rgb),0.08)",
                fontFamily: "'Sora', sans-serif",
              }}
            >
              Nenhum aluno encontrado.
            </div>
          )}
        </div>
        </section>
        </div>
      </main>

      {/* Modals */}
      {creating && (
        <NewStudentModal onCancel={() => setCreating(false)} onSave={handleCreateStudent} />
      )}
      {editing && (
        <EditFichaModal
          student={editing}
          onCancel={() => setEditing(null)}
          onSave={handleSaveEdit}
        />
      )}
      {deleting && (
        <DeleteFichaModal
          student={deleting}
          onCancel={() => setDeleting(null)}
          onConfirm={handleConfirmDelete}
        />
      )}
      {editingTemplate && (
        <WorkoutEditor
          template={editingTemplate}
          workout={workouts[editingTemplate.id]}
          onCancel={() => setEditingTemplate(null)}
          onSave={handleSaveWorkout}
          customExercises={customExercises}
          onAddCustomExercise={(ex) => {
            onAddCustomExercise(ex);
            showToast(`Exercício "${ex.name}" adicionado à biblioteca`);
          }}
        />
      )}

      {/* Toast */}
      {toast && (
        <div
          data-testid="personal-toast"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl text-sm animate-in slide-in-from-bottom-4 fade-in-0 duration-300"
          style={{
            background: "rgba(20,20,20,0.95)",
            border: `1px solid ${toast.tone === "danger" ? "rgba(255,80,80,0.4)" : "rgba(34,199,199,0.4)"}`,
            color: toast.tone === "danger" ? "#c13d4a" : "var(--shapeos-brand)",
            boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
            fontFamily: "'Sora', sans-serif",
          }}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
};

export default PersonalView;
