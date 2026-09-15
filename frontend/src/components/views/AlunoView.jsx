import React, { useMemo, useState } from "react";
import {
  Flame,
  Clock,
  Dumbbell,
  Repeat,
  Weight,
  Timer,
  CheckCircle2,
  Circle,
  ChevronRight,
  LogOut,
  Trophy,
  Coffee,
  CalendarDays,
} from "lucide-react";
import Logo from "@/components/Logo";
import ExerciseGif from "@/components/ExerciseGif";
import { weekDays, jsDayToKey, workoutTemplates, students } from "@/data/mockData";

const StatChip = ({ icon: Icon, label, value, accent }) => (
  <div
    className="flex items-center gap-2 px-3 py-1.5 rounded-full"
    style={{
      background: "rgba(255,255,255,0.03)",
      border: "1px solid rgba(255,255,255,0.06)",
    }}
  >
    <Icon className="w-3.5 h-3.5" style={{ color: accent || "#00D2D2" }} />
    <span className="text-xs text-zinc-500">{label}</span>
    <span className="text-xs text-[#F5F5F5] font-medium">{value}</span>
  </div>
);

const ExerciseCard = ({ exercise, done, onToggle }) => (
  <div
    data-testid={`exercise-card-${exercise.id}`}
    className={`group rounded-2xl p-4 transition-all duration-300 hover:-translate-y-0.5 ${
      done ? "opacity-70" : "opacity-100"
    }`}
    style={{
      background: "linear-gradient(160deg, rgba(255,255,255,0.045), rgba(255,255,255,0.015))",
      border: `1px solid ${done ? "rgba(0,210,210,0.35)" : "rgba(255,255,255,0.07)"}`,
      boxShadow: done
        ? "0 0 0 1px rgba(0,210,210,0.15), 0 12px 30px rgba(0,0,0,0.35)"
        : "0 12px 30px rgba(0,0,0,0.3)",
    }}
  >
    <div className="flex items-center gap-4">
      {/* Order number */}
      <div
        className="w-11 h-11 rounded-xl flex-shrink-0 flex items-center justify-center"
        style={{
          background: done ? "rgba(0,210,210,0.15)" : "rgba(0,210,210,0.06)",
          color: "#00D2D2",
          border: `1px solid ${done ? "rgba(0,210,210,0.4)" : "rgba(0,210,210,0.2)"}`,
          fontFamily: "'Unbounded', sans-serif",
          fontWeight: 600,
          fontSize: "0.95rem",
        }}
      >
        {String(exercise.order).padStart(2, "0")}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div
          className="text-[10px] text-zinc-500 uppercase tracking-widest"
          style={{ fontFamily: "'Sora', sans-serif" }}
        >
          {exercise.muscle} · {exercise.equipment}
        </div>
        <h3
          className="text-lg md:text-xl text-[#F5F5F5] leading-tight mt-1 truncate"
          style={{
            fontFamily: "'Unbounded', sans-serif",
            fontWeight: 500,
            letterSpacing: "-0.01em",
          }}
          title={exercise.name}
        >
          {exercise.name}
        </h3>

        <div
          className="mt-3 flex items-center gap-2 flex-wrap"
          style={{ fontFamily: "'Sora', sans-serif" }}
        >
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)",
              color: "#F5F5F5",
            }}
          >
            <Repeat className="w-3 h-3 text-zinc-500" /> {exercise.sets}
            <span className="text-zinc-500">séries</span>
          </span>
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)",
              color: "#F5F5F5",
            }}
          >
            <Dumbbell className="w-3 h-3 text-zinc-500" /> {exercise.reps}
            <span className="text-zinc-500">reps</span>
          </span>
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs"
            style={{
              background: "rgba(255,112,67,0.08)",
              border: "1px solid rgba(255,112,67,0.25)",
              color: "#FF7043",
              fontWeight: 600,
            }}
          >
            <Weight className="w-3 h-3" /> {exercise.weight}
          </span>
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)",
              color: "#F5F5F5",
            }}
          >
            <Timer className="w-3 h-3 text-zinc-500" /> {exercise.rest}
            <span className="text-zinc-500">rest</span>
          </span>
        </div>
      </div>

      {/* GIF thumbnail RIGHT */}
      <ExerciseGif src={exercise.gif} alt={exercise.name} size={112} />

      {/* Toggle */}
      <button
        data-testid={`exercise-toggle-${exercise.id}`}
        onClick={() => onToggle(exercise.id)}
        className="flex-shrink-0 transition-transform hover:scale-110"
        aria-label="Concluir exercício"
      >
        {done ? (
          <CheckCircle2 className="w-7 h-7 text-[#00D2D2]" />
        ) : (
          <Circle className="w-7 h-7 text-zinc-600" />
        )}
      </button>
    </div>
  </div>
);

