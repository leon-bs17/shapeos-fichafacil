// Mocked data for shapeOS - ficha fácil
// Weekly schedule per student · workout templates · exercises with reliable image sources

export const weekDays = [
  { key: "seg", label: "Segunda", short: "Seg" },
  { key: "ter", label: "Terça", short: "Ter" },
  { key: "qua", label: "Quarta", short: "Qua" },
  { key: "qui", label: "Quinta", short: "Qui" },
  { key: "sex", label: "Sexta", short: "Sex" },
  { key: "sab", label: "Sábado", short: "Sáb" },
  { key: "dom", label: "Domingo", short: "Dom" },
];

// Map JS Date.getDay() (0=Sun..6=Sat) → schedule key
export const jsDayToKey = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"];

export const workoutTemplates = [
  { id: "A", code: "Treino A", title: "Peito & Ombros", accent: "#00D2D2" },
  { id: "B", code: "Treino B", title: "Costas & Bíceps", accent: "#FF7043" },
  { id: "C", code: "Treino C", title: "Pernas", accent: "#a78bfa" },
  { id: "D", code: "Treino D", title: "Core & Full Body", accent: "#fbbf24" },
  { id: "rest", code: "Descanso", title: "Recuperação", accent: "#52525b" },
];

// Reliable image source: strengthlevel.com static illustrations (verified 200 OK)
const SL = (slug) =>
  `https://static.strengthlevel.com/images/illustrations/${slug}-1000x1000.jpg`;

// Full exercise library available to the Personal for building fichas
export const exerciseLibrary = [
  // Peito
  { id: "lib-01", name: "Supino Reto com Barra", muscle: "Peitoral", equipment: "Barra Olímpica", gif: SL("bench-press") },
  { id: "lib-02", name: "Supino Inclinado com Halteres", muscle: "Peitoral Superior", equipment: "Halteres", gif: SL("incline-dumbbell-bench-press") },
  { id: "lib-03", name: "Crucifixo com Halteres", muscle: "Peitoral", equipment: "Halteres", gif: SL("dumbbell-fly") },
  { id: "lib-04", name: "Crucifixo na Máquina", muscle: "Peitoral Interno", equipment: "Peck-Deck", gif: SL("machine-chest-fly") },
  // Ombros
  { id: "lib-05", name: "Desenvolvimento com Halteres", muscle: "Ombros", equipment: "Halteres", gif: SL("dumbbell-shoulder-press") },
  // Costas
  { id: "lib-06", name: "Puxada Alta na Polia", muscle: "Latíssimo", equipment: "Polia Alta", gif: SL("lat-pulldown") },
  { id: "lib-07", name: "Remada Curvada com Halteres", muscle: "Costas Média", equipment: "Halteres", gif: SL("dumbbell-row") },
  { id: "lib-08", name: "Remada Sentada na Polia", muscle: "Costas", equipment: "Polia Baixa", gif: SL("seated-cable-row") },
  { id: "lib-09", name: "Levantamento Terra", muscle: "Posterior Total", equipment: "Barra Olímpica", gif: SL("deadlift") },
  // Bíceps
  { id: "lib-10", name: "Rosca Scott na Máquina", muscle: "Bíceps", equipment: "Banco Scott", gif: SL("preacher-curl") },
  { id: "lib-11", name: "Rosca Martelo", muscle: "Braquial", equipment: "Halteres", gif: SL("hammer-curl") },
  // Pernas
  { id: "lib-12", name: "Agachamento Livre", muscle: "Quadríceps + Glúteo", equipment: "Barra Olímpica", gif: SL("squat") },
  { id: "lib-13", name: "Levantamento Terra Romeno", muscle: "Posterior + Glúteo", equipment: "Barra Olímpica", gif: SL("romanian-deadlift") },
  { id: "lib-14", name: "Cadeira Extensora", muscle: "Quadríceps", equipment: "Máquina", gif: SL("leg-extension") },
  { id: "lib-15", name: "Mesa Flexora", muscle: "Posterior", equipment: "Máquina", gif: SL("lying-leg-curl") },
  { id: "lib-16", name: "Agachamento Goblet", muscle: "Quadríceps", equipment: "Halter", gif: SL("goblet-squat") },
  // Core
  { id: "lib-17", name: "Prancha Isométrica", muscle: "Core", equipment: "Peso Corporal", gif: SL("plank") },
  { id: "lib-18", name: "Elevação de Pernas na Barra", muscle: "Abdômen Inferior", equipment: "Barra Fixa", gif: SL("hanging-leg-raise") },
  { id: "lib-19", name: "Abdominal na Polia", muscle: "Reto Abdominal", equipment: "Polia Alta", gif: SL("cable-crunch") },
];

