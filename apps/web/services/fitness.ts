import { createClient } from "@/lib/supabase/client";

export interface Prescricao {
  item_treino_id?: string;
  carga_alvo: number | null;
  duracao_segundos: number | null;
  rpe_alvo: number | null;
  superset: string | null;
  aquecimento: number;
  incremento_kg: number;
  observacoes: string;
}
export interface Exercise {
  id: string;
  exercicio_id: string;
  nome: string;
  grupo_muscular: string;
  video_url?: string | null;
  series: number;
  repeticoes: string;
  descanso_segundos: number;
  ordem: number;
  config: Prescricao;
}
export interface Workout {
  id: string;
  titulo: string;
  itens: Exercise[];
}
export interface SetLog {
  id: string;
  item_id: string;
  carga: number | null;
  reps: number | null;
  segundos: number | null;
  rpe: number | null;
  aquecimento: boolean;
  registrado_em: string;
}
export interface Session {
  id: string;
  aluno_id: string;
  treino_id: string;
  titulo: string;
  inicio: string;
  fim: string | null;
  status: "EM_ANDAMENTO" | "CONCLUIDO";
  prescricao: Exercise[];
  series: SetLog[];
  observacoes: string;
}
export interface Agenda {
  id: string;
  aluno_id: string;
  treino_id: string;
  data: string;
}
export interface Assessment {
  id: string;
  aluno_id: string;
  data: string;
  peso: number | null;
  cintura: number | null;
  quadril: number | null;
  braco: number | null;
  observacoes: string;
  foto_path: string | null;
}
export const defaultPrescription: Prescricao = {
  carga_alvo: null,
  duracao_segundos: null,
  rpe_alvo: null,
  superset: null,
  aquecimento: 0,
  incremento_kg: 0,
  observacoes: "",
};
export function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function dayOf(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function fail(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}
export async function workoutsForStudent(alunoId: string): Promise<Workout[]> {
  const { data, error } = await createClient()
    .from("treinos")
    .select(
      "id,titulo,itens_treino(id,exercicio_id,series,repeticoes,descanso_segundos,ordem,exercicio:exercicios(nome,grupo_muscular,video_url),prescricoes_treino(*))",
    )
    .eq("aluno_id", alunoId)
    .eq("ativo", true)
    .order("criado_em", { ascending: false });
  fail(error);
  return (data ?? []).map((w: any) => ({
    id: w.id,
    titulo: w.titulo,
    itens: w.itens_treino
      .map((i: any) => ({
        ...i,
        ...i.exercicio,
        config: {
          ...defaultPrescription,
          ...(Array.isArray(i.prescricoes_treino)
            ? i.prescricoes_treino[0]
            : i.prescricoes_treino),
        },
      }))
      .sort((a: Exercise, b: Exercise) => a.ordem - b.ordem),
  }));
}
export async function sessionsForStudent(id: string): Promise<Session[]> {
  const { data, error } = await createClient()
    .from("sessoes_treino")
    .select("*")
    .eq("aluno_id", id)
    .order("inicio", { ascending: false })
    .limit(1000);
  fail(error);
  return data ?? [];
}
export async function agendaForStudent(id: string): Promise<Agenda[]> {
  const { data, error } = await createClient()
    .from("agenda_treino")
    .select("*")
    .eq("aluno_id", id)
    .order("data", { ascending: false })
    .limit(500);
  fail(error);
  return data ?? [];
}
export async function assessmentsForStudent(id: string): Promise<Assessment[]> {
  const { data, error } = await createClient()
    .from("avaliacoes_fisicas")
    .select("*")
    .eq("aluno_id", id)
    .order("data", { ascending: false })
    .limit(500);
  fail(error);
  return data ?? [];
}
export async function saveSession(s: Session) {
  const { error } = await createClient().rpc("salvar_sessao_shapeos", {
    p_sessao: s,
  });
  fail(error);
}
export async function saveAgenda(a: Omit<Agenda, "id"> & { id?: string }) {
  const { error } = await createClient()
    .from("agenda_treino")
    .upsert(a, { onConflict: a.id ? "id" : "aluno_id,treino_id,data" });
  fail(error);
}
export async function removeAgenda(id: string) {
  const { error } = await createClient()
    .from("agenda_treino")
    .delete()
    .eq("id", id);
  fail(error);
}
export async function saveAssessment(a: Omit<Assessment, "id">) {
  const { error } = await createClient().from("avaliacoes_fisicas").insert(a);
  fail(error);
}
export async function savePrescriptions(rows: Prescricao[]) {
  const { error } = await createClient()
    .from("prescricoes_treino")
    .upsert(rows);
  fail(error);
}
export async function loadPrescriptions(ids: string[]) {
  const { data, error } = await createClient()
    .from("prescricoes_treino")
    .select("*")
    .in("item_treino_id", ids);
  fail(error);
  return data ?? [];
}
export function workingSets(s: Session) {
  return s.series.filter((r) => !r.aquecimento);
}
export function sessionVolume(s: Session) {
  return workingSets(s).reduce((n, r) => n + (r.carga ?? 0) * (r.reps ?? 0), 0);
}
export function plannedSets(s: Session) {
  return s.prescricao.reduce((n, e) => n + e.series, 0);
}
export function completion(s: Session) {
  const done = s.prescricao.reduce(
    (n, e) =>
      n +
      Math.min(
        e.series,
        workingSets(s).filter((r) => r.item_id === e.id).length,
      ),
    0,
  );
  return plannedSets(s) ? Math.round((done / plannedSets(s)) * 100) : 0;
}
export function previousSets(
  sessions: Session[],
  e: Exercise,
  exclude?: string,
) {
  return sessions
    .filter((s) => s.id !== exclude && s.status === "CONCLUIDO")
    .flatMap((s) =>
      s.series
        .filter(
          (r) =>
            !r.aquecimento &&
            s.prescricao.some(
              (i) => i.id === r.item_id && i.exercicio_id === e.exercicio_id,
            ),
        )
        .map((r) => ({ ...r, inicio: s.inicio })),
    )
    .sort((a, b) => b.registrado_em.localeCompare(a.registrado_em));
}
export function loadSuggestion(sessions: Session[], e: Exercise) {
  const prev = previousSets(sessions, e);
  const last = prev[0];
  const latest = last ? prev.filter((r) => r.inicio === last.inicio) : [];
  const upper = Number(e.repeticoes.match(/\d+/g)?.at(-1));
  const progress =
    latest.length >= e.series &&
    upper > 0 &&
    latest.every((r) => (r.reps ?? 0) >= upper) &&
    e.config.incremento_kg > 0;
  return {
    load:
      e.config.carga_alvo ??
      (last?.carga != null
        ? last.carga + (progress ? e.config.incremento_kg : 0)
        : null),
    progress: progress && e.config.carga_alvo == null,
  };
}
export function download(name: string, value: unknown) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
// Account-scoped outbox; a stable UUID makes retries idempotent on the server.
const key = (id: string) => `shapeos-fitness-v1:${id}`;
export function localSessions(id: string): Session[] {
  try {
    return JSON.parse(localStorage.getItem(key(id)) ?? "[]");
  } catch {
    return [];
  }
}
export function queueSession(s: Session) {
  const all = localSessions(s.aluno_id).filter((v) => v.id !== s.id);
  localStorage.setItem(key(s.aluno_id), JSON.stringify([...all, s]));
}
export function clearQueued(id: string, s: Session) {
  localStorage.setItem(
    key(id),
    JSON.stringify(
      localSessions(id).filter(
        (v) => v.id !== s.id || JSON.stringify(v) !== JSON.stringify(s),
      ),
    ),
  );
}
export async function syncQueue(id: string) {
  for (const s of localSessions(id)) {
    await saveSession(s);
    clearQueued(id, s);
  }
}
