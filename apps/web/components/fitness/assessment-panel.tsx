"use client";
import Image from "next/image";
import { AutoResizeTextarea } from "@/components/ui/auto-resize-textarea";
import { AgendaDatePicker } from "./agenda-date-picker";
import styles from "./assessment-panel.module.css";
import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { saveAssessment, today, type Assessment } from "@/services/fitness";
export function AssessmentPanel({
  alunoId,
  assessments,
  onChange,
  own = false,
  compact = false,
  assessmentMode,
  actionPicker,
  schedule,
}: {
  alunoId: string;
  assessments: Assessment[];
  onChange: () => void;
  own?: boolean;
  compact?: boolean;
  assessmentMode?: "now" | "schedule" | null;
  actionPicker?: ReactNode;
  schedule?: ReactNode;
}) {
  const [date, setDate] = useState(today()),
    [values, setValues] = useState({
      peso: "",
      cintura: "",
      quadril: "",
      braco: "",
    }),
    [notes, setNotes] = useState(""),
    [file, setFile] = useState<File | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [a, setA] = useState(""),
    [b, setB] = useState(""),
    [urls, setUrls] = useState<string[]>([]);
  useEffect(() => {
    let cancelled = false;
    setUrls([]);
    void Promise.all(
      [a, b].map(async (id) => {
        const row = assessments.find((v) => v.id === id);
        if (!row?.foto_path) return "";
        const { data, error } = await createClient()
          .storage.from("evolucao-shapeos")
          .createSignedUrl(row.foto_path, 300);
        if (error) throw error;
        return data.signedUrl;
      }),
    )
      .then((v) => {
        if (!cancelled) setUrls(v);
      })
      .catch(() => {
        if (!cancelled) setError("Não foi possível carregar as fotos.");
      });
    return () => {
      cancelled = true;
    };
  }, [a, b, assessments]);
  async function save() {
    setError("");
    setBusy(true);
    let path: string | null = null;
    try {
      const numbers = Object.fromEntries(
        Object.entries(values).map(([k, v]) => [
          k,
          v ? Number(v.replace(",", ".")) : null,
        ]),
      ) as Record<keyof typeof values, number | null>;
      if (
        !date ||
        Object.values(numbers).some(
          (v) => v != null && (!Number.isFinite(v) || v <= 0),
        ) ||
        (!Object.values(numbers).some((v) => v != null) &&
          !notes.trim() &&
          !file)
      )
        throw new Error(
          "Informe a data e ao menos uma medida, foto ou observação.",
        );
      if (file) {
        if (
          file.size > 5 * 1024 * 1024 ||
          !["image/jpeg", "image/png", "image/webp"].includes(file.type)
        )
          throw new Error("Use JPG, PNG ou WEBP de até 5 MB.");
        path = `${alunoId}/${crypto.randomUUID()}.${file.type.split("/")[1]}`;
        const { error } = await createClient()
          .storage.from("evolucao-shapeos")
          .upload(path, file, { contentType: file.type });
        if (error) throw error;
      }
      await saveAssessment({
        aluno_id: alunoId,
        data: date,
        ...numbers,
        observacoes: notes,
        foto_path: path,
      });
      setValues({ peso: "", cintura: "", quadril: "", braco: "" });
      setNotes("");
      setFile(null);
      onChange();
    } catch (e) {
      if (path)
        await createClient().storage.from("evolucao-shapeos").remove([path]);
      setError(
        e instanceof Error ? e.message : "Não foi possível salvar a avaliação.",
      );
    } finally {
      setBusy(false);
    }
  }
  const latest = assessments.find((v) => v.peso != null),
    first = [...assessments].reverse().find((v) => v.peso != null),
    diff =
      latest && first
        ? Math.round((latest.peso! - first.peso!) * 100) / 100
        : null;
  const weightSummary = latest && (
        <div className="rounded-2xl border bg-card p-5" data-assessment-weight>
          <p className="text-sm text-muted-foreground">
            Último peso registrado
          </p>
          <p className="mt-2 text-3xl font-semibold">{latest.peso} kg</p>
          {diff != null && (
            <p className="mt-2 text-sm text-muted-foreground">
              Variação desde a primeira avaliação: {diff > 0 ? "+" : ""}
              {diff} kg
            </p>
          )}
        </div>
  );
  return (
    <div className={`space-y-5 ${compact ? styles.compact : ""}`} data-assessment-panel>
      {actionPicker}
      {assessmentMode === undefined && weightSummary}
      <div hidden={assessmentMode !== undefined && assessmentMode !== "now"}>
      <section className="rounded-2xl border bg-card p-5 space-y-4" data-assessment-form>
        <h2 className="text-lg font-semibold">{assessmentMode === undefined ? "Nova avaliação" : "Avaliar agora"}</h2>
        <div className={compact ? styles.measurements : undefined}>
        <div className={compact ? styles.assessmentDate : undefined}>
          <Label htmlFor="assessment-date">Data</Label>
          <div className={compact ? styles.dateField : undefined}>{compact ? <AgendaDatePicker id="assessment-date" label="Data da avaliação" value={date} disabled={busy} align="start" onChange={setDate} /> : <Input
            id="assessment-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />}</div>
        </div>
        <div className={`grid grid-cols-2 sm:grid-cols-4 gap-3 ${compact ? styles.measureInputs : ""}`}>
          {(["peso", "cintura", "quadril", "braco"] as const).map((k) => (
            <div key={k}>
              <Label htmlFor={`measure-${k}`}>
                {
                  {
                    peso: "Peso (kg)",
                    cintura: "Cintura (cm)",
                    quadril: "Quadril (cm)",
                    braco: "Braço (cm)",
                  }[k]
                }
              </Label>
              <Input
                id={`measure-${k}`}
                type="number"
                inputMode="decimal"
                min={1}
                step="0.1"
                value={values[k]}
                onChange={(e) => setValues({ ...values, [k]: e.target.value })}
              />
            </div>
          ))}
        </div>
        </div>
        <div>
          <Label htmlFor="assessment-notes">Observações e metas</Label>
          <AutoResizeTextarea
            id="assessment-notes"
            rows={compact ? 2 : undefined}
            maxLength={2000}
            className="w-full rounded-md border bg-background p-3"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
        {own && (
          <div>
            <Label htmlFor="assessment-photo">
              Foto de evolução (opcional)
            </Label>
            <input
              id="assessment-photo"
              key={file ? "selected" : "empty"}
              className="block mt-2 max-w-full text-sm"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <p className="mt-2 text-xs text-muted-foreground">
              Foto privada, visível para você, seus personais vinculados e a
              administração.
            </p>
          </div>
        )}
        <div className={compact ? styles.formActions : undefined}>
          <Button className={compact ? styles.saveButton : undefined} disabled={busy} onClick={() => void save()}>
            {busy ? "Salvando…" : "Salvar avaliação"}
          </Button>
        </div>
        {error && (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        )}
      </section>
      </div>
      {schedule}
      {assessmentMode !== undefined && weightSummary}
      {assessments.some((v) => v.foto_path) && (
        <section className="rounded-2xl border bg-card p-5 space-y-4">
          <h2 className="font-semibold">Comparar fotos de evolução</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {[a, b].map((id, i) => (
              <div key={i}>
                <label className="text-sm" htmlFor={`photo-${i}`}>
                  {i === 0 ? "Antes" : "Depois"}
                </label>
                <select
                  id={`photo-${i}`}
                  className="w-full h-10 border rounded-md bg-background mt-2"
                  value={id}
                  onChange={(e) =>
                    i === 0 ? setA(e.target.value) : setB(e.target.value)
                  }
                >
                  <option value="">Escolha a avaliação</option>
                  {assessments
                    .filter((v) => v.foto_path)
                    .map((v) => (
                      <option key={v.id} value={v.id}>
                        {new Date(`${v.data}T12:00:00`).toLocaleDateString(
                          "pt-BR",
                        )}
                      </option>
                    ))}
                </select>
                {urls[i] && (
                  <Image
                    unoptimized
                    width={600}
                    height={800}
                    src={urls[i]}
                    alt={`Foto de evolução ${i === 0 ? "anterior" : "posterior"}`}
                    className="mt-3 w-full h-80 object-contain rounded-xl bg-muted"
                  />
                )}
              </div>
            ))}
          </div>
        </section>
      )}
      <section className="overflow-x-auto rounded-2xl border bg-card p-5">
        <table className="w-full text-sm text-left">
          <caption className="text-left font-semibold mb-4">
            Histórico de medidas
          </caption>
          <thead>
            <tr className="text-muted-foreground">
              <th>Data</th>
              <th>Peso</th>
              <th>Cintura</th>
              <th>Quadril</th>
              <th>Braço</th>
            </tr>
          </thead>
          <tbody>
            {assessments.map((v) => (
              <tr key={v.id} className="border-t">
                <td className="py-3">
                  {new Date(`${v.data}T12:00:00`).toLocaleDateString("pt-BR")}
                  {v.observacoes && (
                    <p className="mt-1 text-xs text-muted-foreground max-w-xs whitespace-pre-wrap">
                      {v.observacoes}
                    </p>
                  )}
                </td>
                <td>{v.peso ?? "—"}</td>
                <td>{v.cintura ?? "—"}</td>
                <td>{v.quadril ?? "—"}</td>
                <td>{v.braco ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!assessments.length && (
          <p className="text-sm text-muted-foreground mt-3">
            Nenhuma avaliação registrada.
          </p>
        )}
      </section>
    </div>
  );
}
