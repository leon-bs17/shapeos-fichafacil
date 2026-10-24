"use client";
import { useMemo } from "react";
import reportStyles from "./personal-report.module.css";
import { comparisonWindows, type PeriodDays } from "@/lib/fitness/period-comparison";
import { CalendarDays, ChevronDown, Dumbbell, FileText, Trophy, TrendingUp } from "lucide-react";
import {
  completion,
  dayOf,
  plannedSets,
  sessionVolume,
  workingSets,
  type Session,
} from "@/services/fitness";
export function ProgressPanel({ sessions, compact = false, periodDays, hideMetrics = false, metricsOnly = false }: { sessions: Session[]; compact?: boolean; periodDays?: PeriodDays; hideMetrics?: boolean; metricsOnly?: boolean }) {
  const periodWindow = periodDays == null ? null : comparisonWindows(periodDays)
  const scopedSessions = periodWindow ? sessions.filter(session => {
    const date = Date.parse(session.inicio)
    return Number.isFinite(date) && date >= Date.parse(periodWindow.start) && date <= Date.parse(periodWindow.end)
  }) : sessions
  const done = useMemo(
      () => scopedSessions.filter((s) => s.status === "CONCLUIDO"),
      [scopedSessions],
    ),
    cutoff = periodWindow ? Date.parse(periodWindow.start) : Date.now() - 30 * 86400000,
    recent = done.filter((s) => new Date(s.inicio).getTime() >= cutoff);
  const days = new Set(recent.map((s) => dayOf(s.inicio))),
    volume = recent.reduce((n, s) => n + sessionVolume(s), 0);
  const groups = useMemo(() => {
    const map = new Map<
      string,
      {
        nome: string;
        rows: {
          data: string;
          carga: number;
          reps: number | null;
          volume: number;
        }[];
      }
    >();
    for (const s of done)
      for (const e of s.prescricao) {
        const sets = workingSets(s).filter((r) => r.item_id === e.id);
        if (!sets.length) continue;
        const g = map.get(e.exercicio_id) ?? { nome: e.nome, rows: [] };
        g.rows.push({
          data: s.inicio,
          carga: Math.max(...sets.map((r) => r.carga ?? 0)),
          reps:
            sets.find(
              (r) => r.carga === Math.max(...sets.map((v) => v.carga ?? 0)),
            )?.reps ?? null,
          volume: sets.reduce((n, r) => n + (r.carga ?? 0) * (r.reps ?? 0), 0),
        });
        map.set(e.exercicio_id, g);
      }
    return [...map.entries()].map(([id, g]) => ({
      id,
      ...g,
      rows: g.rows.sort((a, b) => a.data.localeCompare(b.data)),
    }));
  }, [done]);
  const metrics = [
    { label: `Sessões · ${periodDays ?? 30} dias`, value: recent.length, Icon: Dumbbell },
    {
      label: `Dias com treino · ${periodDays ?? 30} dias`,
      value: days.size,
      Icon: CalendarDays,
    },
    {
      label: `Volume · ${periodDays ?? 30} dias`,
      value: `${volume.toLocaleString("pt-BR")} kg`,
      Icon: TrendingUp,
    },
    { label: "Exercícios acompanhados", value: groups.length, Icon: Trophy },
  ];
  const metricsContent = (compact ? <dl className={reportStyles.progressMetrics} aria-label="Indicadores de evolução do aluno">
        {metrics.map(m => <div key={m.label}>
          <span className={reportStyles.progressMetricIcon} aria-hidden="true"><m.Icon size={24} strokeWidth={1.75} /></span>
          <div><dt>{m.label}</dt><dd>{m.value}</dd></div>
        </div>)}
      </dl> : <div className="personal-report-metrics grid grid-cols-2 lg:grid-cols-4 gap-3">
        {metrics.map((m) => (
          <div key={m.label} className="personal-report-metric rounded-2xl border bg-card p-4">
            <m.Icon size={18} className="text-primary mb-3" />
            <p className="text-2xl font-semibold">{m.value}</p>
            <p className="text-xs text-muted-foreground mt-2">{m.label}</p>
          </div>
        ))}
      </div>)
  if (metricsOnly) return metricsContent
  return (
    <div data-compact-progress={compact || undefined} className="space-y-6">
      {!hideMetrics && metricsContent}
      <section data-consistency data-filtered-period={periodDays} className="rounded-2xl border bg-card p-5">
        <h2 className="font-semibold mb-4">{periodDays ? `Consistência · ${periodDays} dias` : "Consistência · últimas 4 semanas"}</h2>
        <div className="grid grid-cols-7 gap-2" tabIndex={periodDays ? 0 : undefined} role={periodDays ? "region" : undefined} aria-label={periodDays ? `Dias com treino no período de ${periodDays} dias` : undefined}>
          {Array.from({ length: periodDays ?? 28 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (periodDays ?? 28) + 1 + i);
            const key = dayOf(d.toISOString()),
              count = done.filter((s) => dayOf(s.inicio) === key).length;
            return (
              <div
                key={key}
                className={`rounded-lg p-2 text-center text-xs ${count ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                title={`${d.toLocaleDateString("pt-BR")}: ${count} sessões`}
              >
                <span className="block">{d.getDate()}</span>
                <span className="sr-only">
                  {count} sessões em {d.toLocaleDateString("pt-BR")}
                </span>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Dias destacados têm sessões finalizadas. Séries de aquecimento não
          entram no volume.
        </p>
      </section>
      {!done.length && (
        <p className="rounded-2xl border border-dashed p-6 text-muted-foreground">
          {periodDays ? "Nenhuma sessão concluída no período selecionado." : "Finalize uma sessão para acompanhar sua evolução. Os registros anteriores continuam nos relatórios existentes."}
        </p>
      )}
      <div data-exercise-grid className="grid md:grid-cols-2 gap-4">
        {groups.map((g) => {
          const best = Math.max(...g.rows.map((r) => r.carga)),
            first = g.rows[0].carga,
            last = g.rows.at(-1)!.carga,
            diff = Math.round((last - first) * 100) / 100;
          return (
            <section data-exercise-card key={g.id} className="rounded-2xl border bg-card p-5">
              <h3 className="font-semibold">{g.nome}</h3>
              <div className="flex justify-between mt-2 text-sm">
                <span className="text-primary">
                  Maior carga registrada: {best} kg
                </span>
                <span className="text-muted-foreground">
                  {diff > 0 ? "+" : ""}
                  {diff} kg
                </span>
              </div>
              <div
                data-load-chart
                aria-hidden="true"
                className="flex h-24 gap-1 items-end mt-4"
              >
                {g.rows.slice(-20).map((r, i) => (
                  <div
                    key={i}
                    className="flex-1 bg-primary/50 rounded-t min-w-1"
                    style={{
                      height: `${best ? Math.max(4, (r.carga / best) * 100) : 4}%`,
                    }}
                    title={`${new Date(r.data).toLocaleDateString("pt-BR")}: ${r.carga} kg`}
                  />
                ))}
              </div>
              <details className="mt-3 text-sm">
                <summary className="cursor-pointer text-muted-foreground">
                  <span>Ver valores do gráfico</span>{compact && <ChevronDown size={14} aria-hidden="true" />}
                </summary>
                <ul className="mt-2 space-y-1">
                  {g.rows.slice(-20).map((r, i) => (
                    <li key={i}>
                      {new Date(r.data).toLocaleDateString("pt-BR")} · {r.carga}{" "}
                      kg · {r.reps ?? "—"} reps · volume {r.volume} kg
                    </li>
                  ))}
                </ul>
              </details>
            </section>
          );
        })}
      </div>
      <section data-prescription-list className="space-y-3">
        <h2 className="text-lg font-semibold">Prescrito × realizado</h2>
        {scopedSessions.slice(0, 50).map((s) => (
          <details key={s.id} className="rounded-2xl border bg-card p-4">
            <summary className="cursor-pointer flex flex-wrap justify-between gap-2">
              {compact && <FileText size={14} aria-hidden="true" />}
              <span className="font-medium">
                {s.titulo} · {new Date(s.inicio).toLocaleDateString("pt-BR")}
              </span>
              <span className="text-sm text-primary">
                {s.status === "CONCLUIDO" ? "Finalizado" : "Em andamento"} ·{" "}
                {completion(s)}%
              </span>
              {compact && <ChevronDown size={14} aria-hidden="true" />}
            </summary>
            <p className="mt-3 text-sm text-muted-foreground">
              {workingSets(s).length}/{plannedSets(s)} séries de trabalho ·{" "}
              {sessionVolume(s).toLocaleString("pt-BR")} kg de volume
              {s.fim &&
                ` · ${Math.round((new Date(s.fim).getTime() - new Date(s.inicio).getTime()) / 60000)} min de sessão`}
            </p>
            <div className="mt-3 space-y-3">
              {s.prescricao.map((e) => {
                const sets = s.series.filter((r) => r.item_id === e.id);
                return (
                  <div
                    key={e.id}
                    className="rounded-xl bg-muted/50 p-3 text-sm"
                  >
                    <p className="font-medium">{e.nome}</p>
                    <p className="text-muted-foreground">
                      Previsto: {e.series} ×{" "}
                      {e.config?.duracao_segundos
                        ? `${e.config.duracao_segundos}s`
                        : e.repeticoes}
                      {e.config?.carga_alvo != null &&
                        ` · ${e.config.carga_alvo} kg`}
                    </p>
                    <p className="mt-1">
                      Realizado:{" "}
                      {sets.length
                        ? sets
                            .map(
                              (r) =>
                                `${r.aquecimento ? "Aquec. " : ""}${r.carga ?? "—"} kg × ${r.reps ?? `${r.segundos}s`}${r.rpe ? ` (RPE ${r.rpe})` : ""}`,
                            )
                            .join(" / ")
                        : "Sem séries registradas"}
                    </p>
                  </div>
                );
              })}
            </div>
            {s.observacoes && (
              <p className="mt-3 text-sm whitespace-pre-wrap">
                Observações: {s.observacoes}
              </p>
            )}
          </details>
        ))}
      </section>
    </div>
  );
}