const RestDayCard = () => (
  <div
    data-testid="rest-day-card"
    className="rounded-3xl p-10 text-center flex flex-col items-center gap-4"
    style={{
      background: "linear-gradient(160deg, rgba(255,255,255,0.045), rgba(255,255,255,0.01))",
      border: "1px dashed rgba(255,255,255,0.12)",
    }}
  >
    <div
      className="w-16 h-16 rounded-2xl flex items-center justify-center"
      style={{
        background: "rgba(0,210,210,0.08)",
        border: "1px solid rgba(0,210,210,0.25)",
      }}
    >
      <Coffee className="w-7 h-7 text-[#00D2D2]" strokeWidth={1.6} />
    </div>
    <div>
      <h3
        className="text-2xl text-[#F5F5F5]"
        style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 600, letterSpacing: "-0.01em" }}
      >
        Dia de Recuperação
      </h3>
      <p className="text-sm text-zinc-400 mt-2 max-w-md mx-auto" style={{ fontFamily: "'Sora', sans-serif" }}>
        Hoje é dia de descanso. Hidrate-se, durma bem e volte mais forte no próximo treino.
      </p>
    </div>
  </div>
);

export const AlunoView = ({ onLogout, workouts }) => {
  const student = students[0]; // Rafael Martins (mock aluno logado)
  const todayKey = jsDayToKey[new Date().getDay()];

  const [selectedDay, setSelectedDay] = useState(todayKey);
  const [completed, setCompleted] = useState({}); // { [workoutId]: Set }
  const [finished, setFinished] = useState(false);

  const workoutId = student.schedule[selectedDay];
  const workout = workoutId ? workouts[workoutId] : null;
  const isRest = workoutId === "rest" || !workout;

  const doneSet = completed[workoutId] || new Set();
  const total = workout?.exercises.length || 0;
  const doneCount = doneSet.size;
  const progress = total ? Math.round((doneCount / total) * 100) : 0;

  const toggle = (exId) => {
    setCompleted((prev) => {
      const key = workoutId;
      const current = new Set(prev[key] || []);
      if (current.has(exId)) current.delete(exId);
      else current.add(exId);
      return { ...prev, [key]: current };
    });
  };

  const handleFinish = () => {
    setFinished(true);
    setTimeout(() => setFinished(false), 3500);
  };

  const todayLabel = useMemo(
    () => weekDays.find((d) => d.key === todayKey)?.label || "",
    [todayKey]
  );

  return (
    <div className="min-h-screen pb-32" data-testid="aluno-view">
      {/* Top bar */}
      <div
        className="sticky top-0 z-30 backdrop-blur-xl"
        style={{
          background: "rgba(26,26,26,0.7)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div className="max-w-5xl mx-auto px-5 py-4 flex items-center justify-between">
          <Logo size="sm" />
          <button
            data-testid="aluno-logout-button"
            onClick={onLogout}
            className="text-xs text-zinc-500 hover:text-[#F5F5F5] flex items-center gap-1.5 transition-colors"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            <LogOut className="w-3.5 h-3.5" /> Sair
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-5 pt-10">
        {/* Header */}
        <div className="mb-6">
          <div
            className="flex items-center gap-2 text-xs text-zinc-500 uppercase tracking-[0.3em]"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            <Flame className="w-3.5 h-3.5 text-[#FF7043]" />
            {selectedDay === todayKey ? `Hoje · ${todayLabel}` : weekDays.find((d) => d.key === selectedDay)?.label}
          </div>
          <div className="mt-3 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <h1
                className="text-4xl sm:text-5xl lg:text-6xl text-[#F5F5F5] leading-[0.95]"
                style={{
                  fontFamily: "'Unbounded', sans-serif",
                  fontWeight: 600,
                  letterSpacing: "-0.03em",
                }}
              >
                Olá, <span className="text-[#00D2D2]">{student.name.split(" ")[0]}</span>
              </h1>
              <p
                className="mt-3 text-base md:text-lg text-zinc-400"
                style={{ fontFamily: "'Sora', sans-serif" }}
              >
                {isRest ? "Descanso · Recuperação" : `${workout.code} · ${workout.title}`}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <StatChip
                icon={Clock}
                label="Duração"
                value={isRest ? "—" : workout.duration}
              />
              <StatChip icon={Trophy} label="Streak" value={`${student.streak} dias`} accent="#FF7043" />
              <StatChip
                icon={Dumbbell}
                label="Foco"
                value={isRest ? "Descanso" : workout.focus}
              />
            </div>
          </div>
        </div>

        {/* Week picker */}
        <div
          className="mb-8 rounded-2xl p-3"
          style={{
            background: "linear-gradient(160deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))",
            border: "1px solid rgba(255,255,255,0.07)",
          }}
          data-testid="week-picker"
        >
          <div
            className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-zinc-500 mb-3 px-2"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            <CalendarDays className="w-3 h-3" />
            Cronograma da semana
          </div>
          <div className="grid grid-cols-7 gap-1.5 md:gap-2">
            {weekDays.map((day) => {
              const wId = student.schedule[day.key];
              const template = workoutTemplates.find((t) => t.id === wId);
              const isToday = day.key === todayKey;
              const isSelected = day.key === selectedDay;
              const isRestDay = wId === "rest";

              return (
                <button
                  key={day.key}
                  data-testid={`day-${day.key}`}
                  onClick={() => setSelectedDay(day.key)}
                  className="relative rounded-xl p-2 md:p-3 transition-all duration-200 hover:-translate-y-0.5"
                  style={{
                    background: isSelected
                      ? "rgba(0,210,210,0.12)"
                      : "rgba(255,255,255,0.02)",
                    border: `1px solid ${isSelected ? "rgba(0,210,210,0.5)" : "rgba(255,255,255,0.06)"}`,
                    boxShadow: isSelected ? "0 0 20px rgba(0,210,210,0.2)" : "none",
                  }}
                >
                  <div
                    className="text-[10px] uppercase tracking-widest text-zinc-500"
                    style={{ fontFamily: "'Sora', sans-serif" }}
                  >
                    {day.short}
                  </div>
                  <div
                    className={`mt-1.5 text-xs md:text-sm ${
                      isRestDay ? "text-zinc-500" : "text-[#F5F5F5]"
                    }`}
                    style={{
                      fontFamily: "'Unbounded', sans-serif",
                      fontWeight: 600,
                    }}
                  >
                    {isRestDay ? "Off" : template?.id}
                  </div>
                  {isToday && (
                    <span
                      className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full"
                      style={{ background: "#FF7043", boxShadow: "0 0 6px #FF7043" }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Progress */}
        {!isRest && (
          <div
            className="mb-6 rounded-2xl p-5"
            style={{
              background: "linear-gradient(160deg, rgba(255,255,255,0.045), rgba(255,255,255,0.015))",
              border: "1px solid rgba(255,255,255,0.07)",
            }}
          >
            <div
              className="flex items-center justify-between mb-3"
              style={{ fontFamily: "'Sora', sans-serif" }}
            >
              <span className="text-xs text-zinc-500 uppercase tracking-widest">Progresso da sessão</span>
              <span className="text-sm text-[#F5F5F5] font-semibold">
                {doneCount}/{total}{" "}
                <span className="text-zinc-500 font-normal">
                  exercícios · {progress}%
                </span>
              </span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
              <div
                data-testid="session-progress-bar"
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${progress}%`,
                  background: "linear-gradient(90deg, #00D2D2, #FF7043)",
                  boxShadow: "0 0 12px rgba(0,210,210,0.5)",
                }}
              />
            </div>
          </div>
        )}

        {/* Exercises or Rest */}
        {isRest ? (
          <RestDayCard />
        ) : (
          <div className="space-y-4" data-testid="exercise-list">
            {workout.exercises.map((ex) => (
              <ExerciseCard
                key={ex.id}
                exercise={ex}
                done={doneSet.has(ex.id)}
                onToggle={toggle}
              />
            ))}
          </div>
        )}
      </div>

      {/* Sticky finish button (only for active workout day) */}
      {!isRest && (
        <div
          className="fixed bottom-0 left-0 right-0 z-40 px-4 pb-5 pt-8 pointer-events-none"
          style={{
            background: "linear-gradient(to top, rgba(26,26,26,0.98) 55%, rgba(26,26,26,0))",
          }}
        >
          <div className="max-w-3xl mx-auto pointer-events-auto">
            <button
              data-testid="finish-workout-button"
              onClick={handleFinish}
              className="group w-full flex items-center justify-center gap-3 py-4 rounded-2xl text-[#1A1A1A] font-semibold transition-all duration-300 hover:scale-[1.01] active:scale-[0.99]"
              style={{
                background: finished ? "#00D2D2" : "#FF7043",
                boxShadow: finished
                  ? "0 14px 32px rgba(0,210,210,0.4)"
                  : "0 14px 32px rgba(255,112,67,0.4), inset 0 -3px 0 rgba(0,0,0,0.15)",
                fontFamily: "'Sora', sans-serif",
                letterSpacing: "0.03em",
              }}
            >
              {finished ? (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  Treino finalizado! Bom trabalho.
                </>
              ) : (
                <>
                  <Flame className="w-5 h-5" />
                  Finalizar Treino
                  <ChevronRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AlunoView;
