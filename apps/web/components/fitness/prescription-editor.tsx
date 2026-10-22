"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ExercisePreview } from "@/components/fitness/exercise-demonstration";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import {
  defaultPrescription,
  loadPrescriptions,
  savePrescriptions,
  type Prescricao,
} from "@/services/fitness";
import type { FichaResumo } from "@/services/treinos";
export function PrescriptionEditor({
  ficha,
  onClose,
  personal = false,
}: {
  ficha: FichaResumo;
  onClose: () => void;
  personal?: boolean;
}) {
  const [rows, setRows] = useState<Prescricao[]>([]),
    [busy, setBusy] = useState(true),
    [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    void loadPrescriptions(ficha.itens.map((i) => i.id))
      .then((data) => {
        if (!cancelled)
          setRows(
            ficha.itens.map((i) => ({
              ...defaultPrescription,
              item_treino_id: i.id,
              ...data.find((v) => v.item_treino_id === i.id),
            })),
          );
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ficha]);
  function change(i: number, k: keyof Prescricao, value: string) {
    setRows((old) =>
      old.map((r, n) =>
        n === i
          ? {
              ...r,
              [k]: ["superset", "observacoes"].includes(k)
                ? value || null
                : value === ""
                  ? ["aquecimento", "incremento_kg"].includes(k)
                    ? 0
                    : null
                  : Number(value),
            }
          : r,
      ),
    );
  }
  async function save() {
    setError("");
    setBusy(true);
    try {
      for (const r of rows) {
        if (
          (r.carga_alvo != null &&
            (!Number.isFinite(r.carga_alvo) ||
              r.carga_alvo < 0 ||
              r.carga_alvo > 9999)) ||
          (r.duracao_segundos != null &&
            (!Number.isInteger(r.duracao_segundos) ||
              r.duracao_segundos < 1 ||
              r.duracao_segundos > 7200)) ||
          (r.rpe_alvo != null &&
            (!Number.isFinite(r.rpe_alvo) ||
              r.rpe_alvo < 1 ||
              r.rpe_alvo > 10)) ||
          !Number.isInteger(r.aquecimento) ||
          r.aquecimento < 0 ||
          r.aquecimento > 10 ||
          !Number.isFinite(r.incremento_kg) ||
          r.incremento_kg < 0 ||
          r.incremento_kg > 100
        )
          throw new Error("Revise os valores da prescrição.");
      }
      await savePrescriptions(
        rows.map((r) => ({
          ...r,
          observacoes: r.observacoes ?? "",
          superset: r.superset?.trim() || null,
        })),
      );
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível salvar.");
    } finally {
      setBusy(false);
    }
  }
  const fields: {
    key: keyof Prescricao;
    label: string;
    min: number;
    max: number;
    step?: number;
  }[] = [
    {
      key: "carga_alvo",
      label: "Carga fixa (kg)",
      min: 0,
      max: 9999,
      step: 0.5,
    },
    { key: "duracao_segundos", label: "Tempo alvo (s)", min: 1, max: 7200 },
    { key: "rpe_alvo", label: "RPE alvo", min: 1, max: 10, step: 0.5 },
    { key: "aquecimento", label: "Séries de aquecimento", min: 0, max: 10 },
    {
      key: "incremento_kg",
      label: "Progressão (kg)",
      min: 0,
      max: 100,
      step: 0.5,
    },
  ];
  return (
    <Modal
      personal={personal}
      open
      onClose={onClose}
      titulo={`Prescrição avançada · ${ficha.titulo}`}
      className="max-w-3xl"
    >
      <div className="space-y-5">
        <p className="text-sm text-muted-foreground">
          Use a mesma letra de superset para alternar exercícios. Tempo alvo
          substitui repetições. Sem carga fixa, a progressão sugere um aumento
          quando todas as séries da última sessão atingirem o limite superior de
          repetições.
        </p>
        {rows.map((r, i) => (
          <section
            key={r.item_treino_id}
            className="border rounded-xl p-4 space-y-3"
          >
            <h3 className="font-semibold">{ficha.itens[i].exercicio.nome}</h3>
            <ExercisePreview name={ficha.itens[i].exercicio.nome} exerciseId={ficha.itens[i].exercicio.id} videoUrl={ficha.itens[i].exercicio.video_url} />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {fields.map((f) => (
                <div key={f.key}>
                  <Label htmlFor={`${r.item_treino_id}-${f.key}`}>
                    {f.label}
                  </Label>
                  <Input
                    id={`${r.item_treino_id}-${f.key}`}
                    type="number"
                    min={f.min}
                    max={f.max}
                    step={f.step ?? 1}
                    value={r[f.key] ?? ""}
                    onChange={(e) => change(i, f.key, e.target.value)}
                  />
                </div>
              ))}
              <div>
                <Label htmlFor={`${r.item_treino_id}-group`}>
                  Superset (A, B…)
                </Label>
                <Input
                  id={`${r.item_treino_id}-group`}
                  maxLength={20}
                  placeholder="Opcional"
                  value={r.superset ?? ""}
                  onChange={(e) => change(i, "superset", e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label htmlFor={`${r.item_treino_id}-note`}>
                Instruções do personal
              </Label>
              <Input
                id={`${r.item_treino_id}-note`}
                maxLength={1000}
                value={r.observacoes ?? ""}
                onChange={(e) => change(i, "observacoes", e.target.value)}
              />
            </div>
          </section>
        ))}
        {busy && !rows.length && <p>Carregando prescrição…</p>}
        {error && (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
          <Button disabled={busy || !rows.length} onClick={() => void save()}>
            {busy ? "Salvando…" : "Salvar prescrição"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}


