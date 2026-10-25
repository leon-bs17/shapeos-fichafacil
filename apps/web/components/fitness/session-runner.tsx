"use client";
import { useEffect, useState } from "react";
import { Check, ChevronRight, Clock, Pause, Play, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AutoResizeTextarea } from '@/components/ui/auto-resize-textarea';
import { Label } from "@/components/ui/label";
import { ExerciseDemonstration } from '@/components/fitness/exercise-demonstration';
import {
  completion,
  loadSuggestion,
  previousSets,
  sessionVolume,
  type Exercise,
  type Session,
} from "@/services/fitness";

export function SessionRunner({
  initial,
  history,
  onSave,
  onClose,
}: {
  initial: Session;
  history: Session[];
  onSave: (s: Session) => Promise<void>;
  onClose: () => void;
}) {
  const [session, setSession] = useState(initial),
    [index, setIndex] = useState(() =>
      Math.max(
        0,
        initial.prescricao.findIndex(
          (e) =>
            initial.series.filter((r) => r.item_id === e.id && !r.aquecimento)
              .length < e.series,
        ),
      ),
    );
  const [load, setLoad] = useState(""),
    [reps, setReps] = useState(""),
    [seconds, setSeconds] = useState(""),
    [rpe, setRpe] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [workStart, setWorkStart] = useState(0);
  const [restEnd, setRestEnd] = useState(0),
    [rest, setRest] = useState(0),
    [paused, setPaused] = useState(false);
  const e = session.prescricao[index];
  const logs = session.series.filter((r) => r.item_id === e?.id),
    done = logs.filter((r) => !r.aquecimento).length,
    warm = logs.filter((r) => r.aquecimento).length;
  const warming = warm < (e?.config.aquecimento ?? 0),
    prev = e ? previousSets(history, e, session.id) : [],
    suggestion = e
      ? loadSuggestion(
          history.filter((s) => s.id !== session.id),
          e,
        )
      : { load: null, progress: false };
  useEffect(() => {
    setLoad(suggestion.load == null ? "" : String(suggestion.load));
    setReps("");
    setSeconds("");
    setRpe("");
  }, [e?.id, suggestion.load]);
  useEffect(() => {
    if (!workStart) return;
    const timer = setInterval(
      () => setSeconds(String(Math.floor((Date.now() - workStart) / 1000))),
      250,
    );
    return () => clearInterval(timer);
  }, [workStart]);
  useEffect(() => {
    setWorkStart(0);
  }, [e?.id]);
  useEffect(() => {
    if (!restEnd || paused) return;
    const tick = () => {
      const left = Math.max(0, Math.ceil((restEnd - Date.now()) / 1000));
      setRest(left);
      if (left === 0) {
        setRestEnd(0);
        navigator.vibrate?.(150);
      }
    };
    tick();
    const timer = setInterval(tick, 250);
    return () => clearInterval(timer);
  }, [restEnd, paused]);
  useEffect(() => {
    let lock: WakeLockSentinel | undefined;
    let disposed = false;
    if ("wakeLock" in navigator)
      navigator.wakeLock
        .request("screen")
        .then((v) => {
          if (disposed) void v.release();
          else lock = v;
        })
        .catch(() => {});
    return () => {
      disposed = true;
      void lock?.release();
    };
  }, []);
  async function persist(next: Session) {
    setError("");
    setBusy(true);
    try {
      await onSave(next);
      setSession(next);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar.");
      return false;
    } finally {
      setBusy(false);
    }
  }
  function remaining(ex: Exercise, next: Session) {
    return (
      next.series.filter((r) => r.item_id === ex.id && !r.aquecimento).length <
      ex.series
    );
  }
  async function add() {
    if (!e || busy) return;
    const carga = load.trim() ? Number(load.replace(",", ".")) : null,
      rep = reps.trim() ? Number(reps) : null,
      sec = seconds.trim() ? Number(seconds) : null,
      eff = rpe.trim() ? Number(rpe) : null;
    if (
      (carga != null &&
        (!Number.isFinite(carga) || carga < 0 || carga > 9999)) ||
      (e.config.duracao_segundos
        ? sec == null || !Number.isInteger(sec) || sec < 1 || sec > 7200
        : rep == null || !Number.isInteger(rep) || rep < 1 || rep > 10000) ||
      (eff != null && (!Number.isFinite(eff) || eff < 1 || eff > 10))
    ) {
      setError(
        "Preencha valores válidos: carga positiva, repetições ou tempo e esforço entre 1 e 10.",
      );
      return;
    }
    const next = {
      ...session,
      series: [
        ...session.series,
        {
          id: crypto.randomUUID(),
          item_id: e.id,
          carga,
          reps: e.config.duracao_segundos ? null : rep,
          segundos: e.config.duracao_segundos ? sec : null,
          rpe: eff,
          aquecimento: warming,
          registrado_em: new Date().toISOString(),
        },
      ],
    };
    if (!(await persist(next))) return;
    setWorkStart(0);
    if (warming && warm + 1 >= e.config.aquecimento) {
      setLoad(suggestion.load == null ? "" : String(suggestion.load));
      setReps("");
      setSeconds("");
      setRpe("");
    }
    let ni = index,
      secondsRest = e.descanso_segundos;
    if (!warming && e.config.superset) {
      const group = session.prescricao
        .map((v, i) => ({ v, i }))
        .filter(({ v }) => v.config.superset === e.config.superset);
      const later = group.find(({ i, v }) => i > index && remaining(v, next));
      const first = group.find(({ v }) => remaining(v, next));
      if (later) {
        ni = later.i;
        secondsRest = 0;
      } else if (first) {
        ni = first.i;
        secondsRest = Math.max(...group.map(({ v }) => v.descanso_segundos));
      } else {
        ni = session.prescricao.findIndex(
          (v, i) => i > index && remaining(v, next),
        );
      }
    } else if (!warming && !remaining(e, next))
      ni = session.prescricao.findIndex(
        (v, i) => i > index && remaining(v, next),
      );
    if (ni < 0) ni = session.prescricao.findIndex((v) => remaining(v, next));
    if (ni >= 0) {
      setIndex(ni);
      if (secondsRest > 0) {
        setPaused(false);
        setRestEnd(Date.now() + secondsRest * 1000);
        setRest(secondsRest);
      }
    }
  }
  async function finish() {
    if (
      await persist({
        ...session,
        status: "CONCLUIDO",
        fim: new Date().toISOString(),
      })
    )
      onClose();
  }
  if (!e) return <p>Esta ficha não tem exercícios.</p>;
  const pr =
    load !== "" &&
    prev.length > 0 &&
    Number(load) > Math.max(...prev.map((r) => r.carga ?? 0)) &&
    !warming;
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <header className="flex flex-wrap justify-between gap-3">
        <div>
          <p className="text-sm text-primary">Sessão em andamento</p>
          <h1 className="text-2xl font-semibold">{session.titulo}</h1>
        </div>
        <Button variant="outline" disabled={busy} onClick={() => { void persist(session).then(saved => { if (saved) onClose() }) }}>
          <Pause size={16} className="mr-2" />
          Salvar e sair
        </Button>
      </header>
      <div className="rounded-2xl border bg-card p-4">
        <div className="flex justify-between text-sm">
          <span>{completion(session)}% das séries previstas</span>
          <span>
            {sessionVolume(session).toLocaleString("pt-BR")} kg de volume
          </span>
        </div>
        <div className="mt-3 h-2 rounded bg-muted" role="progressbar" aria-label="Séries previstas realizadas" aria-valuemin={0} aria-valuemax={100} aria-valuenow={completion(session)}>
          <div
            className="h-2 rounded bg-primary"
            style={{ width: `${completion(session)}%` }}
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-2" aria-label="Exercícios da sessão">
        {session.prescricao.map((v, i) => (
          <Button
            key={v.id}
            size="sm"
            variant={i === index ? "default" : "outline"}
            disabled={busy}
            onClick={() => {
              setIndex(i);
              setRestEnd(0);
              setRest(0);
            }}
          >
            {i + 1}. {v.nome}
            {!remaining(v, session) && " ✓"}
          </Button>
        ))}
      </div>
      <section className="rounded-2xl border bg-card p-5 sm:p-7 space-y-5">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            {e.grupo_muscular}
            {e.config.superset && ` · Superset ${e.config.superset}`}
          </p>
          <h2 className="mt-2 text-2xl font-semibold">{e.nome}</h2>
          <p className="text-muted-foreground mt-2">
            {e.series} séries ·{" "}
            {e.config.duracao_segundos
              ? `${e.config.duracao_segundos}s`
              : `${e.repeticoes} repetições`}{" "}
            · descanso {e.descanso_segundos}s
            {e.config.rpe_alvo && ` · RPE alvo ${e.config.rpe_alvo}`}
          </p>
          {e.config.observacoes && (
            <p className="mt-3 rounded-xl bg-muted p-3 text-sm">
              {e.config.observacoes}
            </p>
          )}
          <ExerciseDemonstration key={e.exercicio_id} name={e.nome} exerciseId={e.exercicio_id} videoUrl={e.video_url} />
        </div>
        {prev[0] && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm">
            Último registro: {prev[0].carga ?? "—"} kg ·{" "}
            {prev[0].reps != null
              ? `${prev[0].reps} reps`
              : `${prev[0].segundos}s`}
            {suggestion.progress && (
              <p className="mt-1 text-primary">
                Sugestão: +{e.config.incremento_kg} kg pela regra do personal.
                Ajuste conforme sua execução.
              </p>
            )}
          </div>
        )}
        {rest > 0 ? (
          <div className="text-center space-y-4 py-5">
            <Clock className="mx-auto text-primary" />
            <p className="text-sm text-muted-foreground">Descanso</p>
            <p className="text-5xl font-semibold tabular-nums">
              {Math.floor(rest / 60)}:{String(rest % 60).padStart(2, "0")}
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  if (paused) setRestEnd(Date.now() + rest * 1000);
                  setPaused(!paused);
                }}
              >
                {paused ? <Play size={16} /> : <Pause size={16} />}{" "}
                {paused ? "Retomar" : "Pausar"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setRest(rest + 15);
                  setRestEnd(Date.now() + (rest + 15) * 1000);
                }}
              >
                +15s
              </Button>
              <Button
                onClick={() => {
                  setRest(0);
                  setRestEnd(0);
                }}
              >
                Encerrar descanso
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <h3 className="font-medium">
              {warming
                ? `Aquecimento ${warm + 1}/${e.config.aquecimento}`
                : done >= e.series
                  ? "Séries previstas registradas"
                  : `Série ${done + 1}/${e.series}`}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <Label htmlFor="fitness-load">Carga (kg)</Label>
                <Input
                  id="fitness-load"
                  type="number"
                  min={0}
                  step="0.5"
                  value={load}
                  onChange={(v) => setLoad(v.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="fitness-reps">
                  {e.config.duracao_segundos
                    ? "Tempo realizado (s)"
                    : "Repetições realizadas"}
                </Label>
                <Input
                  id="fitness-reps"
                  type="number"
                  min={1}
                  placeholder={
                    e.config.duracao_segundos
                      ? String(e.config.duracao_segundos)
                      : e.repeticoes
                  }
                  value={e.config.duracao_segundos ? seconds : reps}
                  onChange={(v) =>
                    e.config.duracao_segundos
                      ? setSeconds(v.target.value)
                      : setReps(v.target.value)
                  }
                />
              </div>
              <div>
                <Label htmlFor="fitness-rpe">Esforço RPE (opcional)</Label>
                <Input
                  id="fitness-rpe"
                  type="number"
                  min={1}
                  max={10}
                  step="0.5"
                  placeholder="1–10"
                  value={rpe}
                  onChange={(v) => setRpe(v.target.value)}
                />
              </div>
            </div>
            <>
              {e.config.duracao_segundos && (
                <Button
                  variant="outline"
                  onClick={() => {
                    if (workStart) setWorkStart(0);
                    else setWorkStart(Date.now() - Number(seconds || 0) * 1000);
                  }}
                >
                  {workStart ? "Pausar contagem" : "Iniciar contagem de tempo"}
                </Button>
              )}
            </>
            <p className="text-xs text-muted-foreground">
              RPE 10 = esforço máximo; RPE 8 = cerca de 2 repetições restantes.
            </p>
            {pr && (
              <p className="flex gap-2 text-sm text-primary">
                <Trophy size={16} />
                Carga acima do seu histórico registrado.
              </p>
            )}
            <Button
              className="w-full h-12"
              disabled={busy || (!warming && done >= e.series)}
              onClick={() => void add()}
            >
              <Check size={18} className="mr-2" />
              {busy ? "Salvando…" : "Registrar série"}
            </Button>
          </div>
        )}
        {logs.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">
                Séries registradas neste exercício
              </caption>
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="py-2">Série</th>
                  <th>Carga</th>
                  <th>Reps / tempo</th>
                  <th>RPE</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((r, i) => (
                  <tr key={r.id} className="border-t">
                    <td className="py-2">
                      {r.aquecimento ? "Aquecimento" : i + 1 - warm}
                    </td>
                    <td>{r.carga ?? "—"} kg</td>
                    <td>{r.reps ?? `${r.segundos}s`}</td>
                    <td>{r.rpe ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Label htmlFor="session-notes">Como foi o treino?</Label>
      <AutoResizeTextarea
        id="session-notes"
        disabled={busy}
        maxLength={2000}
        className="w-full rounded-xl border bg-card p-3"
        value={session.observacoes}
        onChange={(v) =>
          setSession({ ...session, observacoes: v.target.value })
        }
        placeholder="Observações para seu personal"
      />
      <Button variant="outline" disabled={busy} onClick={() => void persist(session)}>Salvar observação</Button>
      <p className="text-xs text-muted-foreground">A observação também é salva ao sair ou finalizar a sessão e fica disponível no acompanhamento do Personal.</p>
      <Button
        className="w-full h-12"
        disabled={busy || session.series.length === 0}
        onClick={() => {
          if (
            completion(session) < 100 &&
            !window.confirm(
              "Finalizar com séries pendentes? O resumo mostrará o que foi realizado.",
            )
          )
            return;
          void finish();
        }}
      >
        Finalizar sessão · {completion(session)}% realizado
        <ChevronRight size={18} className="ml-2" />
      </Button>
    </div>
  );
}
