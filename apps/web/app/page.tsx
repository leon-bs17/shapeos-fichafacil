"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Dumbbell,
  Library,
  TrendingUp,
  Users,
} from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { useAlunos, useMetricasGerais } from "@/hooks/use-alunos";
import { createClient } from "@/lib/supabase/client";
import { completion, type Session } from "@/services/fitness";
export default function PersonalPage() {
  const students = useAlunos(),
    metrics = useMetricasGerais(students.data),
    recent = useQuery({
      queryKey: ["fitness-personal-recent"],
      queryFn: async () => {
        const { data, error } = await createClient()
          .from("sessoes_treino")
          .select("*")
          .order("inicio", { ascending: false })
          .limit(100);
        if (error) throw new Error(error.message);
        return data as Session[];
      },
    });
  return (
    <DashboardShell>
      <div className="max-w-6xl mx-auto space-y-6">
        <header>
          <p className="text-sm text-primary">ShapeOS · Personal</p>
          <h1 className="text-3xl font-semibold mt-2">Acompanhe cada aluno</h1>
          <p className="text-muted-foreground mt-2">
            Fichas, sessões realizadas e evolução reunidas no seu painel.
          </p>
        </header>
        {(students.error || recent.error) && (
          <p role="alert" className="text-destructive">
            Não foi possível carregar todos os dados. Atualize a página para
            tentar novamente.
          </p>
        )}
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { name: "Alunos vinculados", value: metrics.totalAlunos },
            { name: "Alunos ativos", value: metrics.alunosAtivos },
            { name: "Fichas ativas", value: metrics.fichasAtivas },
          ].map((v) => (
            <div key={v.name} className="rounded-2xl border bg-card p-5">
              <p className="text-sm text-muted-foreground">{v.name}</p>
              <p className="text-3xl font-semibold mt-3">
                {students.isLoading ? "…" : v.value}
              </p>
            </div>
          ))}
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { href: "/alunos", label: "Gerenciar alunos", Icon: Users },
            { href: "/treinos", label: "Fichas e prescrição", Icon: Dumbbell },
            {
              href: "/relatorios",
              label: "Evolução e agenda",
              Icon: TrendingUp,
            },
            {
              href: "/exercicios",
              label: "Biblioteca de exercícios",
              Icon: Library,
            },
          ].map((v) => (
            <Link
              key={v.href}
              href={v.href}
              className="rounded-2xl border bg-card p-5 hover:border-primary transition-colors"
            >
              <v.Icon className="text-primary mb-3" />
              <p className="font-medium">{v.label}</p>
            </Link>
          ))}
        </div>
        <section className="rounded-2xl border bg-card p-5">
          <h2 className="text-lg font-semibold mb-4">Sessões recentes</h2>
          {recent.isLoading ? (
            <p>Carregando sessões…</p>
          ) : !recent.data?.length ? (
            <p className="text-muted-foreground text-sm">
              As sessões dos seus alunos aparecerão aqui quando eles utilizarem
              o treino guiado.
            </p>
          ) : (
            recent.data.slice(0, 12).map((s) => (
              <Link
                href="/relatorios"
                key={s.id}
                className="flex flex-wrap justify-between gap-2 border-t py-3"
              >
                <div>
                  <p className="font-medium">
                    {students.data?.find((a) => a.aluno_id === s.aluno_id)
                      ?.nome ?? "Aluno"}{" "}
                    · {s.titulo}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(s.inicio).toLocaleDateString("pt-BR")} ·{" "}
                    {s.status === "CONCLUIDO" ? "Finalizado" : "Em andamento"}
                  </p>
                </div>
                <p className="text-sm text-primary">
                  {completion(s)}% realizado
                </p>
              </Link>
            ))
          )}
        </section>
      </div>
    </DashboardShell>
  );
}
