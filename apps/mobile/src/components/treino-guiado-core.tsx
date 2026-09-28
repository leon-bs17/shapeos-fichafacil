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
import { Ionicons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { ItemTreinoLocal } from '@/database'
import { salvarRegistroSincronizando } from '@/sync/engine'
import { colors, radius, spacing, typography } from '@/theme'

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
  const inputRepsRef = useRef<TextInput>(null)

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
    if (cargaNum != null && Number.isNaN(cargaNum)) return
    if (repsNum != null && Number.isNaN(repsNum)) return

    mutacao.mutate(
      {
        itemTreinoRemoteId: exercicio.remoteId,
        cargaUtilizada: cargaNum,
        repeticoesFeitas: repsNum,
      },
      {
        onSuccess: () => {
          Vibration.vibrate(35)
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
            } else {
              setTimeout(() => inputCargaRef.current?.focus(), 80)
            }
          } else if (exercicioAtual < itens.length - 1) {
            setExercicioAtual((e) => e + 1)
            setTimeout(() => inputCargaRef.current?.focus(), 80)
          } else {
            setFase('resumo')
            Vibration.vibrate([0, 300, 150, 300])
          }
        },
      }
    )
  }

  function sair() {
    if (seriesConcluidas > 0) Vibration.vibrate(50)
    onSair()
  }

  function pularExercicio() {
    Vibration.vibrate(25)
    if (exercicioAtual < itens.length - 1) {
      setExercicioAtual((e) => e + 1)
      setCarga('')
      setReps('')
    } else {
      setFase('resumo')
    }
  }

  function encerrarDescanso() {
    setRestante(0)
    setEmDescanso(false)
    setPausado(false)
    Vibration.vibrate(25)
    setTimeout(() => inputCargaRef.current?.focus(), 80)
  }

  function formatarTempo(segundos: number): string {
    const m = Math.floor(segundos / 60)
    const s = segundos % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  if (fase === 'resumo') {
    return (
      <SafeAreaView style={estilos.containerResumo} edges={['top']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={estilos.resumoConteudo}
        >
          <View style={estilos.resumoIcone}>
            <Ionicons name="checkmark" size={38} color={colors.primary} />
          </View>
          <View style={estilos.resumoCabecalho}>
            <Text style={estilos.resumoKicker}>SESSÃO FINALIZADA</Text>
            <Text style={estilos.resumoTitulo}>Treino concluído</Text>
            <Text style={estilos.resumoSubtitulo}>{titulo}</Text>
          </View>

          <View style={estilos.resumoStats}>
            <StatCard valor={seriesConcluidas} rotulo="séries" icone="layers-outline" />
            <StatCard valor={`${volumeTotal} kg`} rotulo="volume" icone="barbell-outline" />
            <StatCard valor={itens.length} rotulo="exercícios" icone="fitness-outline" />
          </View>

          <View style={estilos.resumoLista}>
            <View style={estilos.resumoListaHeader}>
              <Text style={estilos.resumoListaTitulo}>Resumo da sessão</Text>
              <Text style={estilos.resumoListaMeta}>{seriesConcluidas}/{totalSeriesGeral} séries</Text>
            </View>
            {itens.map((item, index) => {
              const feitas = seriesFeitas.get(item.id)?.length ?? 0
              const completo = feitas >= item.series
              return (
                <View key={item.id} style={estilos.resumoLinha}>
                  <View style={[estilos.resumoNumero, completo && estilos.resumoNumeroCompleto]}>
                    {completo ? (
                      <Ionicons name="checkmark" size={14} color={colors.primary} />
                    ) : (
                      <Text style={estilos.resumoNumeroTexto}>{index + 1}</Text>
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={estilos.resumoNome} numberOfLines={1}>
                      {item.exercicioNome}
                    </Text>
                    <Text style={estilos.resumoGrupo} numberOfLines={1}>
                      {item.exercicioGrupoMuscular || 'Exercício'}
                    </Text>
                  </View>
                  <Text style={[estilos.resumoContagem, completo && estilos.resumoContagemCompleta]}>
                    {feitas}/{item.series}
                  </Text>
                </View>
              )
            })}
          </View>

          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [
              estilos.botaoConcluir,
              pressed && estilos.botaoPressed,
            ]}
            onPress={onSair}
          >
            <Text style={estilos.botaoConcluirTexto}>Voltar para o início</Text>
            <Ionicons name="arrow-forward" size={20} color={colors.primaryInk} />
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    )
  }

  if (!exercicio) return null

  const progressoGeral = totalSeriesGeral > 0
    ? (seriesConcluidas / totalSeriesGeral) * 100
    : 0
  const descansoProgresso = descansoTotal > 0 ? restante / descansoTotal : 0
  const serieAtual = Math.min(feitasNesteExercicio + 1, exercicio.series)

  return (
    <SafeAreaView style={estilos.container} edges={['top']}>
      <View style={estilos.header}>
        <View style={{ flex: 1 }}>
          <Text style={estilos.headerKicker}>
            EXERCÍCIO {exercicioAtual + 1} DE {itens.length}
          </Text>
          <Text style={estilos.headerNome} numberOfLines={2}>
            {exercicio.exercicioNome}
          </Text>
          <View style={estilos.headerMetaRow}>
            <Text style={estilos.headerGrupo} numberOfLines={1}>
              {exercicio.exercicioGrupoMuscular || 'Treino'}
            </Text>
            <View style={estilos.metaPonto} />
            <Text style={estilos.headerMeta}>{exercicio.series} séries</Text>
            <View style={estilos.metaPonto} />
            <Text style={estilos.headerMeta}>{exercicio.repeticoes} reps</Text>
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Sair do treino guiado"
          onPress={sair}
          hitSlop={12}
          style={({ pressed }) => [estilos.botaoFechar, pressed && estilos.botaoFecharPressed]}
        >
          <Ionicons name="close" size={21} color={colors.textSecondary} />
        </Pressable>
      </View>

      <View style={estilos.progressoArea}>
        <View style={estilos.progressoLinha}>
          <Text style={estilos.progressoRotulo}>PROGRESSO DO TREINO</Text>
          <Text style={estilos.progressoPercentual}>{Math.round(progressoGeral)}%</Text>
        </View>
        <View style={estilos.progressoFundo}>
          <View style={[estilos.progressoBarra, { width: `${progressoGeral}%` }]} />
        </View>
        <Text style={estilos.progressoTexto}>
          {seriesConcluidas} de {totalSeriesGeral} séries concluídas
        </Text>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={estilos.conteudo}
      >
        <View style={estilos.seriesArea}>
          <View style={estilos.seriesTituloRow}>
            <Text style={estilos.seriesTitulo}>Séries</Text>
            <Text style={estilos.seriesContagem}>{feitasNesteExercicio}/{exercicio.series} feitas</Text>
          </View>
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
                  {done ? (
                    <Ionicons name="checkmark" size={16} color={colors.primary} />
                  ) : (
                    <Text
                      style={[
                        estilos.seriePillTexto,
                        atual && estilos.seriePillTextoAtual,
                      ]}
                    >
                      {i + 1}
                    </Text>
                  )}
                </View>
              )
            })}
          </View>
        </View>

        {emDescanso ? (
          <View style={estilos.cardDescanso}>
            <View style={estilos.descansoTopo}>
              <View style={estilos.descansoIconeWrap}>
                <Ionicons name="timer-outline" size={22} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={estilos.descansoKicker}>DESCANSO</Text>
                <Text style={estilos.descansoTitulo}>
                  {pausado ? 'Cronômetro pausado' : 'Recupere o fôlego'}
                </Text>
              </View>
            </View>

            <Text style={estilos.descansoTempo}>{formatarTempo(restante)}</Text>

            <View style={estilos.descansoBarraFundo}>
              <View
                style={[
                  estilos.descansoBarra,
                  { width: `${descansoProgresso * 100}%` },
                ]}
              />
            </View>

            <View style={estilos.descansoProxima}>
              <Text style={estilos.descansoProximaLabel}>PRÓXIMA</Text>
              <Text style={estilos.descansoProximaTexto}>
                Série {serieAtual} de {exercicio.series}
              </Text>
            </View>

            <View style={estilos.descansoBotoes}>
              <Pressable
                accessibilityRole="button"
                style={({ pressed }) => [
                  estilos.botaoSecundario,
                  pressed && estilos.botaoSecundarioPressed,
                ]}
                onPress={() => setPausado((p) => !p)}
              >
                <Ionicons
                  name={pausado ? 'play' : 'pause'}
                  size={17}
                  color={colors.text}
                />
                <Text style={estilos.botaoSecundarioTexto}>
                  {pausado ? 'Retomar' : 'Pausar'}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                style={({ pressed }) => [
                  estilos.botaoSecundario,
                  pressed && estilos.botaoSecundarioPressed,
                ]}
                onPress={() => setRestante((r) => r + 15)}
              >
                <Ionicons name="add" size={18} color={colors.text} />
                <Text style={estilos.botaoSecundarioTexto}>15s</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                style={({ pressed }) => [
                  estilos.botaoPularDescanso,
                  pressed && estilos.botaoPressed,
                ]}
                onPress={encerrarDescanso}
              >
                <Text style={estilos.botaoPularDescansoTexto}>Pular</Text>
                <Ionicons name="play-skip-forward" size={16} color={colors.primaryInk} />
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={estilos.cardSerie}>
            <View style={estilos.serieHeader}>
              <View>
                <Text style={estilos.serieKicker}>SÉRIE ATUAL</Text>
                <Text style={estilos.serieTitulo}>
                  Série {serieAtual} de {exercicio.series}
                </Text>
              </View>
              <View style={estilos.alvoBadge}>
                <Ionicons name="flag-outline" size={14} color={colors.warning} />
                <Text style={estilos.serieAlvo}>{exercicio.repeticoes} reps</Text>
              </View>
            </View>

            <View style={estilos.inputsRow}>
              <View style={estilos.inputGrupo}>
                <Text style={estilos.inputLabel}>CARGA</Text>
                <View style={estilos.inputShell}>
                  <TextInput
                    ref={inputCargaRef}
                    style={estilos.input}
                    placeholder="0"
                    placeholderTextColor={colors.textFaint}
                    keyboardType="decimal-pad"
                    returnKeyType="next"
                    value={carga}
                    onChangeText={setCarga}
                    onSubmitEditing={() => inputRepsRef.current?.focus()}
                    selectTextOnFocus
                  />
                  <Text style={estilos.inputUnidade}>kg</Text>
                </View>
              </View>

              <View style={estilos.inputGrupo}>
                <Text style={estilos.inputLabel}>REPETIÇÕES</Text>
                <View style={estilos.inputShell}>
                  <TextInput
                    ref={inputRepsRef}
                    style={estilos.input}
                    placeholder="0"
                    placeholderTextColor={colors.textFaint}
                    keyboardType="number-pad"
                    value={reps}
                    onChangeText={setReps}
                    selectTextOnFocus
                  />
                  <Text style={estilos.inputUnidade}>reps</Text>
                </View>
              </View>
            </View>

            <View style={estilos.descansoMeta}>
              <Ionicons name="timer-outline" size={16} color={colors.textMuted} />
              <Text style={estilos.descansoMetaTexto}>
                Descanso programado: {exercicio.descansoSegundos}s
              </Text>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Concluir série ${serieAtual}`}
              style={({ pressed }) => [
                estilos.botaoRegistrar,
                pressed && estilos.botaoPressed,
                mutacao.isPending && estilos.botaoDesabilitado,
              ]}
              onPress={registrarSerie}
              disabled={mutacao.isPending}
            >
              {mutacao.isPending ? (
                <ActivityIndicator size="small" color={colors.primaryInk} />
              ) : (
                <>
                  <View style={estilos.botaoRegistrarIcone}>
                    <Ionicons name="checkmark" size={18} color={colors.primaryInk} />
                  </View>
                  <Text style={estilos.botaoRegistrarTexto}>Concluir série</Text>
                  <Ionicons name="arrow-forward" size={19} color={colors.primaryInk} />
                </>
              )}
            </Pressable>
          </View>
        )}

        {!emDescanso ? (
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [
              estilos.botaoPularExercicio,
              pressed && { opacity: 0.7 },
            ]}
            onPress={pularExercicio}
          >
            <Text style={estilos.botaoPularExercicioTexto}>Pular exercício</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  )
}

function StatCard({
  valor,
  rotulo,
  icone,
}: {
  valor: string | number
  rotulo: string
  icone: keyof typeof Ionicons.glyphMap
}) {
  return (
    <View style={estilos.statCard}>
      <Ionicons name={icone} size={17} color={colors.primary} />
      <Text style={estilos.statValor} numberOfLines={1}>{valor}</Text>
      <Text style={estilos.statLabel}>{rotulo}</Text>
    </View>
  )
}

const estilos = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  containerResumo: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    gap: spacing.md,
  },
  headerKicker: {
    ...typography.label,
    color: colors.primary,
  },
  headerNome: {
    color: colors.text,
    fontSize: 25,
    lineHeight: 30,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginTop: 4,
  },
  headerMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 7,
  },
  headerGrupo: {
    color: colors.textSecondary,
    fontSize: 13,
    textTransform: 'capitalize',
    maxWidth: 130,
  },
  headerMeta: {
    color: colors.textMuted,
    fontSize: 12,
  },
  metaPonto: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.textFaint,
  },
  botaoFechar: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  botaoFecharPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.96 }],
  },
  progressoArea: {
    paddingHorizontal: spacing.xl,
    marginTop: spacing.xl,
  },
  progressoLinha: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressoRotulo: {
    ...typography.label,
    color: colors.textMuted,
    fontSize: 10,
  },
  progressoPercentual: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  progressoFundo: {
    height: 7,
    backgroundColor: colors.borderSoft,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  progressoBarra: {
    height: 7,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
  },
  progressoTexto: {
    color: colors.textFaint,
    fontSize: 11,
    marginTop: 7,
  },
  conteudo: {
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
    gap: spacing.xl,
  },
  seriesArea: {
    gap: spacing.md,
  },
  seriesTituloRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  seriesTitulo: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  seriesContagem: {
    color: colors.textFaint,
    fontSize: 11,
  },
  seriesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  seriePill: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSubtle,
    justifyContent: 'center',
    alignItems: 'center',
  },
  seriePillDone: {
    borderColor: colors.primaryBorder,
    backgroundColor: colors.primarySoft,
  },
  seriePillAtual: {
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  seriePillTexto: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '700',
  },
  seriePillTextoAtual: {
    color: colors.primary,
  },
  cardSerie: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.xl,
  },
  serieHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  serieKicker: {
    ...typography.label,
    color: colors.primary,
    fontSize: 10,
  },
  serieTitulo: {
    color: colors.text,
    fontSize: 21,
    fontWeight: '800',
    letterSpacing: -0.35,
    marginTop: 3,
  },
  alvoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.warningSoft,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  serieAlvo: {
    color: colors.warning,
    fontSize: 12,
    fontWeight: '700',
  },
  inputsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  inputGrupo: {
    flex: 1,
    gap: 7,
  },
  inputLabel: {
    ...typography.label,
    color: colors.textMuted,
    fontSize: 10,
  },
  inputShell: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    paddingVertical: 14,
  },
  inputUnidade: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  descansoMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: -4,
  },
  descansoMetaTexto: {
    color: colors.textMuted,
    fontSize: 12,
  },
  botaoRegistrar: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  botaoRegistrarIcone: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: 'rgba(2, 44, 34, 0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  botaoRegistrarTexto: {
    flex: 1,
    color: colors.primaryInk,
    fontWeight: '800',
    fontSize: 16,
  },
  botaoPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },
  botaoDesabilitado: {
    opacity: 0.55,
  },
  botaoPularExercicio: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  botaoPularExercicioTexto: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  cardDescanso: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    borderRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.xl,
  },
  descansoTopo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  descansoIconeWrap: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  descansoKicker: {
    ...typography.label,
    color: colors.primary,
    fontSize: 10,
  },
  descansoTitulo: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
    marginTop: 2,
  },
  descansoTempo: {
    color: colors.text,
    fontSize: 64,
    lineHeight: 70,
    fontWeight: '800',
    letterSpacing: -2,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  descansoBarraFundo: {
    height: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.borderSoft,
    overflow: 'hidden',
  },
  descansoBarra: {
    height: 7,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
  },
  descansoProxima: {
    alignItems: 'center',
    gap: 3,
  },
  descansoProximaLabel: {
    ...typography.label,
    color: colors.textFaint,
    fontSize: 9,
  },
  descansoProximaTexto: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
  descansoBotoes: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  botaoSecundario: {
    minHeight: 44,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: spacing.sm,
  },
  botaoSecundarioPressed: {
    opacity: 0.7,
    backgroundColor: colors.surfaceElevated,
  },
  botaoSecundarioTexto: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 12,
  },
  botaoPularDescanso: {
    minHeight: 44,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
  },
  botaoPularDescansoTexto: {
    color: colors.primaryInk,
    fontWeight: '800',
    fontSize: 12,
  },
  resumoConteudo: {
    padding: spacing.xxl,
    paddingBottom: 40,
    alignItems: 'center',
    gap: spacing.xl,
  },
  resumoIcone: {
    width: 88,
    height: 88,
    borderRadius: 28,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  resumoCabecalho: {
    alignItems: 'center',
    gap: 5,
  },
  resumoKicker: {
    ...typography.label,
    color: colors.primary,
  },
  resumoTitulo: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.6,
    textAlign: 'center',
  },
  resumoSubtitulo: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
  resumoStats: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignSelf: 'stretch',
  },
  statCard: {
    flex: 1,
    minWidth: 0,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    gap: 4,
  },
  statValor: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: 11,
  },
  resumoLista: {
    alignSelf: 'stretch',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radius.xl,
    overflow: 'hidden',
  },
  resumoListaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  resumoListaTitulo: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  resumoListaMeta: {
    color: colors.textFaint,
    fontSize: 11,
  },
  resumoLinha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSoft,
  },
  resumoNumero: {
    width: 30,
    height: 30,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resumoNumeroCompleto: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primaryBorder,
  },
  resumoNumeroTexto: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
  },
  resumoNome: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  resumoGrupo: {
    color: colors.textFaint,
    fontSize: 11,
    marginTop: 2,
    textTransform: 'capitalize',
  },
  resumoContagem: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  resumoContagemCompleta: {
    color: colors.primary,
  },
  botaoConcluir: {
    alignSelf: 'stretch',
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
  },
  botaoConcluirTexto: {
    color: colors.primaryInk,
    fontWeight: '800',
    fontSize: 16,
  },
})
