"use client";
import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import styles from "./agenda-panel.module.css";
import { AgendaDatePicker } from "./agenda-date-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  dayOf,
  removeAgenda,
  saveAgenda,
  today,
  type Agenda,
  type Session,
  type Workout,
} from "@/services/fitness";
export function AgendaPanel({
  alunoId,
  workouts,
  agenda,
  sessions,
  onChange,
  onStart,
  compact = false,
}: {
  alunoId: string;
  workouts: Workout[];
  agenda: Agenda[];
  sessions: Session[];
  onChange: () => void;
  onStart?: (w: Workout) => void;
  compact?: boolean;
}) {
  const [date, setDate] = useState(today()),
    [treino, setTreino] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function action(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await fn();
      onChange();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Não foi possível salvar a agenda",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className={compact ? styles.compact : "space-y-5"}>
      <section className={compact ? styles.planner : "rounded-2xl border bg-card p-5"}>
        <h2 className="text-lg font-semibold">Planejar sessões</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Escolha uma ficha e a data. Remarcar preserva os registros do treino.
        </p>
        <div className={compact ? styles.form : "grid sm:grid-cols-3 gap-3 mt-4"}>
          <div>
            <Label htmlFor="agenda-workout">Ficha</Label>
            {compact ? <WorkoutPicker workouts={workouts} value={treino} onChange={setTreino} /> : (
            <select
              id="agenda-workout"
              className="w-full h-10 rounded-md border bg-background px-2"
              value={treino}
              onChange={(e) => setTreino(e.target.value)}
            >
              <option value="">Selecione</option>
              {workouts.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.titulo}
                </option>
              ))}
            </select>)}
          </div>
          <div>
            <Label htmlFor="agenda-date">Data</Label>
            {compact ? <AgendaDatePicker id="agenda-date" allowClear label="Data" value={date} onChange={setDate} /> : <Input
              id="agenda-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />}
          </div>
          <Button
            className="self-end"
            disabled={!treino || !date || busy}
            onClick={() =>
              void action(() =>
                saveAgenda({
                  aluno_id: alunoId,
                  treino_id: treino,
                  data: date,
                }),
              )
            }
          >
            Agendar
          </Button>
        </div>
      </section>
      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
      {!agenda.length && (
        <p className="p-5 text-muted-foreground">Nenhuma sessão agendada.</p>
      )}
      <div className={compact ? styles.list : "space-y-3"}>
        {[...agenda]
          .sort((a, b) => a.data.localeCompare(b.data))
          .map((a) => {
            const w = workouts.find((w) => w.id === a.treino_id),
              actual = sessions.filter(
                (s) =>
                  s.treino_id === a.treino_id && dayOf(s.inicio) === a.data,
              ),
              finished = actual.some((s) => s.status === "CONCLUIDO"),
              state = finished
                ? "Realizado"
                : actual.length
                  ? "Em andamento"
                  : a.data < today()
                    ? "Sem sessão registrada"
                    : a.data === today()
                      ? "Hoje"
                      : "Planejado";
            return (
              <div
                key={a.id}
                className={compact ? styles.row : "rounded-2xl border bg-card p-4 flex flex-wrap items-center justify-between gap-3"}
              >
                <div>
                  <p className="font-medium">{w?.titulo ?? "Ficha pausada"}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(`${a.data}T12:00:00`).toLocaleDateString("pt-BR")}{" "}
                    ·{" "}
                    <span className={compact ? styles.status : finished ? "text-primary" : ""} data-finished={finished}>
                      {state}
                    </span>
                  </p>
                </div>
                <div className={compact ? styles.actions : "flex flex-wrap items-center gap-2"}>
                  {onStart && w && !finished && (
                    <Button
                      size="sm"
                      disabled={busy}
                      onClick={() => onStart(w)}
                    >
                      Treinar
                    </Button>
                  )}
                  {compact ? <AgendaDatePicker label={`Remarcar ${w?.titulo ?? "sessão"}`} value={a.data} disabled={busy || finished} onChange={value => {
                    if (value) void action(() => saveAgenda({ ...a, data: value }));
                  }} /> : <Input
                    aria-label={`Remarcar ${w?.titulo ?? "sessão"}`}
                    type="date"
                    className="w-40"
                    value={a.data}
                    disabled={busy || finished}
                    onChange={(e) => {
                      if (e.target.value)
                        void action(() =>
                          saveAgenda({ ...a, data: e.target.value }),
                        );
                    }}
                  />}
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={busy}
                    onClick={() => void action(() => removeAgenda(a.id))}
                  >
                    Remover agenda
                  </Button>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}


function WorkoutPicker({ workouts, value, onChange }: { workouts: Workout[]; value: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false), [search, setSearch] = useState("");
  const field = useRef<HTMLDivElement>(null), trigger = useRef<HTMLButtonElement>(null), input = useRef<HTMLInputElement>(null);
  const id = useId();
  const selected = workouts.find(workout => workout.id === value);
  const close = () => { setOpen(false); setSearch(""); trigger.current?.focus(); };
  useEffect(() => {
    if (!open) return;
    input.current?.focus();
    const outside = (event: PointerEvent) => { if (!field.current?.contains(event.target as Node)) { setOpen(false); setSearch(""); } };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);
  const normalize = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim();
  const filtered = workouts.filter(workout => normalize(workout.titulo).includes(normalize(search)));
  return <div className={styles.picker} ref={field}>
    <button id="agenda-workout" ref={trigger} className={styles.trigger} type="button" aria-label={"Ficha: " + (selected?.titulo ?? "Selecione")}
      aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? id : undefined}
      onClick={() => { setOpen(previous => !previous); setSearch(""); }}>
      <span>{selected?.titulo ?? "Selecione"}</span><ChevronDown size={15} aria-hidden="true" />
    </button>
    {open && <div id={id} role="dialog" aria-label="Selecionar ficha" className={styles.menu}
      onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node) && !trigger.current?.contains(event.relatedTarget as Node)) { setOpen(false); setSearch(""); } }}
      onKeyDown={event => {
        if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); close(); }
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>("input,button"));
          const current = controls.indexOf(document.activeElement as HTMLElement);
          const next = event.key === "ArrowDown" ? Math.min(current + 1, controls.length - 1) : Math.max(current - 1, 0);
          event.preventDefault(); controls[next]?.focus();
        }
      }}>
      <div className={styles.search}><Search size={14} aria-hidden="true" /><input ref={input} type="search" placeholder="Buscar ficha…" aria-label="Buscar ficha" value={search} onChange={event => setSearch(event.target.value)} /></div>
      <div className={styles.options}>
        <button type="button" aria-pressed={!value} onClick={() => { onChange(""); close(); }}><span>Selecione</span>{!value && <Check size={14} aria-hidden="true" />}</button>
        {filtered.map(workout => <button type="button" key={workout.id} aria-pressed={value === workout.id} onClick={() => { onChange(workout.id); close(); }}><span>{workout.titulo}</span>{value === workout.id && <Check size={14} aria-hidden="true" />}</button>)}
        {!filtered.length && <p role="status">Nenhuma ficha encontrada.</p>}
      </div>
    </div>}
  </div>;
}
