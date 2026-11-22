"use client";
import { useState } from "react";
import { Download, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  download,
  defaultPrescription,
  type Session,
  type Workout,
} from "@/services/fitness";
import { importRows, type ImportRow } from "@/lib/fitness-import";
import styles from "./student-experience.module.css";
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
    <div className={styles.stack}>
      <section className="personal-panel" aria-labelledby="student-data-export">
        <header className="personal-panel-heading">
          <div><h2 id="student-data-export">Exportar registros</h2><p>Baixe suas sessões do ShapeOS em JSON.</p></div>
        </header>
        <div className={styles.state}>
          <Button variant="outline" onClick={() => download("shapeos-treinos.json", { format: "shapeos-fitness-v1", sessions })}>
            <Download size={16} aria-hidden="true" />Exportar sessões
          </Button>
        </div>
      </section>
      <section className="personal-panel" aria-labelledby="student-data-import">
        <header className={`personal-panel-heading ${styles.sectionHeading}`}>
          <div><h2 id="student-data-import">Importar registros</h2><p>Use um arquivo CSV ou JSON, com até 500 séries.</p></div>
          <Button variant="outline" onClick={model}><FileDown size={16} aria-hidden="true" />Baixar modelo CSV</Button>
        </header>
        <div className={`${styles.state} ${styles.stack}`}>
          <div>
            <label className="block" htmlFor="fitness-import">Arquivo de treino</label>
            <input
              id="fitness-import"
              className={styles.fileInput}
              type="file"
              accept=".csv,.json"
              aria-describedby="fitness-import-help"
              disabled={busy}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void read(file);
                event.target.value = "";
              }}
            />
          </div>
          <p id="fitness-import-help" className="m-0">
            O ShapeOS reconhece cabeçalhos comuns de Strong e Hevy. Use cargas em kg, corrija as datas na revisão e vincule cada exercício a uma ficha ativa.
            Importe apenas registros ausentes para evitar duplicatas.
          </p>
        </div>
      </section>
      {rows.length > 0 && (
        <section className="personal-panel" aria-labelledby="student-data-review">
          <header className="personal-panel-heading">
            <h2 id="student-data-review">Revisar {rows.length} séries antes de salvar</h2>
          </header>
          <div className="overflow-x-auto max-h-[500px]">
            <table className="personal-table">
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
          <footer className={styles.state}>
            <Button disabled={busy} onClick={() => void apply()}>
              {busy ? "Importando…" : "Confirmar importação revisada"}
            </Button>
          </footer>
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
