"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  Dumbbell,
  FileDown,
  LogOut,
  Ruler,
  TrendingUp,
  WifiOff,
} from "lucide-react";
import Logo from "@/davi/components/Logo";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { SessionRunner } from "@/components/fitness/session-runner";
import { ProgressPanel } from "@/components/fitness/progress-panel";
import { AgendaPanel } from "@/components/fitness/agenda-panel";
import { AssessmentPanel } from "@/components/fitness/assessment-panel";
import { ImportPanel } from "@/components/fitness/import-panel";
import {
  agendaForStudent,
  assessmentsForStudent,
  clearQueued,
  dayOf,
  localSessions,
  queueSession,
  saveSession,
  sessionsForStudent,
  today,
  workoutsForStudent,
  type Session,
  type Workout,
} from "@/services/fitness";
const tabs = [
  { id: "treino", label: "Treinar", Icon: Dumbbell },
  { id: "evolucao", label: "Evolução", Icon: TrendingUp },
  { id: "agenda", label: "Agenda", Icon: CalendarDays },
  { id: "avaliacao", label: "Avaliações", Icon: Ruler },
  { id: "dados", label: "Meus dados", Icon: FileDown },
];
export default function StudentPage() {
  const qc = useQueryClient(),
    [tab, setTab] = useState("treino"),
    [active, setActive] = useState<Session | null>(null),
    [pending, setPending] = useState<Session[]>([]),
    [syncError, setSyncError] = useState(""),
    [offline, setOffline] = useState(false),
    syncing = useRef(false);
  const profile = useQuery({
    queryKey: ["fitness-profile"],
    queryFn: async () => {
      const db = createClient();
      const {
        data: { user },
        error,
      } = await db.auth.getUser();
      if (!user || error) {
        const {
          data: { session },
        } = await db.auth.getSession();
        if (!navigator.onLine && session) {
          const saved = localStorage.getItem(
            `shapeos-profile:${session.user.id}`,
          );
          if (saved) return JSON.parse(saved) as { id: string; nome: string };
        }
        throw new Error(
          "Não foi possível confirmar sua sessão. Entre novamente.",
        );
      }
      const { data, error: e } = await db
        .from("usuarios")
        .select("id,nome")
        .eq("id", user.id)
        .single();
      if (e || !data) throw new Error("Perfil não encontrado.");
      localStorage.setItem(`shapeos-profile:${user.id}`, JSON.stringify(data));
      return data as { id: string; nome: string };
    },
  });
  const id = profile.data?.id;
  const data = useQuery({
    queryKey: ["fitness-student", id],
    enabled: !!id,
    queryFn: async () => {
      try {
        const [workouts, sessions, agenda, assessments] = await Promise.all([
          workoutsForStudent(id!),
          sessionsForStudent(id!),
          agendaForStudent(id!),
          assessmentsForStudent(id!),
        ]);
        const v = { workouts, sessions, agenda, assessments };
        try {
          localStorage.setItem(
            `shapeos-fitness-cache:${id}`,
            JSON.stringify(v),
          );
        } catch {}
        return v;
      } catch (e) {
        if (!navigator.onLine) {
          const raw = localStorage.getItem(`shapeos-fitness-cache:${id}`);
          if (raw)
            return JSON.parse(raw) as {
              workouts: Workout[];
              sessions: Session[];
              agenda: Awaited<ReturnType<typeof agendaForStudent>>;
              assessments: Awaited<ReturnType<typeof assessmentsForStudent>>;
            };
        }
        throw e;
      }
    },
  });
  const sync = useCallback(async () => {
    if (!id || syncing.current) return;
    syncing.current = true;
    try {
      while (localSessions(id).length) {
        const s = localSessions(id)[0];
        await saveSession(s);
        clearQueued(id, s);
      }
      setPending(localSessions(id));
      setSyncError("");
      void qc.invalidateQueries({ queryKey: ["fitness-student", id] });
    } catch (e) {
      setPending(localSessions(id));
      setSyncError(e instanceof Error ? e.message : "Sincronização pendente.");
    } finally {
      syncing.current = false;
    }
  }, [id, qc]);
  useEffect(() => {
    if (!id) return;
    setPending(localSessions(id));
    setOffline(!navigator.onLine);
    void sync();
    const online = () => {
      setOffline(false);
      void sync();
    };
    const lost = () => setOffline(true);
    window.addEventListener("online", online);
    window.addEventListener("offline", lost);
    return () => {
      window.removeEventListener("online", online);
      window.removeEventListener("offline", lost);
    };
  }, [id, sync]);
  async function save(s: Session) {
    queueSession(s);
    setPending(localSessions(s.aluno_id));
    void sync();
  }
  async function start(w: Workout) {
    if (!id || !w.itens.length) return;
    const existing = [...pending, ...(data.data?.sessions ?? [])].find(
      (s) => s.treino_id === w.id && s.status === "EM_ANDAMENTO",
    );
    if (existing) {
      setActive(existing);
      return;
    }
    const s: Session = {
      id: crypto.randomUUID(),
      aluno_id: id,
      treino_id: w.id,
      titulo: w.titulo,
      inicio: new Date().toISOString(),
      fim: null,
      status: "EM_ANDAMENTO",
      prescricao: w.itens,
      series: [],
      observacoes: "",
    };
    await save(s);
    setActive(s);
  }
  async function logout() {
    if (
      pending.length &&
      !window.confirm(
        "Há registros aguardando sincronização neste navegador. Sair agora?",
      )
    )
      return;
    await createClient().auth.signOut();
    if (id) {
      localStorage.removeItem(`shapeos-fitness-cache:${id}`);
      localStorage.removeItem(`shapeos-profile:${id}`);
    }
    window.location.assign("/login");
  }
  if (profile.isLoading || data.isLoading)
    return (
      <main className="max-w-6xl mx-auto p-6">
        <p role="status">Carregando seu painel…</p>
      </main>
    );
  if (profile.error || data.error)
    return (
      <main className="max-w-xl mx-auto p-6 space-y-4">
        <p role="alert">{(profile.error ?? data.error)?.message}</p>
        <Button
          onClick={() => {
            void profile.refetch();
            void data.refetch();
          }}
        >
          Tentar novamente
        </Button>
        <Button variant="outline" onClick={() => void logout()}>
          Sair
        </Button>
      </main>
    );
  if (!id || !data.data) return null;
  const { workouts, agenda, assessments } = data.data,
    sessions = [
      ...pending,
      ...data.data.sessions.filter((s) => !pending.some((p) => p.id === s.id)),
    ].sort((a, b) => b.inicio.localeCompare(a.inicio)),
    planned = agenda.filter((a) => a.data === today()),
    unfinished = sessions.filter((s) => s.status === "EM_ANDAMENTO");
  return (
    <div className="min-h-screen pb-28">
      <header className="border-b bg-card">
        <div className="max-w-6xl mx-auto px-5 py-4 flex justify-between items-center">
          <Logo size="sm" />
          <Button variant="ghost" onClick={() => void logout()}>
            <LogOut size={16} className="mr-2" />
            Sair
          </Button>
        </div>
      </header>
      <main className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
        {(offline || pending.length > 0) && (
          <div
            role="status"
            className="rounded-xl border border-warning/40 bg-warning/10 p-4 flex flex-wrap items-center gap-3 text-sm"
          >
            <WifiOff size={18} />
            <span>
              {offline
                ? "Sem conexão: usando dados salvos neste navegador."
                : `${pending.length} sessão(ões) aguardando sincronização.`}
              {syncError && ` ${syncError}`}
            </span>
            <Button size="sm" variant="outline" onClick={() => void sync()}>
              Sincronizar
            </Button>
          </div>
        )}
        {active ? (
          <SessionRunner
            key={active.id}
            initial={active}
            history={sessions}
            onSave={save}
            onClose={() => {
              setActive(null);
              void sync();
            }}
          />
        ) : (
          <>
            <header>
              <p className="text-primary text-sm">Seu espaço de treino</p>
              <h1 className="mt-2 text-3xl font-semibold">
                Olá, {profile.data?.nome.split(" ")[0]}
              </h1>
              <p className="mt-2 text-muted-foreground">
                Treine, acompanhe sua evolução e compartilhe resultados com seu
                personal.
              </p>
            </header>
            <nav
              className="flex gap-2 overflow-x-auto pb-1"
              aria-label="Painel do aluno"
            >
              {tabs.map((t) => (
                <Button
                  key={t.id}
                  className="shrink-0"
                  variant={tab === t.id ? "default" : "outline"}
                  aria-current={tab === t.id ? "page" : undefined}
                  onClick={() => setTab(t.id)}
                >
                  <t.Icon size={16} className="mr-2" />
                  {t.label}
                </Button>
              ))}
            </nav>
            {tab === "treino" && (
              <div className="space-y-5">
                {unfinished.length > 0 && (
                  <section className="rounded-2xl border border-primary/40 bg-primary/5 p-5">
                    <h2 className="font-semibold">Retomar treino</h2>
                    {unfinished.map((s) => (
                      <div
                        key={s.id}
                        className="mt-3 flex justify-between gap-3 items-center"
                      >
                        <div>
                          <p>{s.titulo}</p>
                          <p className="text-xs text-muted-foreground">
                            {s.series.length} séries salvas ·{" "}
                            {new Date(s.inicio).toLocaleDateString("pt-BR")}
                          </p>
                        </div>
                        <Button onClick={() => setActive(s)}>Retomar</Button>
                      </div>
                    ))}
                  </section>
                )}
                <section>
                  <h2 className="text-lg font-semibold mb-3">
                    {planned.length
                      ? "Planejado para hoje"
                      : "Suas fichas ativas"}
                  </h2>
                  {!workouts.length && (
                    <div className="rounded-2xl border border-dashed p-8 text-muted-foreground">
                      Seu personal ainda não disponibilizou uma ficha ativa.
                      Assim que ela for criada, aparecerá aqui.
                    </div>
                  )}
                  <div className="grid md:grid-cols-2 gap-4">
                    {[...workouts]
                      .sort(
                        (a, b) =>
                          Number(planned.some((p) => p.treino_id === b.id)) -
                          Number(planned.some((p) => p.treino_id === a.id)),
                      )
                      .map((w) => (
                        <section
                          key={w.id}
                          className="rounded-2xl border bg-card p-5 space-y-4"
                        >
                          <div className="flex justify-between gap-3">
                            <h3 className="text-xl font-semibold">
                              {w.titulo}
                            </h3>
                            {planned.some((p) => p.treino_id === w.id) && (
                              <span className="text-primary text-xs">Hoje</span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {w.itens.length} exercícios ·{" "}
                            {w.itens.reduce((n, e) => n + e.series, 0)} séries
                          </p>
                          <ul className="space-y-2 text-sm">
                            {w.itens.map((e) => (
                              <li
                                key={e.id}
                                className="flex justify-between gap-3 border-t pt-2"
                              >
                                <span>
                                  {e.nome}
                                  {e.config.superset && (
                                    <span className="text-xs text-primary ml-2">
                                      Superset {e.config.superset}
                                    </span>
                                  )}
                                </span>
                                <span className="text-muted-foreground shrink-0">
                                  {e.series} ×{" "}
                                  {e.config.duracao_segundos
                                    ? `${e.config.duracao_segundos}s`
                                    : e.repeticoes}
                                </span>
                              </li>
                            ))}
                          </ul>
                          <Button
                            className="w-full h-11"
                            disabled={!w.itens.length}
                            onClick={() => void start(w)}
                          >
                            Iniciar treino guiado
                          </Button>
                        </section>
                      ))}
                  </div>
                </section>
                <p className="text-xs text-muted-foreground">
                  As fichas e registros deste painel são vinculados à sua conta.
                  Sessões completas e parciais aparecem na evolução.
                </p>
              </div>
            )}
            {tab === "evolucao" && <ProgressPanel sessions={sessions} />}
            {tab === "agenda" && (
              <AgendaPanel
                alunoId={id}
                workouts={workouts}
                agenda={agenda}
                sessions={sessions}
                onChange={() => void data.refetch()}
                onStart={(w) => void start(w)}
              />
            )}
            {tab === "avaliacao" && (
              <AssessmentPanel
                alunoId={id}
                assessments={assessments}
                own
                onChange={() => void data.refetch()}
              />
            )}
            {tab === "dados" && (
              <ImportPanel
                alunoId={id}
                workouts={workouts}
                sessions={sessions}
                onImport={async (incoming) => {
                  for (const s of incoming) queueSession(s);
                  setPending(localSessions(id));
                  await sync();
                }}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}
