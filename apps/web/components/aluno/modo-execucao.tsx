'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Check,
  ChevronRight,
  Clock,
  Dumbbell,
  Pause,
  Play,
  Square,
  Trophy,
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

interface RegistroSerie {
  carga: string
  reps: string
}

interface ModoExecucaoProps {
  exercicios: ExercicioExecucao[]
  onFinalizar: (registros: Map<string, RegistroSerie[]>) => void
  onCancelar: () => void
}

export function ModoExecucao({
  exercicios,
  onFinalizar,
  onCancelar,
}: ModoExecucaoProps) {
  const [exercicioAtual, setExercicioAtual] = useState(0)
  const [serieAtual, setSerieAtual] = useState(1)
  const [registros, setRegistros] = useState<Map<string, RegistroSerie[]>>(
    new Map()
  )
  const [carga, setCarga] = useState('')
  const [reps, setReps] = useState('')
  const [emDescanso, setEmDescanso] = useState(false)
  const [descansoPausado, setDescansoPausado] = useState(false)
  const [tempoRestante, setTempoRestante] = useState(0)
  const [treinoPausado, setTreinoPausado] = useState(false)
  const [finalizado, setFinalizado] = useState(false)

  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const exercicio = exercicios[exercicioAtual]
  const totalExercicios = exercicios.length
  const totalSeries = exercicio?.series ?? 0
  const concluidosNesteExercicio =
    registros.get(exercicio?.id ?? '')?.length ?? 0

  const pararTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  useEffect(() => {
    return () => pararTimer()
  }, [pararTimer])

  useEffect(() => {
    if (!emDescanso || descansoPausado) {
      pararTimer()
      return
    }

    timerRef.current = setInterval(() => {
      setTempoRestante((t) => {
        if (t <= 1) {
          pararTimer()
          setEmDescanso(false)
          setDescansoPausado(false)
          return 0
        }
        return t - 1
      })
    }, 1000)

    return () => pararTimer()
  }, [emDescanso, descansoPausado, pararTimer])

  if (!exercicio || finalizado) {
    return null
  }

  function registrarSerie() {
    if (!carga.trim() && !reps.trim()) return

    const novosRegistros = new Map(registros)
    const lista = novosRegistros.get(exercicio.id) ?? []
    lista.push({ carga: carga.trim(), reps: reps.trim() })
    novosRegistros.set(exercicio.id, lista)
    setRegistros(novosRegistros)
    setCarga('')
    setReps('')

    if (serieAtual < totalSeries) {
      setSerieAtual((s) => s + 1)
      setTempoRestante(exercicio.descanso_segundos)
      setEmDescanso(true)
      setDescansoPausado(false)
    } else {
      proximoExercicio()
    }
  }

  function proximoExercicio() {
    pararTimer()
    setEmDescanso(false)
    setDescansoPausado(false)

    if (exercicioAtual < totalExercicios - 1) {
      setExercicioAtual((e) => e + 1)
      setSerieAtual(1)
    } else {
      setFinalizado(true)
      onFinalizar(registros)
    }
  }

  function pularDescanso() {
    pararTimer()
    setEmDescanso(false)
    setDescansoPausado(false)
  }

  function formatarTempo(segundos: number): string {
    const m = Math.floor(segundos / 60)
    const s = segundos % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const progressoGeral =
    ((exercicioAtual + serieAtual / totalSeries) / totalExercicios) * 100

  if (treinoPausado) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center">
        <Pause className="h-16 w-16 text-muted-foreground" />
        <div>
          <h2 className="text-2xl font-bold">Treino Pausado</h2>
          <p className="text-muted-foreground mt-1">
            Exercício {exercicioAtual + 1} de {totalExercicios} · Série{' '}
            {serieAtual}/{totalSeries}
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={onCancelar}>
            Sair
          </Button>
          <Button onClick={() => setTreinoPausado(false)}>
            <Play className="mr-2 h-4 w-4" /> Continuar
          </Button>
        </div>
      </div>
    )
  }

  if (finalizado) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center">
        <Trophy className="h-16 w-16 text-primary" />
        <div>
          <h2 className="text-2xl font-bold">Treino Concluído!</h2>
          <p className="text-muted-foreground mt-1">
            {totalExercicios} exercício(s) ·{' '}
            {[...registros.values()].reduce((a, b) => a + b.length, 0)}{' '}
            série(s) registrada(s)
          </p>
        </div>
        <Button onClick={() => onFinalizar(registros)}>
          <Check className="mr-2 h-4 w-4" /> Salvar e Voltar
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-muted-foreground text-xs">
            Exercício {exercicioAtual + 1} de {totalExercicios}
          </p>
          <h2 className="text-xl font-bold">{exercicio.nome}</h2>
          <p className="text-muted-foreground text-sm">
            {exercicio.grupo_muscular}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTreinoPausado(true)}
          title="Pausar treino"
        >
          <Pause className="h-5 w-5" />
        </Button>
      </div>

      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${progressoGeral}%` }}
        />
      </div>

      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="flex items-center justify-between">
            <span className="text-lg font-semibold">
              Série {serieAtual} de {totalSeries}
            </span>
            <span className="text-muted-foreground text-sm">
              {exercicio.repeticoes} reps
            </span>
          </div>

          {emDescanso ? (
            <div className="space-y-4 text-center">
              <div className="flex items-center justify-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                <span className="text-4xl font-bold tabular-nums">
                  {formatarTempo(tempoRestante)}
                </span>
              </div>
              <p className="text-muted-foreground text-sm">Descanso</p>
              <div className="flex justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDescansoPausado((p) => !p)}
                >
                  {descansoPausado ? (
                    <>
                      <Play className="mr-1 h-3.5 w-3.5" /> Continuar
                    </>
                  ) : (
                    <>
                      <Pause className="mr-1 h-3.5 w-3.5" /> Pausar
                    </>
                  )}
                </Button>
                <Button variant="outline" size="sm" onClick={pularDescanso}>
                  Pular
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="exec-carga">Carga (kg)</Label>
                  <Input
                    id="exec-carga"
                    type="number"
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
                    placeholder={exercicio.repeticoes}
                    value={reps}
                    onChange={(e) => setReps(e.target.value)}
                  />
                </div>
              </div>
              <Button className="w-full" size="lg" onClick={registrarSerie}>
                <Check className="mr-2 h-4 w-4" /> Registrar Série
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {concluidosNesteExercicio > 0 && (
        <p className="text-muted-foreground text-center text-sm">
          {concluidosNesteExercicio} série(s) concluída(s) neste exercício
        </p>
      )}

      {!emDescanso && exercicioAtual < totalExercicios - 1 && (
        <Button
          variant="ghost"
          className="w-full"
          onClick={proximoExercicio}
        >
          Pular para próximo exercício
          <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      )}

      {exercicioAtual === totalExercicios - 1 &&
        !emDescanso &&
        serieAtual === totalSeries && (
          <Button className="w-full" onClick={() => setFinalizado(true)}>
            <Trophy className="mr-2 h-4 w-4" /> Finalizar Treino
          </Button>
        )}
    </div>
  )
}
