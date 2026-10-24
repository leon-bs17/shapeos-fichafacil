"use client";
import { useState } from "react";
import type { PeriodDays } from "@/lib/fitness/period-comparison";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ProgressPanel } from "./progress-panel";
import { PeriodComparison } from "./period-comparison";
import { AgendaPanel } from "./agenda-panel";
import { AssessmentPanel } from "./assessment-panel";
import styles from "./assessment-panel.module.css";
import { calendarDaysUntil } from '@/lib/fitness/deadlines';
import { AssessmentSchedule } from "./assessment-schedule";
import {
  agendaForStudent,
  assessmentsForStudent,
  sessionsForStudent,
  workoutsForStudent,
} from "@/services/fitness";
export function StudentReport({ alunoId, initialTab = "evolucao", hideNavigation = false, periodDays, hideProgressMetrics = false }: { alunoId: string; initialTab?: "evolucao" | "agenda" | "avaliacao"; hideNavigation?: boolean; periodDays?: PeriodDays; hideProgressMetrics?: boolean }) {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<string>(initialTab);
  const [assessmentAction, setAssessmentAction] = useState<"now" | "schedule" | null>(null);
  const data = useQuery({
    queryKey: ["fitness-student-report", alunoId],
    queryFn: async () => {
      const [sessions, workouts, agenda, assessments] = await Promise.all([
        sessionsForStudent(alunoId),
        workoutsForStudent(alunoId),
        agendaForStudent(alunoId),
        assessmentsForStudent(alunoId),
      ]);
      return { sessions, workouts, agenda, assessments };
    },
  });
  if (data.isLoading)
    return <p role="status">Carregando sessões e avaliações…</p>;
  if (data.error)
    return (
      <div>
        <p role="alert" className="text-destructive text-sm">
          {data.error.message}
        </p>
        <Button variant="outline" onClick={() => void data.refetch()}>
          Tentar novamente
        </Button>
      </div>
    );
  if (!data.data) return null;
  const { sessions, workouts, agenda, assessments } = data.data;
  const assessmentSchedule = <AssessmentSchedule compact={hideNavigation} alunoId={alunoId} editorVisible={!hideNavigation || assessmentAction === "schedule"} latestAssessment={assessments.find(assessment => { const days = calendarDaysUntil(assessment.data); return days != null && days <= 0; })?.data} />;
  return (
    <div className={`space-y-5 ${hideNavigation && tab === "avaliacao" ? styles.assessments : ""}`}>
      {!hideNavigation && <nav
        className="flex flex-wrap gap-2"
        aria-label="Acompanhamento do aluno"
      >
        {[
          { id: "evolucao", label: "Sessões e evolução" },
          { id: "agenda", label: "Agenda e adesão" },
          { id: "avaliacao", label: "Avaliações físicas" },
        ].map((t) => (
          <Button
            key={t.id}
            aria-current={tab === t.id ? "page" : undefined}
            variant={tab === t.id ? "default" : "outline"}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </Button>
        ))}
      </nav>}
      {tab === "evolucao" && <><PeriodComparison alunoId={alunoId} compact={hideNavigation} periodDays={periodDays} /><ProgressPanel sessions={sessions} compact={hideNavigation} periodDays={periodDays} hideMetrics={hideProgressMetrics} /></>}
      {tab === "agenda" && (
        <AgendaPanel
          compact={hideNavigation}
          alunoId={alunoId}
          workouts={workouts}
          agenda={agenda}
          sessions={sessions}
          onChange={() => { void data.refetch(); void queryClient.invalidateQueries({ queryKey: ['personal-weekly-agenda'] }); }}
        />
      )}
      {tab === "avaliacao" && (
        <>
        {!hideNavigation && assessmentSchedule}
        <AssessmentPanel
          assessmentMode={hideNavigation ? assessmentAction : undefined}
          schedule={hideNavigation ? assessmentSchedule : undefined}
          actionPicker={hideNavigation ? <section className={styles.actionPicker} aria-label="Escolher ação de avaliação">
            <h2>O que deseja fazer?</h2>
            <div className={styles.actionChoices}>
              <Button variant="outline" aria-pressed={assessmentAction === "now"} onClick={() => setAssessmentAction("now")}>Avaliar agora</Button>
              <Button variant="outline" aria-pressed={assessmentAction === "schedule"} onClick={() => setAssessmentAction("schedule")}>Agendar próxima avaliação</Button>
            </div>
          </section> : undefined}
          compact={hideNavigation}
          alunoId={alunoId}
          assessments={assessments}
          onChange={() => { void data.refetch(); void queryClient.invalidateQueries({ queryKey: ['personal-attention'] }); void queryClient.invalidateQueries({ queryKey: ['personal-period-comparison', alunoId] }); void queryClient.invalidateQueries({ queryKey: ['personal-report-overview', alunoId] }); void queryClient.invalidateQueries({ queryKey: ['personal-weekly-agenda'] }); }}
        />
        </>
      )}
    </div>
  );
}


