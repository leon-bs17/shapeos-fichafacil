'use client';

import React, { useMemo, useState } from "react";
import {
  X,
  Plus,
  Search,
  Trash2,
  Save,
  Dumbbell,
  ChevronUp,
  ChevronDown,
  Sparkles,
} from "lucide-react";
import ExerciseGif from "@/davi/components/ExerciseGif";
import CreateExerciseModal from "@/davi/components/CreateExerciseModal";
import { exerciseLibrary } from "@/davi/data/mockData";

/**
 * WorkoutEditor — full-screen modal to edit a workout template.
 * The Personal can rename it, change focus/duration, edit each exercise's
 * sets/reps/weight/rest, reorder, remove, and add from the library.
 */
export const WorkoutEditor = ({ template, workout, onCancel, onSave, customExercises = [], onAddCustomExercise }) => {
  const [title, setTitle] = useState(workout?.title || "");
  const [focus, setFocus] = useState(workout?.focus || "");
  const [duration, setDuration] = useState(workout?.duration || "≈ 60 min");
  const [exercises, setExercises] = useState(
    workout?.exercises?.map((e) => ({ ...e })) || []
  );
  const [libraryOpen, setLibraryOpen] = useState(false);

  const updateExercise = (id, patch) => {
    setExercises((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  };

  const removeExercise = (id) => {
    setExercises((prev) => {
      const next = prev.filter((e) => e.id !== id);
      return next.map((e, i) => ({ ...e, order: i + 1 }));
    });
  };

  const move = (index, delta) => {
    setExercises((prev) => {
      const next = [...prev];
      const target = index + delta;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next.map((e, i) => ({ ...e, order: i + 1 }));
    });
  };

  const addFromLibrary = (item) => {
    const newId = `${template.id}-${Date.now().toString(36)}`;
    const newExercise = {
      id: newId,
      order: exercises.length + 1,
      name: item.name,
      muscle: item.muscle,
      equipment: item.equipment,
      sets: 3,
      reps: "10 - 12",
      weight: "—",
      rest: "60s",
      gif: item.gif,
    };
    setExercises((prev) => [...prev, newExercise]);
    setLibraryOpen(false);
  };

  const handleSave = () => {
    onSave({
      ...workout,
      code: template.code,
      title,
      focus,
      duration,
      exercises: exercises.map((e, i) => ({ ...e, order: i + 1 })),
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch justify-center"
      data-testid="workout-editor"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 backdrop-blur-sm"
        style={{ background: "rgba(10,10,10,0.75)" }}
        onClick={onCancel}
      />
      <div
        className="relative w-full max-w-4xl m-4 md:m-6 rounded-3xl flex flex-col overflow-hidden animate-in fade-in-0 zoom-in-95 duration-200"
        style={{
          background: "var(--shapeos-surface)",
          border: "1px solid rgba(var(--shapeos-neutral-rgb),0.08)",
          boxShadow: "0 30px 70px rgba(0,0,0,0.6), inset 0 1px 0 rgba(var(--shapeos-neutral-rgb),0.06)",
          maxHeight: "calc(100vh - 3rem)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-start gap-4 p-6 md:p-7"
          style={{ borderBottom: "1px solid rgba(var(--shapeos-neutral-rgb),0.06)" }}
        >
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{
              background: `${template.accent}1a`,
              border: `1px solid ${template.accent}66`,
            }}
          >
            <span
              className="text-lg"
              style={{
                fontFamily: "'Unbounded', sans-serif",
                fontWeight: 700,
                color: template.accent,
              }}
            >
              {template.id}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div
              className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground"
              style={{ fontFamily: "'Sora', sans-serif" }}
            >
              Editando · {template.code}
            </div>
            <input
              data-testid="editor-title-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nome do treino"
              className="mt-1 w-full bg-transparent outline-none text-2xl md:text-3xl text-[var(--shapeos-text)]"
              style={{
                fontFamily: "'Unbounded', sans-serif",
                fontWeight: 600,
                letterSpacing: "-0.02em",
              }}
            />
          </div>
          <button
            onClick={onCancel}
            data-testid="editor-close-button"
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors hover:bg-white/5 text-muted-foreground"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Meta inputs */}
        <div
          className="grid grid-cols-1 md:grid-cols-2 gap-3 px-6 md:px-7 py-4"
          style={{ fontFamily: "'Sora', sans-serif" }}
        >
          <div>
            <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Foco</label>
            <input
              data-testid="editor-focus-input"
              value={focus}
              onChange={(e) => setFocus(e.target.value)}
              placeholder="ex: Força + Hipertrofia"
              className="mt-1.5 w-full px-3 py-2.5 rounded-xl text-sm text-[var(--shapeos-text)] outline-none focus:border-[var(--shapeos-brand)]/60 focus:ring-2 focus:ring-[var(--shapeos-brand)]/20"
              style={{ background: "rgba(var(--shapeos-neutral-rgb),0.03)", border: "1px solid rgba(var(--shapeos-neutral-rgb),0.08)" }}
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Duração estimada</label>
            <input
              data-testid="editor-duration-input"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="≈ 60 min"
              className="mt-1.5 w-full px-3 py-2.5 rounded-xl text-sm text-[var(--shapeos-text)] outline-none focus:border-[var(--shapeos-brand)]/60 focus:ring-2 focus:ring-[var(--shapeos-brand)]/20"
              style={{ background: "rgba(var(--shapeos-neutral-rgb),0.03)", border: "1px solid rgba(var(--shapeos-neutral-rgb),0.08)" }}
            />
          </div>
        </div>

        {/* Exercises list */}
        <div className="flex-1 overflow-y-auto px-6 md:px-7 pb-4">
          <div className="flex items-center justify-between mb-3">
            <h3
              className="text-sm text-[var(--shapeos-text)]"
              style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500 }}
            >
              Exercícios <span className="text-muted-foreground">({exercises.length})</span>
            </h3>
            <button
              data-testid="add-exercise-button"
              onClick={() => setLibraryOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all hover:scale-[1.02]"
              style={{
                background: "rgba(34,199,199,0.1)",
                color: "var(--shapeos-brand)",
                border: "1px solid rgba(34,199,199,0.35)",
                fontFamily: "'Sora', sans-serif",
              }}
            >
              <Plus className="w-3.5 h-3.5" /> Adicionar exercício
            </button>
          </div>

          {exercises.length === 0 ? (
            <div
              className="text-center py-12 rounded-2xl text-muted-foreground text-sm"
              style={{
                background: "rgba(var(--shapeos-neutral-rgb),0.02)",
                border: "1px dashed rgba(var(--shapeos-neutral-rgb),0.08)",
                fontFamily: "'Sora', sans-serif",
              }}
            >
              <Dumbbell className="w-8 h-8 mx-auto text-muted-foreground mb-2" strokeWidth={1.5} />
              Nenhum exercício ainda. Toque em &quot;Adicionar exercício&quot; para montar a ficha.
            </div>
          ) : (
            <div className="space-y-2">
              {exercises.map((ex, index) => (
                <ExerciseEditorRow
                  key={ex.id}
                  exercise={ex}
                  index={index}
                  total={exercises.length}
                  onChange={(patch) => updateExercise(ex.id, patch)}
                  onRemove={() => removeExercise(ex.id)}
                  onMove={(delta) => move(index, delta)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div
          className="flex gap-3 p-6 md:p-7"
          style={{
            borderTop: "1px solid rgba(var(--shapeos-neutral-rgb),0.06)",
            fontFamily: "'Sora', sans-serif",
          }}
        >
          <button
            data-testid="editor-cancel-button"
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
            data-testid="editor-save-button"
            onClick={handleSave}
            className="flex-[2] flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-[var(--shapeos-on-brand)] transition-all hover:scale-[1.01]"
            style={{
              background: "var(--shapeos-brand)",
              boxShadow: "none",
            }}
          >
            <Save className="w-4 h-4" /> Salvar treino
          </button>
        </div>
      </div>

      {libraryOpen && (
        <LibraryPicker
          existingNames={exercises.map((e) => e.name)}
          onCancel={() => setLibraryOpen(false)}
          onPick={addFromLibrary}
          customExercises={customExercises}
          onAddCustomExercise={onAddCustomExercise}
        />
      )}
    </div>
  );
};

const ExerciseEditorRow = ({ exercise, index, total, onChange, onRemove, onMove }) => (
  <div
    data-testid={`editor-row-${exercise.id}`}
    className="rounded-2xl p-3"
    style={{
      background: "rgba(var(--shapeos-neutral-rgb),0.03)",
      border: "1px solid rgba(var(--shapeos-neutral-rgb),0.06)",
    }}
  >
    <div className="flex items-center gap-3">
      {/* Reorder + order */}
      <div className="flex flex-col items-center gap-1">
        <button
          data-testid={`move-up-${exercise.id}`}
          disabled={index === 0}
          onClick={() => onMove(-1)}
          className="text-muted-foreground hover:text-[var(--shapeos-text)] disabled:opacity-20 transition-colors"
          aria-label="Mover para cima"
        >
          <ChevronUp className="w-4 h-4" />
        </button>
        <span
          className="text-xs w-6 h-6 rounded-md flex items-center justify-center"
          style={{
            background: "rgba(34,199,199,0.1)",
            color: "var(--shapeos-brand)",
            border: "1px solid rgba(34,199,199,0.25)",
            fontFamily: "'Unbounded', sans-serif",
            fontWeight: 600,
          }}
        >
          {String(index + 1).padStart(2, "0")}
        </span>
        <button
          data-testid={`move-down-${exercise.id}`}
          disabled={index === total - 1}
          onClick={() => onMove(1)}
          className="text-muted-foreground hover:text-[var(--shapeos-text)] disabled:opacity-20 transition-colors"
          aria-label="Mover para baixo"
        >
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>

      {/* Info + metrics */}
      <div className="flex-1 min-w-0">
        <div
          className="text-[10px] uppercase tracking-widest text-muted-foreground"
          style={{ fontFamily: "'Sora', sans-serif" }}
        >
          {exercise.muscle} · {exercise.equipment}
        </div>
        <h4
          className="text-sm md:text-base text-[var(--shapeos-text)] mt-0.5 truncate"
          style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500 }}
          title={exercise.name}
        >
          {exercise.name}
        </h4>
        <div
          className="mt-2 grid grid-cols-4 gap-2"
          style={{ fontFamily: "'Sora', sans-serif" }}
        >
          <MetricInput
            label="Séries"
            value={exercise.sets}
            testId={`sets-${exercise.id}`}
            onChange={(v) => onChange({ sets: v.replace(/[^0-9]/g, "") })}
          />
          <MetricInput
            label="Reps"
            value={exercise.reps}
            testId={`reps-${exercise.id}`}
            onChange={(v) => onChange({ reps: v })}
          />
          <MetricInput
            label="Carga"
            value={exercise.weight}
            accent
            testId={`weight-${exercise.id}`}
            onChange={(v) => onChange({ weight: v })}
          />
          <MetricInput
            label="Rest"
            value={exercise.rest}
            testId={`rest-${exercise.id}`}
            onChange={(v) => onChange({ rest: v })}
          />
        </div>
      </div>

      {/* Preview */}
      <ExerciseGif src={exercise.gif} alt={exercise.name} size={72} />

      {/* Remove */}
      <button
        data-testid={`remove-exercise-${exercise.id}`}
        onClick={onRemove}
        className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-105"
        style={{
          background: "rgba(255,80,80,0.08)",
          color: "hsl(var(--destructive))",
          border: "1px solid rgba(255,80,80,0.25)",
        }}
        aria-label="Remover exercício"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  </div>
);

const MetricInput = ({ label, value, onChange, accent, testId }) => (
  <div>
    <div className="text-[9px] uppercase tracking-widest text-muted-foreground">{label}</div>
    <input
      data-testid={testId}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="mt-0.5 w-full px-2 py-1.5 rounded-lg text-sm outline-none focus:ring-1 focus:ring-[var(--shapeos-brand)]/40"
      style={{
        background: accent ? "rgba(34,199,199,0.08)" : "rgba(var(--shapeos-neutral-rgb),0.04)",
        border: `1px solid ${accent ? "rgba(34,199,199,0.25)" : "rgba(var(--shapeos-neutral-rgb),0.07)"}`,
        color: accent ? "var(--shapeos-brand)" : "var(--shapeos-text)",
        fontWeight: accent ? 600 : 500,
      }}
    />
  </div>
);

/* Library picker */
const LibraryPicker = ({ existingNames, onCancel, onPick, customExercises = [], onAddCustomExercise }) => {
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const allExercises = useMemo(
    () => [...customExercises, ...exerciseLibrary],
    [customExercises]
  );

  const filtered = useMemo(
    () =>
      allExercises.filter((e) =>
        `${e.name} ${e.muscle} ${e.equipment}`.toLowerCase().includes(query.toLowerCase())
      ),
    [allExercises, query]
  );

  const handleCreated = (exercise) => {
    onAddCustomExercise?.(exercise);
    setCreateOpen(false);
    // Auto-add to workout right after creation
    onPick(exercise);
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      data-testid="library-picker"
      role="dialog"
      aria-modal="true"
    >
      <div className="absolute inset-0" style={{ background: "rgba(10,10,10,0.7)" }} onClick={onCancel} />
      <div
        className="relative w-full max-w-2xl rounded-3xl flex flex-col overflow-hidden animate-in fade-in-0 zoom-in-95 duration-200"
        style={{
          background: "var(--shapeos-surface)",
          border: "1px solid rgba(var(--shapeos-neutral-rgb),0.08)",
          boxShadow: "0 30px 70px rgba(0,0,0,0.6)",
          maxHeight: "85vh",
        }}
      >
        {/* Header */}
        <div
          className="p-6"
          style={{ borderBottom: "1px solid rgba(var(--shapeos-neutral-rgb),0.06)" }}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3
                className="text-xl text-[var(--shapeos-text)]"
                style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 600, letterSpacing: "-0.01em" }}
              >
                Biblioteca de Exercícios
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5" style={{ fontFamily: "'Sora', sans-serif" }}>
                Toque em um exercício para adicionar à ficha · {allExercises.length} disponíveis
              </p>
            </div>
            <button
              onClick={onCancel}
              data-testid="library-close-button"
              className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-white/5 text-muted-foreground"
              aria-label="Fechar biblioteca"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                data-testid="library-search-input"
                placeholder="Buscar por nome ou grupo muscular..."
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
            <button
              data-testid="library-create-button"
              onClick={() => setCreateOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all hover:scale-[1.02] flex-shrink-0"
              style={{
                background: "var(--shapeos-brand)",
                color: "var(--shapeos-on-brand)",
                boxShadow: "none",
                fontFamily: "'Sora', sans-serif",
              }}
            >
              <Sparkles className="w-3.5 h-3.5" /> Novo exercício
            </button>
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filtered.map((item) => {
              const alreadyAdded = existingNames.includes(item.name);
              return (
                <button
                  key={item.id}
                  data-testid={`library-item-${item.id}`}
                  onClick={() => !alreadyAdded && onPick(item)}
                  disabled={alreadyAdded}
                  className="group flex items-center gap-3 p-3 rounded-2xl text-left transition-all disabled:opacity-40 hover:-translate-y-0.5 relative"
                  style={{
                    background: "rgba(var(--shapeos-neutral-rgb),0.03)",
                    border: `1px solid ${item.custom ? "rgba(34,199,199,0.35)" : "rgba(var(--shapeos-neutral-rgb),0.07)"}`,
                  }}
                >
                  {item.custom && (
                    <span
                      className="absolute top-2 right-2 text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded"
                      style={{
                        background: "rgba(34,199,199,0.15)",
                        color: "var(--shapeos-brand)",
                        border: "1px solid rgba(34,199,199,0.4)",
                        fontFamily: "'Sora', sans-serif",
                      }}
                    >
                      Custom
                    </span>
                  )}
                  <ExerciseGif src={item.gif} alt={item.name} size={64} />
                  <div className="flex-1 min-w-0">
                    <div
                      className="text-[10px] uppercase tracking-widest text-muted-foreground"
                      style={{ fontFamily: "'Sora', sans-serif" }}
                    >
                      {item.muscle}
                    </div>
                    <div
                      className="text-sm text-[var(--shapeos-text)] mt-0.5 truncate"
                      style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500 }}
                    >
                      {item.name}
                    </div>
                    <div
                      className="text-[11px] text-muted-foreground mt-1 truncate"
                      style={{ fontFamily: "'Sora', sans-serif" }}
                    >
                      {item.equipment}
                    </div>
                  </div>
                  {alreadyAdded ? (
                    <span className="text-[10px] text-muted-foreground uppercase tracking-widest" style={{ fontFamily: "'Sora', sans-serif" }}>
                      já na ficha
                    </span>
                  ) : (
                    <Plus className="w-4 h-4 text-[var(--shapeos-brand)] opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </button>
              );
            })}
            {filtered.length === 0 && (
              <div
                className="col-span-full text-center py-10 rounded-2xl text-muted-foreground text-sm"
                style={{
                  background: "rgba(var(--shapeos-neutral-rgb),0.02)",
                  border: "1px dashed rgba(var(--shapeos-neutral-rgb),0.08)",
                  fontFamily: "'Sora', sans-serif",
                }}
              >
                Nenhum exercício encontrado para &quot;{query}&quot;. Toque em &quot;Novo exercício&quot; para criar um.
              </div>
            )}
          </div>
        </div>
      </div>

      {createOpen && (
        <CreateExerciseModal
          onCancel={() => setCreateOpen(false)}
          onCreate={handleCreated}
        />
      )}
    </div>
  );
};

export default WorkoutEditor;
