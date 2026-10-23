"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ProgressPanel } from "./progress-panel";
import { PeriodComparison } from "./period-comparison";
import { AgendaPanel } from "./agenda-panel";
import { AssessmentPanel } from "./assessment-panel";
import { calendarDaysUntil } from '@/lib/fitness/deadlines';
import { AssessmentSchedule } from "./assessment-schedule";
import {
  agendaForStudent,
  assessmentsForStudent,
  sessionsForStudent,
  workoutsForStudent,
} from "@/services/fitness";
export function StudentReport({ alunoId, initialTab = "evolucao" }: { alunoId: string; initialTab?: "evolucao" | "agenda" | "avaliacao" }) {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<string>(initialTab);
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
  return (
    <div className="space-y-5">
      <nav
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
      </nav>
      {tab === "evolucao" && <><PeriodComparison alunoId={alunoId} /><ProgressPanel sessions={sessions} /></>}
      {tab === "agenda" && (
        <AgendaPanel
          alunoId={alunoId}
          workouts={workouts}
          agenda={agenda}
          sessions={sessions}
          onChange={() => { void data.refetch(); void queryClient.invalidateQueries({ queryKey: ['personal-weekly-agenda'] }); }}
        />
      )}
      {tab === "avaliacao" && (
        <>
        <AssessmentSchedule alunoId={alunoId} latestAssessment={assessments.find(assessment => { const days = calendarDaysUntil(assessment.data); return days != null && days <= 0; })?.data} />
        <AssessmentPanel
          alunoId={alunoId}
          assessments={assessments}
          onChange={() => { void data.refetch(); void queryClient.invalidateQueries({ queryKey: ['personal-attention'] }); void queryClient.invalidateQueries({ queryKey: ['personal-period-comparison', alunoId] }); void queryClient.invalidateQueries({ queryKey: ['personal-weekly-agenda'] }); }}
        />
        </>
      )}
    </div>
  );
}


