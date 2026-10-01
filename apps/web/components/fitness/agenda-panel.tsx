"use client";
import { useState } from "react";
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
}: {
  alunoId: string;
  workouts: Workout[];
  agenda: Agenda[];
  sessions: Session[];
  onChange: () => void;
  onStart?: (w: Workout) => void;
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
    <div className="space-y-5">
      <section className="rounded-2xl border bg-card p-5">
        <h2 className="text-lg font-semibold">Planejar sessões</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Escolha uma ficha e a data. Remarcar preserva os registros do treino.
        </p>
        <div className="grid sm:grid-cols-3 gap-3 mt-4">
          <div>
            <Label htmlFor="agenda-workout">Ficha</Label>
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
            </select>
          </div>
          <div>
            <Label htmlFor="agenda-date">Data</Label>
            <Input
              id="agenda-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
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
      <div className="space-y-3">
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
                className="rounded-2xl border bg-card p-4 flex flex-wrap items-center justify-between gap-3"
              >
                <div>
                  <p className="font-medium">{w?.titulo ?? "Ficha pausada"}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(`${a.data}T12:00:00`).toLocaleDateString("pt-BR")}{" "}
                    ·{" "}
                    <span className={finished ? "text-primary" : ""}>
                      {state}
                    </span>
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {onStart && w && !finished && (
                    <Button
                      size="sm"
                      disabled={busy}
                      onClick={() => onStart(w)}
                    >
                      Treinar
                    </Button>
                  )}
                  <Input
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
                  />
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