export const workoutsById = {
  A: {
    code: "Treino A",
    title: "Peito & Ombros",
    focus: "Força + Hipertrofia",
    duration: "≈ 60 min",
    exercises: [
      { id: "A-01", order: 1, name: "Supino Reto com Barra", muscle: "Peitoral", equipment: "Barra Olímpica", sets: 4, reps: "8 - 10", weight: "60 kg", rest: "90s", gif: SL("bench-press") },
      { id: "A-02", order: 2, name: "Supino Inclinado com Halteres", muscle: "Peitoral Superior", equipment: "Halteres", sets: 4, reps: "10 - 12", weight: "22 kg", rest: "75s", gif: SL("incline-dumbbell-bench-press") },
      { id: "A-03", order: 3, name: "Crucifixo com Halteres", muscle: "Peitoral", equipment: "Halteres", sets: 3, reps: "12", weight: "14 kg", rest: "60s", gif: SL("dumbbell-fly") },
      { id: "A-04", order: 4, name: "Crucifixo na Máquina", muscle: "Peitoral Interno", equipment: "Peck-Deck", sets: 3, reps: "12 - 15", weight: "45 kg", rest: "60s", gif: SL("machine-chest-fly") },
      { id: "A-05", order: 5, name: "Desenvolvimento com Halteres", muscle: "Ombros", equipment: "Halteres", sets: 4, reps: "10", weight: "18 kg", rest: "75s", gif: SL("dumbbell-shoulder-press") },
    ],
  },
  B: {
    code: "Treino B",
    title: "Costas & Bíceps",
    focus: "Volume + Espessura",
    duration: "≈ 55 min",
    exercises: [
      { id: "B-01", order: 1, name: "Puxada Alta na Polia", muscle: "Latíssimo", equipment: "Polia Alta", sets: 4, reps: "10 - 12", weight: "55 kg", rest: "75s", gif: SL("lat-pulldown") },
      { id: "B-02", order: 2, name: "Remada Curvada com Halteres", muscle: "Costas Média", equipment: "Halteres", sets: 4, reps: "10", weight: "24 kg", rest: "75s", gif: SL("dumbbell-row") },
      { id: "B-03", order: 3, name: "Remada Sentada na Polia", muscle: "Costas", equipment: "Polia Baixa", sets: 3, reps: "12", weight: "50 kg", rest: "60s", gif: SL("seated-cable-row") },
      { id: "B-04", order: 4, name: "Rosca Scott na Máquina", muscle: "Bíceps", equipment: "Banco Scott", sets: 3, reps: "12", weight: "20 kg", rest: "60s", gif: SL("preacher-curl") },
      { id: "B-05", order: 5, name: "Rosca Martelo", muscle: "Braquial", equipment: "Halteres", sets: 3, reps: "12", weight: "14 kg", rest: "45s", gif: SL("hammer-curl") },
    ],
  },
  C: {
    code: "Treino C",
    title: "Pernas",
    focus: "Força & Hipertrofia",
    duration: "≈ 70 min",
    exercises: [
      { id: "C-01", order: 1, name: "Agachamento Livre", muscle: "Quadríceps + Glúteo", equipment: "Barra Olímpica", sets: 4, reps: "6 - 8", weight: "90 kg", rest: "120s", gif: SL("squat") },
      { id: "C-02", order: 2, name: "Levantamento Terra Romeno", muscle: "Posterior + Glúteo", equipment: "Barra Olímpica", sets: 4, reps: "8 - 10", weight: "80 kg", rest: "90s", gif: SL("romanian-deadlift") },
      { id: "C-03", order: 3, name: "Cadeira Extensora", muscle: "Quadríceps", equipment: "Máquina", sets: 3, reps: "12 - 15", weight: "40 kg", rest: "60s", gif: SL("leg-extension") },
      { id: "C-04", order: 4, name: "Mesa Flexora", muscle: "Posterior", equipment: "Máquina", sets: 3, reps: "12", weight: "35 kg", rest: "60s", gif: SL("lying-leg-curl") },
      { id: "C-05", order: 5, name: "Agachamento Goblet", muscle: "Quadríceps", equipment: "Halter", sets: 3, reps: "15", weight: "22 kg", rest: "60s", gif: SL("goblet-squat") },
    ],
  },
  D: {
    code: "Treino D",
    title: "Core & Full Body",
    focus: "Estabilidade + Resistência",
    duration: "≈ 45 min",
    exercises: [
      { id: "D-01", order: 1, name: "Levantamento Terra", muscle: "Posterior Total", equipment: "Barra Olímpica", sets: 4, reps: "5", weight: "100 kg", rest: "120s", gif: SL("deadlift") },
      { id: "D-02", order: 2, name: "Prancha", muscle: "Core", equipment: "Peso Corporal", sets: 3, reps: "60s", weight: "PC", rest: "45s", gif: SL("plank") },
      { id: "D-03", order: 3, name: "Elevação de Pernas na Barra", muscle: "Abdômen Inferior", equipment: "Barra Fixa", sets: 3, reps: "12", weight: "PC", rest: "60s", gif: SL("hanging-leg-raise") },
      { id: "D-04", order: 4, name: "Abdominal na Polia", muscle: "Reto Abdominal", equipment: "Polia Alta", sets: 3, reps: "15", weight: "25 kg", rest: "45s", gif: SL("cable-crunch") },
    ],
  },
  rest: null,
};

export const students = [
  {
    id: "std-01",
    name: "Rafael Martins",
    age: 27,
    plan: "Hipertrofia",
    currentWorkout: "Treino A",
    lastSeen: "Hoje, 07:42",
    progress: 82,
    streak: 14,
    initials: "RM",
    status: "ativo",
    schedule: { seg: "A", ter: "B", qua: "C", qui: "A", sex: "D", sab: "rest", dom: "rest" },
  },
  {
    id: "std-02",
    name: "Beatriz Camargo",
    age: 31,
    plan: "Emagrecimento",
    currentWorkout: "Treino B",
    lastSeen: "Ontem, 19:15",
    progress: 64,
    streak: 8,
    initials: "BC",
    status: "ativo",
    schedule: { seg: "C", ter: "D", qua: "rest", qui: "C", sex: "D", sab: "A", dom: "rest" },
  },
  {
    id: "std-03",
    name: "Lucas Oliveira",
    age: 22,
    plan: "Força Máxima",
    currentWorkout: "Treino C",
    lastSeen: "Há 2 dias",
    progress: 47,
    streak: 3,
    initials: "LO",
    status: "pausado",
    schedule: { seg: "A", ter: "rest", qua: "B", qui: "rest", sex: "C", sab: "rest", dom: "rest" },
  },
];

export const personalStats = {
  activeStudents: 12,
  workoutsCreated: 38,
  weeklyAdherence: 91,
};
