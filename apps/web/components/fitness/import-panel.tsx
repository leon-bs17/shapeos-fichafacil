"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  download,
  defaultPrescription,
  type Session,
  type Workout,
} from "@/services/fitness";
import { importRows, type ImportRow } from "@/lib/fitness-import";
export function ImportPanel({
  alunoId,
  workouts,
  sessions,
  onImport,
}: {
  alunoId: string;
  workouts: Workout[];
  sessions: Session[];
  onImport: (s: Session[]) => Promise<void>;
}) {
  const [rows, setRows] = useState<ImportRow[]>([]),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  const items = workouts.flatMap((w) =>
    w.itens.map((e) => ({ ...e, workout: w })),
  );
  async function read(file: File) {
    setError("");
    setMessage("");
    try {
      if (file.size > 2 * 1024 * 1024)
        throw new Error("Limite de 2 MB por arquivo.");
      const parsed = importRows(await file.text());
      if (!parsed.length || parsed.length > 500)
        throw new Error("Importe entre 1 e 500 séries por vez.");
      setRows(
        parsed.map((r) => ({
          ...r,
          itemId:
            items.find(
              (e) => e.nome.toLocaleLowerCase() === r.name.toLocaleLowerCase(),
            )?.id ?? "",
        })),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Arquivo inválido.");
    }
  }
  function edit(i: number, k: keyof ImportRow, v: string) {
    setRows((all) => all.map((r, n) => (n === i ? { ...r, [k]: v } : r)));
  }
  async function apply() {
    setBusy(true);
    setError("");
    try {
      const map = new Map<string, Session>();
      for (const r of rows) {
        const item = items.find((v) => v.id === r.itemId);
        const load = r.load === "" ? null : Number(r.load.replace(",", ".")),
          reps = r.reps === "" ? null : Number(r.reps),
          seconds = r.seconds === "" ? null : Number(r.seconds);
        if (
          !item ||
          !/^\d{4}-\d{2}-\d{2}$/.test(r.date) ||
          Number.isNaN(Date.parse(`${r.date}T12:00:00`)) ||
          new Date(`${r.date}T00:00:00`).getTime() > Date.now() ||
          (load != null &&
            (!Number.isFinite(load) || load < 0 || load > 9999)) ||
          (reps != null &&
            (!Number.isInteger(reps) || reps < 1 || reps > 10000)) ||
          (seconds != null &&
            (!Number.isInteger(seconds) || seconds < 1 || seconds > 7200)) ||
          (reps == null && seconds == null)
        )
          throw new Error(
            "Revise todas as linhas: exercício vinculado, data válida e valores positivos.",
          );
        const key = `${item.workout.id}:${r.date}`,
          s = map.get(key) ?? {
            id: crypto.randomUUID(),
            aluno_id: alunoId,
            treino_id: item.workout.id,
            titulo: item.workout.titulo,
            inicio: new Date(`${r.date}T00:00:00`).toISOString(),
            fim: new Date(`${r.date}T00:00:00`).toISOString(),
            status: "CONCLUIDO" as const,
            prescricao: item.workout.itens.map((e) => ({
              ...e,
              config: { ...defaultPrescription, ...e.config },
            })),
            series: [],
            observacoes: "Histórico importado e revisado pelo aluno.",
          };
        s.series.push({
          id: crypto.randomUUID(),
          item_id: item.id,
          carga: load,
          reps,
          segundos: seconds,
          rpe: null,
          aquecimento: false,
          registrado_em: s.inicio,
        });
        map.set(key, s);
      }
      await onImport([...map.values()]);
      setRows([]);
      setMessage("Histórico importado. Confira o painel de evolução.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível importar.");
    } finally {
      setBusy(false);
    }
  }
  function model() {
    const url = URL.createObjectURL(
      new Blob(
        [
          "exercicio,data,carga,repeticoes,segundos\nSupino reto,2026-09-20,20,10,\n",
        ],
        { type: "text/csv" },
      ),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "shapeos-modelo-importacao.csv";
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <div className="space-y-5">
      <section className="rounded-2xl border bg-card p-5 space-y-4">
        <h2 className="text-lg font-semibold">Seu histórico, seus dados</h2>
        <p className="text-sm text-muted-foreground">
          Exporte suas sessões ShapeOS em JSON ou importe séries de CSV/JSON.
          Cabeçalhos comuns de Strong e Hevy são reconhecidos; datas ambíguas
          precisam ser corrigidas na revisão. As cargas devem estar em kg.
          Vincule cada exercício a uma ficha ativa antes de importar.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() =>
              download("shapeos-treinos.json", {
                format: "shapeos-fitness-v1",
                sessions,
              })
            }
          >
            Exportar sessões
          </Button>
          <Button variant="outline" onClick={model}>
            Baixar modelo CSV
          </Button>
        </div>
        <label className="block text-sm" htmlFor="fitness-import">
          Arquivo CSV ou JSON (até 500 séries)
        </label>
        <input
          id="fitness-import"
          type="file"
          accept=".csv,.json"
          disabled={busy}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void read(f);
            e.target.value = "";
          }}
        />
        <p className="text-xs text-muted-foreground">
          Importe apenas registros ainda ausentes. Uma nova importação do mesmo
          arquivo cria novas sessões.
        </p>
      </section>
      {rows.length > 0 && (
        <section className="rounded-2xl border bg-card p-4">
          <h3 className="font-semibold mb-3">
            Revisar {rows.length} séries antes de salvar
          </h3>
          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-sm text-left">
              <thead>
                <tr>
                  <th>Exercício original / destino</th>
                  <th>Data</th>
                  <th>Kg</th>
                  <th>Reps</th>
                  <th>Segundos</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-t">
                    <td className="py-2 min-w-52">
                      <p className="text-xs text-muted-foreground mb-1">
                        {r.name}
                      </p>
                      <select
                        aria-label={`Exercício da linha ${i + 1}`}
                        className="w-full h-10 rounded border bg-background"
                        value={r.itemId}
                        onChange={(e) => edit(i, "itemId", e.target.value)}
                      >
                        <option value="">Vincular exercício…</option>
                        {items.map((e) => (
                          <option key={e.id} value={e.id}>
                            {e.nome} · {e.workout.titulo}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="min-w-36">
                      <Input
                        aria-label={`Data da linha ${i + 1}`}
                        type="date"
                        value={r.date}
                        onChange={(e) => edit(i, "date", e.target.value)}
                      />
                    </td>
                    {(["load", "reps", "seconds"] as const).map((k) => (
                      <td key={k} className="min-w-20">
                        <Input
                          aria-label={`${k} da linha ${i + 1}`}
                          type="number"
                          min={0}
                          value={r[k]}
                          onChange={(e) => edit(i, k, e.target.value)}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button className="mt-4" disabled={busy} onClick={() => void apply()}>
            {busy ? "Importando…" : "Confirmar importação revisada"}
          </Button>
        </section>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="text-sm text-primary">
          {message}
        </p>
      )}
    </div>
  );
}
