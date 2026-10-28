"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  Dumbbell,
  CheckCircle2,
  WifiOff,
} from "lucide-react";
import { DashboardShell, type DashboardNavigationControls } from '@/components/layout/dashboard-shell';
import { StudentSidebar, studentTabs, type StudentTab } from '@/components/layout/student-sidebar';
import { PersonalWorkspace } from '@/components/layout/personal-workspace';
import { ShapeosBanner } from '@/components/layout/shapeos-banner';
import { StudentTrainingWireframe } from '@/components/fitness/student-training-wireframe';
import styles from './page.module.css';
import overviewStyles from '../personal-overview.module.css';
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { StudentInvitations } from '@/components/fitness/student-invitations';
import { NotificationBell } from "@/components/layout/notification-bell";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { SessionRunner } from "@/components/fitness/session-runner";
import { ExercisePreview } from '@/components/fitness/exercise-demonstration';
import { HelpDesk } from '@/components/support/help-desk';
import { AccountPanel } from '@/components/account/account-panel';
import { StudentTrainers, StudentLibrary, StudentMys } from '@/components/fitness/student-tools';
import { StudentProgress } from '@/components/fitness/student-progress';
import { StudentToday } from '@/components/fitness/student-today';
import { StudentWeek } from '@/components/fitness/student-week';
import { StudentAssessmentComparison } from '@/components/fitness/student-assessment-comparison';
import { StudentGuidance, StudentLinkStatus, StudentAssessmentSchedule } from '@/components/fitness/student-support';
import { estimatedWorkoutMinutes } from '@/lib/fitness/student-experience';
import { AgendaPanel } from "@/components/fitness/agenda-panel";
import { AssessmentPanel } from "@/components/fitness/assessment-panel";
import { ImportPanel } from "@/components/fitness/import-panel";
import {
  agendaForStudent,
  assessmentsForStudent,
  localSessions,
  queueSession,
  queueSessions,
  syncQueue,
  sessionsForStudent,
  today,
  previousSets,
  workoutsForStudent,
  type Session,
  type Workout,
} from "@/services/fitness";
export default function StudentPage() {
  const qc = useQueryClient(),
    [tab, setTab] = useState<StudentTab>("treino"),
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
      const errors = await syncQueue(id);
      setPending(localSessions(id));
      setSyncError(errors[0] ?? "");
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
    try {
      await save(s);
      setActive(s);
    } catch {
      setSyncError(
        "Não foi possível guardar a sessão neste navegador. Libere espaço e tente novamente.",
      );
    }
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
  const workouts = data.data?.workouts ?? [], agenda = data.data?.agenda ?? [], assessments = data.data?.assessments ?? [];
  const sessions = [...pending, ...(data.data?.sessions ?? []).filter(s => !pending.some(p => p.id === s.id))].sort((a,b) => b.inicio.localeCompare(a.inicio));
  const planned = agenda.filter(a => a.data === today()), unfinished = sessions.filter(s => s.status === 'EM_ANDAMENTO');
  const current = studentTabs.find(item => item.id === tab) ?? studentTabs[0], Icon = current.Icon;
  const loading = profile.isLoading || data.isLoading, failure = profile.error ?? data.error;
  const mysPage = tab === 'mys' && !active;
  const navigation = (controls: DashboardNavigationControls) => <StudentSidebar {...controls} tab={tab} onSelect={setTab} name={profile.data?.nome || 'Aluno'} onLogout={logout} locked={!!active} />;
  return (
    <DashboardShell variant="student" navigation={navigation}>
      {mysPage ? (
        profile.isLoading ? <p role="status">Preparando sua assistente…</p> :
        profile.error || !id ? <div className="personal-load-error" role="alert"><p>Não foi possível carregar sua conta.</p><Button variant="outline" onClick={() => void profile.refetch()}>Tentar novamente</Button></div> :
        <StudentMys studentId={id} name={profile.data?.nome ?? 'Aluno'} />
      ) : (
      <PersonalWorkspace page="aluno" className={overviewStyles.overview}>
      <header className="personal-content-heading">
        <div className="personal-page-heading"><span className="personal-heading-icon"><Icon size={21} strokeWidth={1.75} aria-hidden="true" /></span><div><h1>{active ? 'Treino em andamento' : current.label}</h1><p>{active ? 'Registre suas séries e acompanhe a sessão.' : current.description}</p></div></div>
        <div className="personal-header-right"><div className="personal-header-tools">{!active && <NotificationBell />}<ThemeToggle /></div></div>
      </header>
      {!active && <>
        <ShapeosBanner titleId="student-banner-title" eyebrow="Aluno" title={tab === 'treino' ? <>Olá, <span>{profile.data?.nome.split(' ')[0] || 'Aluno'}</span></> : tab === 'evolucao' ? <>Sua <span>evolução</span></> : tab === 'agenda' ? <>Sua <span>agenda</span></> : tab === 'avaliacao' ? <>Suas <span>avaliações</span></> : tab === 'orientacoes' ? <>Seus <span>comunicados</span></> : tab === 'dados' ? <>Seus <span>dados</span></> : <span>{current.label}</span>}
          description={tab === 'treino' ? 'Treine, acompanhe sua evolução e compartilhe resultados com seu personal.' : current.description}
          art={tab === 'treino' ? <StudentTrainingWireframe /> : <svg viewBox="0 0 360 140" fill="none" stroke="currentColor" strokeWidth=".8"><ellipse cx="190" cy="70" rx="138" ry="45" transform="rotate(-15 190 70)" /><ellipse cx="190" cy="70" rx="110" ry="55" transform="rotate(20 190 70)" /><circle cx="190" cy="70" r="32" /><path d="M143 65h-35v10h35m94-10h35v10h-35M99 49h9v42h-9zm173 0h9v42h-9zM178 69l9 9 19-22" strokeWidth="1.2" /></svg>} />
        {tab !== 'evolucao' && <section className="personal-summary" aria-label="Resumo dos seus treinos" aria-busy={loading}>
          {[{label:'Fichas ativas',value:workouts.length,target:'treino' as const,Icon:Dumbbell},{label:'Concluídos no histórico',value:sessions.filter(s => s.status === 'CONCLUIDO').length,target:'evolucao' as const,Icon:CheckCircle2},{label:'Na agenda de hoje',value:planned.length,target:'agenda' as const,Icon:CalendarDays}].map(({label,value,target,Icon:MetricIcon}) => <button key={label} type="button" className={`personal-metric ${styles.metric}`} onClick={() => setTab(target)} disabled={loading || !!failure} aria-label={`${label}: ${loading || failure ? 'indisponível' : value}`}><span className={overviewStyles.metricIcon}><MetricIcon size={23} strokeWidth={1.75} aria-hidden="true" /></span><div><strong>{loading || failure ? '—' : value}</strong><p>{label}</p></div></button>)}
        </section>}
      </>}
      {loading ? <div className={styles.loading} role="status">Carregando seu painel…</div> : failure || !id || !data.data ? <div className="personal-load-error" role="alert"><p>{failure?.message || 'Não foi possível carregar seu painel.'}</p><Button variant="outline" onClick={() => { void profile.refetch(); void data.refetch() }}>Tentar novamente</Button><Button variant="outline" onClick={() => void logout()}>Sair</Button></div> : <div className={styles.body}>
        {(offline || pending.length > 0 || syncError) && (
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
          <SessionRunner compact
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
            <StudentInvitations studentId={id} />
            {tab === "treino" && (
              <div className={`${styles.training} ${styles.compactTraining}`}>
                <StudentToday workouts={workouts} agenda={agenda} sessions={sessions} onStart={w => void start(w)} onAgenda={() => setTab('agenda')} />
                {unfinished.length > 0 && (
                  <section className={styles.resume}>
                    <h2 className="font-semibold">Continuar de onde parou</h2>
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
                  <h2 className={styles.sectionTitle}>
                    {planned.length
                      ? "Planejado para hoje"
                      : "Suas fichas ativas"}
                  </h2>
                  {!workouts.length && (<>
                    <div className={styles.empty}><Dumbbell size={26} strokeWidth={1.5} aria-hidden="true" /><p>
                      Seu personal ainda não disponibilizou uma ficha ativa.
                      Assim que ela for criada, aparecerá aqui.
                    </p></div><StudentLinkStatus studentId={id} />
                  </>)}
                  <div className={styles.workoutGrid}>
                    {[...workouts]
                      .sort(
                        (a, b) =>
                          Number(planned.some((p) => p.treino_id === b.id)) -
                          Number(planned.some((p) => p.treino_id === a.id)),
                      )
                      .map((w) => (
                        <section
                          key={w.id}
                          className={styles.workout}
                        >
                          <div className={styles.workoutHeading}>
                            <h3>
                              {w.titulo}
                            </h3>
                            <div className={styles.badges}><span className="personal-status" data-active="true"><CheckCircle2 size={12} aria-hidden="true" />Ativo</span>
                            {planned.some((p) => p.treino_id === w.id) && (
                              <span className={styles.today}>Hoje</span>
                            )}</div>
                          </div>
                          <p className={styles.workoutMeta}>
                            {w.itens.length} exercícios ·{" "}
                            {w.itens.reduce((n, e) => n + e.series, 0)} séries
                            {estimatedWorkoutMinutes(w) != null && ` · estimativa de ${estimatedWorkoutMinutes(w)} min`}
                          </p>
                          <ul className={styles.exercises}>
                            {w.itens.map((e) => (
                              <li
                                key={e.id}
                                className={styles.exercise}
                              >
                                <div>
                                  {e.nome}
                                  {e.config.superset && (
                                    <span className="text-xs text-primary ml-2">
                                      Superset {e.config.superset}
                                    </span>
                                  )}
                                  {e.config.observacoes && <p className="text-xs text-muted-foreground">{e.config.observacoes}</p>}
                                  <p className="text-xs text-muted-foreground">{(() => { const last = previousSets(sessions, e)[0]; return last ? `Último registro: ${last.carga == null ? 'carga não informada' : `${last.carga} kg`} · ${last.reps != null ? `${last.reps} reps` : `${last.segundos ?? '—'}s`}` : 'Sem registro anterior neste exercício.' })()}</p>
                                  <ExercisePreview compact name={e.nome} exerciseId={e.exercicio_id} videoUrl={e.video_url}/>
                                </div>
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
                            className={`w-full h-11 ${styles.start}`}
                            disabled={!w.itens.length}
                            onClick={() => void start(w)}
                          >
                            Iniciar treino guiado
                          </Button>
                        </section>
                      ))}
                  </div>
                </section>
                <p className={styles.note}>
                  As fichas e registros deste painel são vinculados à sua conta.
                  Sessões completas e parciais aparecem na evolução.
                </p>
              </div>
            )}
            {tab === "evolucao" && <StudentProgress sessions={sessions} />}
            {tab === 'orientacoes' && <StudentGuidance studentId={id} />}
            {tab === "agenda" && (
              <div className={styles.training}>
              <StudentWeek agenda={agenda} sessions={sessions} workouts={workouts} onStart={w => void start(w)} />
              <StudentAssessmentSchedule studentId={id} />
              <AgendaPanel compact
                alunoId={id}
                workouts={workouts}
                agenda={agenda}
                sessions={sessions}
                onChange={() => void data.refetch()}
                onStart={(w) => void start(w)}
              /></div>
            )}
            {tab === "avaliacao" && (
              <div className={styles.training}>
              <StudentAssessmentSchedule studentId={id} />
              <StudentAssessmentComparison assessments={assessments} />
              <AssessmentPanel compact
                alunoId={id}
                assessments={assessments}
                own
                onChange={() => void data.refetch()}
              /></div>
            )}
            {tab === 'personal' && <StudentTrainers studentId={id} onSupport={() => setTab('ajuda')} />}
            {tab === 'biblioteca' && <StudentLibrary workouts={workouts} />}
            {tab === 'conta' && <AccountPanel student embedded />}
            {tab === 'ajuda' && <HelpDesk banner={false} />}
            {tab === "dados" && (
              <ImportPanel
                alunoId={id}
                workouts={workouts}
                sessions={sessions}
                onImport={async (incoming) => {
                  queueSessions(id, incoming);
                  setPending(localSessions(id));
                  await sync();
                }}
              />
            )}
          </>
        )}
      </div>}
      </PersonalWorkspace>
      )}
    </DashboardShell>
  );
}
