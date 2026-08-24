'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Check,
  ChevronRight,
  Clock,
  Flame,
  Minus,
  Pause,
  Play,
  Plus,
  Trophy,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface ExercicioExecucao {
  id: string
  nome: string
  grupo_muscular: string
  series: number
  repeticoes: string
  descanso_segundos: number
  ordem: number
}

interface SerieRegistrada {
  carga: number | null
  reps: number | null
}

interface ModoExecucaoProps {
  exercicios: ExercicioExecucao[]
  onRegistrarSerie?: (
    itemTreinoId: string,
    carga: number | null,
    reps: number | null
  ) => Promise<void> | void
  onFinalizar: () => void
  onCancelar: () => void
}

const RING_RAIO = 62
const RING_CIRC = 2 * Math.PI * RING_RAIO

function tocarBip() {
  try {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.12, ctx.currentTime)
    osc.start()
    osc.stop(ctx.currentTime + 0.16)
    setTimeout(() => void ctx.close(), 500)
  } catch {
    /* silencioso */
  }
}

function vibrar() {
  try {
    navigator.vibrate?.([160, 110, 160])
  } catch {
    /* sem suporte */
  }
}

export function ModoExecucao({
  exercicios,
  onRegistrarSerie,
  onFinalizar,
  onCancelar,
}: ModoExecucaoProps) {
  const [exercicioAtual, setExercicioAtual] = useState(0)
  const [seriesFeitas, setSeriesFeitas] = useState<Map<string, SerieRegistrada[]>>(
    new Map()
  )
  const [carga, setCarga] = useState('')
  const [reps, setReps] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [fase, setFase] = useState<'treino' | 'resumo'>('treino')
  const [emDescanso, setEmDescanso] = useState(false)
  const [descansoTotal, setDescansoTotal] = useState(0)
  const [restante, setRestante] = useState(0)
  const [pausado, setPausado] = useState(false)

  const inputCargaRef = useRef<HTMLInputElement>(null)
  const exercicio = exercicios[exercicioAtual]

  const totalSeriesGeral = useMemo(
    () => exercicios.reduce((acc, e) => acc + e.series, 0),
    [exercicios]
  )
  const seriesConcluidas = useMemo(
    () => [...seriesFeitas.values()].reduce((acc, lista) => acc + lista.length, 0),
    [seriesFeitas]
  )
  const volumeTotal = useMemo(() => {
    let vol = 0
    for (const lista of seriesFeitas.values()) {
      for (const s of lista) {
        if (s.carga != null && s.reps != null) vol += s.carga * s.reps
      }
    }
    return Math.round(vol * 10) / 10
  }, [seriesFeitas])

  const feitasNesteExercicio = exercicio
    ? (seriesFeitas.get(exercicio.id)?.length ?? 0)
    : 0

  useEffect(() => {
    if (!emDescanso || pausado) return

    const intervalo = setInterval(() => {
      setRestante((t) => {
        if (t <= 1) {
          clearInterval(intervalo)
          setEmDescanso(false)
          tocarBip()
          vibrar()
          setTimeout(() => inputCargaRef.current?.focus(), 60)
          return 0
        }
        return t - 1
      })
    }, 1000)

    return () => clearInterval(intervalo)
  }, [emDescanso, pausado])

  const iniciarDescanso = useCallback(
    (segundos: number) => {
      if (segundos <= 0) return
      setDescansoTotal(segundos)
      setRestante(segundos)
      setPausado(false)
      setEmDescanso(true)
    },
    []
  )

  async function registrarSerie() {
    if (!exercicio) return
    const cargaNum = carga.trim() === '' ? null : Number(carga.replace(',', '.'))
    const repsNum = reps.trim() === '' ? null : Number(reps)

    if (cargaNum == null && repsNum == null) return
    if ((cargaNum != null && Number.isNaN(cargaNum)) || (repsNum != null && Number.isNaN(repsNum))) return

    setSalvando(true)
    try {
      await onRegistrarSerie?.(exercicio.id, cargaNum, repsNum)

      const novas = new Map(seriesFeitas)
      const lista = novas.get(exercicio.id) ?? []
      novas.set(exercicio.id, [...lista, { carga: cargaNum, reps: repsNum }])
      setSeriesFeitas(novas)
      setCarga('')
      setReps('')

      const feitasDepois = lista.length + 1
      if (feitasDepois < exercicio.series) {
        iniciarDescanso(exercicio.descanso_segundos)
      } else if (exercicioAtual < exercicios.length - 1) {
        setExercicioAtual((e) => e + 1)
      } else {
        setFase('resumo')
        vibrar()
      }
    } finally {
      setSalvando(false)
    }
  }

  function pularExercicio() {
    if (exercicioAtual < exercicios.length - 1) {
      setExercicioAtual((e) => e + 1)
    } else {
      setFase('resumo')
    }
  }

  function sair() {
    if (seriesConcluidas > 0) {
      const ok = window.confirm(
        `Você já registrou ${seriesConcluidas} série(s) — elas foram salvas. Sair do treino mesmo assim?`
      )
      if (!ok) return
    }
    onCancelar()
  }

  function formatarTempo(segundos: number): string {
    const m = Math.floor(segundos / 60)
    const s = segundos % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  if (fase === 'resumo') {
    return (
      <div className="mx-auto max-w-lg space-y-6 text-center">
        <div className="animate-fade-in pt-6">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 pulse-glow">
            <Trophy className="h-10 w-10 text-primary" />
          </div>
          <h2 className="text-2xl font-bold">Treino concluído!</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Bom trabalho. Confira o resumo abaixo.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Card className="animate-slide-up stagger-1">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{seriesConcluidas}</p>
              <p className="text-muted-foreground text-xs mt-1">séries</p>
            </CardContent>
          </Card>
          <Card className="animate-slide-up stagger-2">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{volumeTotal}<span className="text-sm font-medium">kg</span></p>
              <p className="text-muted-foreground text-xs mt-1">volume</p>
            </CardContent>
          </Card>
          <Card className="animate-slide-up stagger-3">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{exercicios.length}</p>
              <p className="text-muted-foreground text-xs mt-1">exercícios</p>
            </CardContent>
          </Card>
        </div>

        <Card className="animate-slide-up stagger-4 overflow-hidden text-left">
          <CardContent className="divide-y divide-border p-0">
            {exercicios.map((e) => {
              const feitas = seriesFeitas.get(e.id)?.length ?? 0
              return (
                <div key={e.id} className="flex items-center gap-3 px-5 py-3">
                  <div
                    className={`flex h-6 w-6 items-center justify-center rounded-full ${
                      feitas >= e.series
                        ? 'bg-success/15 text-success'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    <Check className="h-3.5 w-3.5" />
                  </div>
                  <span className="flex-1 truncate text-sm font-medium">{e.nome}</span>
                  <span className="text-muted-foreground text-xs">
                    {feitas}/{e.series}
                  </span>
                </div>
              )
            })}
          </CardContent>
        </Card>

        <Button size="lg" className="w-full rounded-xl shadow-sm" onClick={onFinalizar}>
          Concluir
        </Button>
      </div>
    )
  }

  if (!exercicio) return null

  const progressoGeral = totalSeriesGeral > 0 ? (seriesConcluidas / totalSeriesGeral) * 100 : 0

  return (
    <div className="mx-auto max-w-lg space-y-5">
      <header className="flex items-start justify-between gap-3">
        <div key={exercicio.id} className="animate-fade-in">
          <p className="text-primary text-xs font-semibold uppercase tracking-wider">
            Exercício {exercicioAtual + 1} de {exercicios.length}
          </p>
          <h2 className="text-xl font-bold">{exercicio.nome}</h2>
          <p className="text-muted-foreground text-sm capitalize">{exercicio.grupo_muscular}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={sair} title="Sair do treino">
          <X className="h-5 w-5" />
        </Button>
      </header>

      <div className="space-y-1.5">
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${progressoGeral}%` }}
          />
        </div>
        <div className="text-muted-foreground flex justify-between text-[11px]">
          <span>{Math.round(progressoGeral)}% do treino</span>
          <span>{seriesConcluidas}/{totalSeriesGeral} séries</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {Array.from({ length: exercicio.series }).map((_, i) => {
          const done = i < feitasNesteExercicio
          const atual = i === feitasNesteExercicio && !emDescanso
          return (
            <div
              key={i}
              className={`flex h-9 w-9 items-center justify-center rounded-xl border text-sm font-semibold transition-all duration-300 ${
                done
                  ? 'border-success/30 bg-success/15 text-success'
                  : atual
                    ? 'border-primary/40 bg-primary/10 text-primary scale-105'
                    : 'border-border text-muted-foreground'
              }`}
            >
              {done ? <Check className="h-4 w-4" /> : i + 1}
            </div>
          )
        })}
      </div>

      <Card className="overflow-hidden">
        {emDescanso ? (
          <CardContent className="flex flex-col items-center gap-5 p-8">
            <div className="relative h-36 w-36">
              <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90">
                <circle cx="70" cy="70" r={RING_RAIO} fill="none" strokeWidth="9" className="stroke-muted" />
                <circle
                  cx="70"
                  cy="70"
                  r={RING_RAIO}
                  fill="none"
                  strokeWidth="9"
                  strokeLinecap="round"
                  className="stroke-primary transition-all duration-1000 ease-linear"
                  strokeDasharray={RING_CIRC}
                  strokeDashoffset={RING_CIRC * (1 - (pausado ? restante : restante) / (descansoTotal || 1))}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <Clock className="text-primary mb-1 h-4 w-4" />
                <span className="text-3xl font-bold tabular-nums">{formatarTempo(restante)}</span>
              </div>
            </div>

            <p className="text-muted-foreground text-sm">
              Descanso · próxima: Série {feitasNesteExercicio + 1}/{exercicio.series}
            </p>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setPausado((p) => !p)}>
                {pausado ? (
                  <>
                    <Play className="mr-1 h-3.5 w-3.5" /> Retomar
                  </>
                ) : (
                  <>
                    <Pause className="mr-1 h-3.5 w-3.5" /> Pausar
                  </>
                )}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setRestante((r) => r + 15)}>
                <Plus className="mr-1 h-3.5 w-3.5" /> 15s
              </Button>
              <Button variant="outline" size="sm" onClick={() => setRestante((r) => Math.max(0, r - 15))}>
                <Minus className="mr-1 h-3.5 w-3.5" /> 15s
              </Button>
              <Button size="sm" onClick={() => setRestante(0)}>
                Pular
              </Button>
            </div>
          </CardContent>
        ) : (
          <CardContent className="space-y-4 p-6">
            <div className="flex items-center justify-between">
              <span className="font-semibold">
                Série {Math.min(feitasNesteExercicio + 1, exercicio.series)} de {exercicio.series}
              </span>
              <span className="text-muted-foreground flex items-center gap-1 text-sm">
                <Flame className="h-3.5 w-3.5 text-warning" />
                alvo: {exercicio.repeticoes} reps · {exercicio.descanso_segundos}s
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="exec-carga">Carga (kg)</Label>
                <Input
                  id="exec-carga"
                  ref={inputCargaRef}
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.5"
                  placeholder="0"
                  value={carga}
                  onChange={(e) => setCarga(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="exec-reps">Reps feitas</Label>
                <Input
                  id="exec-reps"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  placeholder={exercicio.repeticoes}
                  value={reps}
                  onChange={(e) => setReps(e.target.value)}
                />
              </div>
            </div>

            <Button
              className="w-full rounded-xl shadow-sm transition-transform active:scale-[0.98]"
              size="lg"
              disabled={salvando}
              onClick={() => void registrarSerie()}
            >
              <Check className="mr-2 h-4 w-4" />
              {salvando ? 'Registrando...' : 'Concluir série'}
            </Button>
          </CardContent>
        )}
      </Card>

      {!emDescanso && (
        <Button variant="ghost" className="w-full" onClick={pularExercicio}>
          Pular exercício
          <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      )}
    </div>
  )
}
