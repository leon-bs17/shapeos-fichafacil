export interface ImportRow {
  name: string;
  date: string;
  load: string;
  reps: string;
  seconds: string;
  itemId: string;
}
export function parseCsv(text: string): string[][] {
  const out: string[][] = [];
  let row: string[] = [],
    cell = "",
    quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else quoted = !quoted;
    } else if (c === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((c === "\n" || c === "\r") && !quoted) {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      if (row.some((v) => v.trim())) out.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (quoted) throw new Error("CSV com aspas não fechadas.");
  row.push(cell);
  if (row.some((v) => v.trim())) out.push(row);
  return out;
}
export function importRows(text: string): ImportRow[] {
  if (text.trim().startsWith("{")) {
    const data = JSON.parse(text);
    if (data.format !== "shapeos-fitness-v1" || !Array.isArray(data.sessions))
      throw new Error("Arquivo ShapeOS inválido.");
    return data.sessions.flatMap((s: any) => {
      if (!Array.isArray(s.series) || !Array.isArray(s.prescricao))
        throw new Error("Sessão inválida.");
      return s.series
        .filter((r: any) => !r.aquecimento)
        .map((r: any) => ({
          name: s.prescricao.find((e: any) => e.id === r.item_id)?.nome ?? "",
          date: String(s.inicio).slice(0, 10),
          load: r.carga == null ? "" : String(r.carga),
          reps: r.reps == null ? "" : String(r.reps),
          seconds: r.segundos == null ? "" : String(r.segundos),
          itemId: "",
        }));
    });
  }
  const rows = parseCsv(text);
  const header =
    rows.shift()?.map((v) =>
      v
        .replace(/^\uFEFF/, "")
        .trim()
        .toLowerCase(),
    ) ?? [];
  const col = (...names: string[]) =>
    header.findIndex((v) => names.includes(v));
  const exercise = col(
      "exercise",
      "exercise name",
      "exercise_title",
      "exercicio",
      "exercício",
    ),
    date = col("date", "start_time", "data"),
    weight = col("weight", "weight (kg)", "weight_kg", "carga"),
    reps = col("reps", "repeticoes", "repetições"),
    duration = col("duration_seconds", "segundos");
  if (exercise < 0 || date < 0 || (reps < 0 && duration < 0))
    throw new Error(
      "CSV precisa de exercício, data e repetições ou segundos. Use o modelo disponível.",
    );
  return rows.map((r) => ({
    name: r[exercise] ?? "",
    date: /^\d{4}-\d{2}-\d{2}/.test(r[date] ?? "") ? r[date].slice(0, 10) : "",
    load: r[weight] ?? "",
    reps:
      Number(r[reps]) === 0 && Number(r[duration]) > 0 ? "" : (r[reps] ?? ""),
    seconds:
      Number(r[duration]) === 0 && Number(r[reps]) > 0
        ? ""
        : (r[duration] ?? ""),
    itemId: "",
  }));
}
