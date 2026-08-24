import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  Vibration,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { ItemTreinoLocal } from '@/database'
import { salvarRegistroSincronizando } from '@/sync/engine'

interface TreinoGuiadoProps {
  titulo: string
  itens: ItemTreinoLocal[]
  onSair: () => void
}

interface SerieRegistrada {
  carga: number | null
  reps: number | null
}

export function TreinoGuiado({ titulo, itens, onSair }: TreinoGuiadoProps) {
  const queryClient = useQueryClient()
  const [exercicioAtual, setExercicioAtual] = useState(0)
  const [seriesFeitas, setSeriesFeitas] = useState<Map<string, SerieRegistrada[]>>(new Map())
  const [carga, setCarga] = useState('')
  const [reps, setReps] = useState('')
  const [emDescanso, setEmDescanso] = useState(false)
  const [pausado, setPausado] = useState(false)
  const [restante, setRestante] = useState(0)
  const [descansoTotal, setDescansoTotal] = useState(0)
  const [fase, setFase] = useState<'treino' | 'resumo'>('treino')
  const inputCargaRef = useRef<TextInput>(null)

  const exercicio = itens[exercicioAtual]

  const totalSeriesGeral = useMemo(
    () => itens.reduce((acc, i) => acc + i.series, 0),
    [itens]
  )
  const seriesConcluidas = useMemo(
    () => [...seriesFeitas.values()].reduce((acc, l) => acc + l.length, 0),
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

  const feitasNesteExercicio = exercicio ? (seriesFeitas.get(exercicio.id)?.length ?? 0) : 0

  useEffect(() => {
    if (!emDescanso || pausado) return

    const intervalo = setInterval(() => {
      setRestante((t) => {
        if (t <= 1) {
          clearInterval(intervalo)
          setEmDescanso(false)
          Vibration.vibrate([0, 250, 120, 250])
          setTimeout(() => inputCargaRef.current?.focus(), 80)
          return 0
        }
        return t - 1
      })
    }, 1000)

    return () => clearInterval(intervalo)
  }, [emDescanso, pausado])

  const mutacao = useMutation({
    mutationFn: (novo: {
      itemTreinoRemoteId: string
      cargaUtilizada: number | null
      repeticoesFeitas: number | null
    }) => salvarRegistroSincronizando(novo),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['registros-pendentes'] })
    },
  })

  function registrarSerie() {
    if (!exercicio) return
    const cargaNum = carga.trim() === '' ? null : Number(carga.replace(',', '.'))
    const repsNum = reps.trim() === '' ? null : Number(reps)

    if (cargaNum == null && repsNum == null) return

    mutacao.mutate(
      {
        itemTreinoRemoteId: exercicio.remoteId,
        cargaUtilizada: cargaNum,
        repeticoesFeitas: repsNum,
      },
      {
        onSuccess: () => {
          const novas = new Map(seriesFeitas)
          const lista = novas.get(exercicio.id) ?? []
          novas.set(exercicio.id, [...lista, { carga: cargaNum, reps: repsNum }])
          setSeriesFeitas(novas)
          setCarga('')
          setReps('')

          const feitasDepois = lista.length + 1
          if (feitasDepois < exercicio.series) {
            if (exercicio.descansoSegundos > 0) {
              setDescansoTotal(exercicio.descansoSegundos)
              setRestante(exercicio.descansoSegundos)
              setPausado(false)
              setEmDescanso(true)
            }
          } else if (exercicioAtual < itens.length - 1) {
            setExercicioAtual((e) => e + 1)
          } else {
            setFase('resumo')
            Vibration.vibrate([0, 300, 150, 300])
          }
        },
      }
    )
  }

  function sair() {
    if (seriesConcluidas > 0) {
      Vibration.vibrate(50)
    }
    onSair()
  }

  function formatarTempo(segundos: number): string {
    const m = Math.floor(segundos / 60)
    const s = segundos % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  if (fase === 'resumo') {
    return (
      <SafeAreaView style={estilos.containerResumo} edges={['top']}>
        <ScrollView contentContainerStyle={estilos.resumoConteudo}>
          <View style={estilos.resumoTrofeu}>
            <Text style={{ fontSize: 56 }}>🏆</Text>
          </View>
          <Text style={estilos.resumoTitulo}>Treino concluído!</Text>
          <Text style={estilos.resumoSubtitulo}>{titulo}</Text>

          <View style={estilos.resumoStats}>
            <View style={estilos.statCard}>
              <Text style={estilos.statValor}>{seriesConcluidas}</Text>
              <Text style={estilos.statLabel}>séries</Text>
            </View>
            <View style={estilos.statCard}>
              <Text style={estilos.statValor}>{volumeTotal}<Text style={estilos.statUnidade}>kg</Text></Text>
              <Text style={estilos.statLabel}>volume</Text>
            </View>
            <View style={estilos.statCard}>
              <Text style={estilos.statValor}>{itens.length}</Text>
              <Text style={estilos.statLabel}>exercícios</Text>
            </View>
          </View>

          <View style={estilos.resumoLista}>
            {itens.map((e) => {
              const feitas = seriesFeitas.get(e.id)?.length ?? 0
              return (
                <View key={e.id} style={estilos.resumoLinha}>
                  <Text style={feitas >= e.series ? estilos.resumoCheck : estilos.resumoCheckPendente}>
                    {feitas >= e.series ? '✓' : '·'}
                  </Text>
                  <Text style={estilos.resumoNome} numberOfLines={1}>{e.exercicioNome}</Text>
                  <Text style={estilos.resumoContagem}>{feitas}/{e.series}</Text>
                </View>
              )
            })}
          </View>

          <Pressable
            style={({ pressed }) => [
              estilos.botaoConcluir,
              pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
            ]}
            onPress={onSair}
          >
            <Text style={estilos.botaoConcluirTexto}>Concluir</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    )
  }

  if (!exercicio) return null

  const progressoGeral = totalSeriesGeral > 0 ? (seriesConcluidas / totalSeriesGeral) * 100 : 0
  const descansoProgresso = descansoTotal > 0 ? restante / descansoTotal : 0

  return (
    <SafeAreaView style={estilos.container} edges={['top']}>
      <View style={estilos.header}>
        <View style={{ flex: 1 }}>
          <Text style={estilos.headerKicker}>
            EXERCÍCIO {exercicioAtual + 1} DE {itens.length}
          </Text>
          <Text style={estilos.headerNome} numberOfLines={1}>{exercicio.exercicioNome}</Text>
          <Text style={estilos.headerGrupo}>{exercicio.exercicioGrupoMuscular}</Text>
        </View>
        <Pressable onPress={sair} hitSlop={12} style={estilos.botaoFechar}>
          <Text style={estilos.botaoFecharTexto}>✕</Text>
        </Pressable>
      </View>

      <View style={estilos.progressoFundo}>
        <View style={[estilos.progressoBarra, { width: `${progressoGeral}%` }]} />
      </View>
      <Text style={estilos.progressoTexto}>
        {Math.round(progressoGeral)}% do treino · {seriesConcluidas}/{totalSeriesGeral} séries
      </Text>

      <ScrollView contentContainerStyle={estilos.conteudo}>
        <View style={estilos.seriesRow}>
          {Array.from({ length: exercicio.series }).map((_, i) => {
            const done = i < feitasNesteExercicio
            const atual = i === feitasNesteExercicio && !emDescanso
            return (
              <View
                key={i}
                style={[
                  estilos.seriePill,
                  done && estilos.seriePillDone,
                  atual && estilos.seriePillAtual,
                ]}
              >
                <Text
                  style={[
                    estilos.seriePillTexto,
                    done && estilos.seriePillTextoDone,
                    atual && estilos.seriePillTextoAtual,
                  ]}
                >
                  {done ? '✓' : i + 1}
                </Text>
              </View>
            )
          })}
        </View>

        {emDescanso ? (
          <View style={estilos.cardDescanso}>
            <Text style={estilos.descansoIcon}>⏱️</Text>
            <Text style={estilos.descansoTempo}>{formatarTempo(restante)}</Text>
            <View style={estilos.descansoBarraFundo}>
              <View
                style={[
                  estilos.descansoBarra,
                  { width: `${descansoProgresso * 100}%` },
                ]}
              />
            </View>
            <Text style={estilos.descansoInfo}>
              Próxima: série {Math.min(feitasNesteExercicio + 1, exercicio.series)}/{exercicio.series}
            </Text>

            <View style={estilos.descansoBotoes}>
              <Pressable
                style={({ pressed }) => [estilos.botaoSecundario, pressed && { opacity: 0.7 }]}
                onPress={() => setPausado((p) => !p)}
              >
                <Text style={estilos.botaoSecundarioTexto}>{pausado ? 'Retomar' : 'Pausar'}</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [estilos.botaoSecundario, pressed && { opacity: 0.7 }]}
                onPress={() => setRestante((r) => r + 15)}
              >
                <Text style={estilos.botaoSecundarioTexto}>+15s</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [estilos.botaoPrimarioPequeno, pressed && { opacity: 0.8 }]}
                onPress={() => setRestante(0)}
              >
                <Text style={estilos.botaoPrimarioPequenoTexto}>Pular</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={estilos.cardSerie}>
            <View style={estilos.serieHeader}>
              <Text style={estilos.serieTitulo}>
                Série {Math.min(feitasNesteExercicio + 1, exercicio.series)} de {exercicio.series}
              </Text>
              <Text style={estilos.serieAlvo}>
                alvo: {exercicio.repeticoes} · {exercicio.descansoSegundos}s
              </Text>
            </View>

            <View style={estilos.inputsRow}>
              <TextInput
                ref={inputCargaRef}
                style={estilos.input}
                placeholder="Carga (kg)"
                placeholderTextColor="#475569"
                keyboardType="decimal-pad"
                value={carga}
                onChangeText={setCarga}
              />
              <TextInput
                style={estilos.input}
                placeholder="Reps"
                placeholderTextColor="#475569"
                keyboardType="number-pad"
                value={reps}
                onChangeText={setReps}
              />
            </View>

            <Pressable
              style={({ pressed }) => [
                estilos.botaoRegistrar,
                pressed && { transform: [{ scale: 0.98 }], opacity: 0.9 },
                mutacao.isPending && { opacity: 0.6 },
              ]}
              onPress={registrarSerie}
              disabled={mutacao.isPending}
            >
              {mutacao.isPending ? (
                <ActivityIndicator size="small" color="#052e16" />
              ) : (
                <Text style={estilos.botaoRegistrarTexto}>✓ Concluir série</Text>
              )}
            </Pressable>
          </View>
        )}

        {!emDescanso && (
          <Pressable onPress={() => {
            if (exercicioAtual < itens.length - 1) {
              setExercicioAtual((e) => e + 1)
            } else {
              setFase('resumo')
            }
          }}>
            <Text style={estilos.linkPular}>Pular exercício ›</Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const estilos = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0f1a' },
  containerResumo: { flex: 1, backgroundColor: '#0a0f1a' },
  resumoConteudo: { padding: 24, alignItems: 'center', gap: 16 },
  resumoTrofeu: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  resumoTitulo: { color: '#f8fafc', fontSize: 26, fontWeight: '800' },
  resumoSubtitulo: { color: '#64748b', fontSize: 14 },
  resumoStats: { flexDirection: 'row', gap: 10, alignSelf: 'stretch', marginTop: 8 },
  statCard: {
    flex: 1,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1f2937',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    gap: 2,
  },
  statValor: { color: '#f8fafc', fontSize: 20, fontWeight: '800' },
  statUnidade: { fontSize: 13, fontWeight: '600' },
  statLabel: { color: '#64748b', fontSize: 11 },
  resumoLista: {
    alignSelf: 'stretch',
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1f2937',
    borderRadius: 16,
    overflow: 'hidden',
  },
  resumoLinha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1f2937',
  },
  resumoCheck: { color: '#10b981', fontSize: 15, fontWeight: '800', width: 18, textAlign: 'center' },
  resumoCheckPendente: { color: '#475569', fontSize: 15, fontWeight: '800', width: 18, textAlign: 'center' },
  resumoNome: { color: '#f8fafc', fontSize: 14, fontWeight: '600', flex: 1 },
  resumoContagem: { color: '#64748b', fontSize: 12 },
  botaoConcluir: {
    alignSelf: 'stretch',
    backgroundColor: '#10b981',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  botaoConcluirTexto: { color: '#052e16', fontWeight: '800', fontSize: 16 },

  header: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 20, paddingTop: 12, gap: 12 },
  headerKicker: { color: '#10b981', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  headerNome: { color: '#f8fafc', fontSize: 22, fontWeight: '800', marginTop: 2 },
  headerGrupo: { color: '#64748b', fontSize: 13, textTransform: 'capitalize' },
  botaoFechar: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1f2937',
    justifyContent: 'center',
    alignItems: 'center',
  },
  botaoFecharTexto: { color: '#94a3b8', fontSize: 16, fontWeight: '700' },

  progressoFundo: {
    height: 6,
    backgroundColor: '#1e293b',
    marginHorizontal: 20,
    marginTop: 14,
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressoBarra: { height: 6, backgroundColor: '#10b981', borderRadius: 999 },
  progressoTexto: { color: '#475569', fontSize: 11, paddingHorizontal: 20, marginTop: 6 },

  conteudo: { padding: 20, paddingBottom: 32, gap: 16 },
  seriesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  seriePill: {
    minWidth: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  seriePillDone: { borderColor: 'rgba(16,185,129,0.35)', backgroundColor: 'rgba(16,185,129,0.14)' },
  seriePillAtual: { borderColor: 'rgba(16,185,129,0.45)', backgroundColor: 'rgba(16,185,129,0.08)', transform: [{ scale: 1.06 }] },
  seriePillTexto: { color: '#64748b', fontSize: 14, fontWeight: '700' },
  seriePillTextoDone: { color: '#10b981' },
  seriePillTextoAtual: { color: '#10b981' },

  cardDescanso: {
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1f2937',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    gap: 14,
  },
  descansoIcon: { fontSize: 34 },
  descansoTempo: { color: '#f8fafc', fontSize: 52, fontWeight: '800', fontVariant: ['tabular-nums'] },
  descansoBarraFundo: {
    alignSelf: 'stretch',
    height: 5,
    borderRadius: 999,
    backgroundColor: '#1e293b',
    overflow: 'hidden',
  },
  descansoBarra: { height: 5, backgroundColor: '#10b981', borderRadius: 999 },
  descansoInfo: { color: '#64748b', fontSize: 13 },
  descansoBotoes: { flexDirection: 'row', gap: 8, marginTop: 4 },
  botaoSecundario: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  botaoSecundarioTexto: { color: '#cbd5e1', fontWeight: '600', fontSize: 13 },
  botaoPrimarioPequeno: {
    borderRadius: 10,
    backgroundColor: '#10b981',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  botaoPrimarioPequenoTexto: { color: '#052e16', fontWeight: '800', fontSize: 13 },

  cardSerie: {
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1f2937',
    borderRadius: 20,
    padding: 20,
    gap: 14,
  },
  serieHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  serieTitulo: { color: '#f8fafc', fontSize: 17, fontWeight: '800' },
  serieAlvo: { color: '#f59e0b', fontSize: 12, fontWeight: '600' },
  inputsRow: { flexDirection: 'row', gap: 10 },
  input: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#f8fafc',
    fontSize: 16,
  },
  botaoRegistrar: {
    backgroundColor: '#10b981',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  botaoRegistrarTexto: { color: '#052e16', fontWeight: '800', fontSize: 16 },
  linkPular: { color: '#475569', textAlign: 'center', fontSize: 13, paddingVertical: 6 },
})
