import { useEffect, useMemo, useState } from 'react'
import {
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useMutation } from '@tanstack/react-query'
import { Q } from '@nozbe/watermelondb'
import { combineLatest } from 'rxjs'
import { colecoes } from '@/database'
import type { RegistroExecucao } from '@/database'
import { executarCicloSync } from '@/sync/engine'
import { colors, radius, spacing, typography } from '@/theme'

interface LinhaHistorico {
  registro: RegistroExecucao
  nomeExercicio: string
}

interface EstadoHistorico {
  linhas: LinhaHistorico[]
  pendentes: number
}

interface SecaoHistorico {
  title: string
  data: LinhaHistorico[]
}

function useHistorico(): EstadoHistorico {
  const [estado, setEstado] = useState<EstadoHistorico>({
    linhas: [],
    pendentes: 0,
  })

  useEffect(() => {
    const assinatura = combineLatest(
      colecoes()
        .registros.query(Q.sortBy('data_registro', Q.desc))
        .observe(),
      colecoes().itens.query().observe()
    ).subscribe(([registros, itens]) => {
      const nomes = new Map(itens.map((i) => [i.remoteId, i.exercicioNome]))

      setEstado({
        linhas: registros.slice(0, 100).map((registro) => ({
          registro,
          nomeExercicio:
            nomes.get(registro.itemTreinoRemoteId) ?? 'Exercício removido',
        })),
        pendentes: registros.filter((r) => !r.sincronizado).length,
      })
    })

    return () => assinatura.unsubscribe()
  }, [])

  return estado
}

export default function HistoricoScreen() {
  const { linhas, pendentes } = useHistorico()

  const sincronizar = useMutation({
    mutationFn: () => executarCicloSync(),
  })

  const secoes = useMemo(() => agruparPorDia(linhas), [linhas])
  const volumeTotal = useMemo(
    () =>
      linhas.reduce((total, { registro }) => {
        if (
          registro.cargaUtilizada == null ||
          registro.repeticoesFeitas == null
        ) {
          return total
        }

        return total + registro.cargaUtilizada * registro.repeticoesFeitas
      }, 0),
    [linhas]
  )

  return (
    <SafeAreaView style={estilos.container} edges={['top']}>
      <SectionList
        sections={secoes}
        keyExtractor={({ registro }) => registro.id}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={estilos.conteudo}
        ListHeaderComponent={
          <View style={estilos.headerConteudo}>
            <View style={estilos.cabecalho}>
              <View style={{ flex: 1 }}>
                <Text style={estilos.kicker}>ATIVIDADE</Text>
                <Text style={estilos.titulo}>Histórico</Text>
                <Text style={estilos.subtitulo}>
                  Acompanhe suas séries registradas e a sincronização do aparelho.
                </Text>
              </View>

              <View
                style={[
                  estilos.statusSync,
                  pendentes > 0 && estilos.statusSyncPendente,
                ]}
              >
                <Ionicons
                  name={pendentes > 0 ? 'cloud-upload-outline' : 'cloud-done-outline'}
                  size={18}
                  color={pendentes > 0 ? colors.warning : colors.primary}
                />
              </View>
            </View>

            <View style={estilos.resumoGrid}>
              <ResumoCard
                valor={linhas.length}
                rotulo="registros"
                icone="list-outline"
              />
              <ResumoCard
                valor={Math.round(volumeTotal)}
                rotulo="kg volume"
                icone="barbell-outline"
              />
              <ResumoCard
                valor={pendentes}
                rotulo="pendentes"
                icone="cloud-upload-outline"
                destaque={pendentes > 0}
              />
            </View>

            <View style={estilos.syncCard}>
              <View style={estilos.syncCardIcone}>
                <Ionicons
                  name={pendentes > 0 ? 'sync-outline' : 'checkmark-circle-outline'}
                  size={20}
                  color={pendentes > 0 ? colors.warning : colors.primary}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={estilos.syncCardTitulo}>
                  {pendentes > 0
                    ? `${pendentes} registro${pendentes === 1 ? '' : 's'} aguardando envio`
                    : 'Tudo sincronizado'}
                </Text>
                <Text style={estilos.syncCardTexto}>
                  {pendentes > 0
                    ? 'Seus dados estão salvos no aparelho e serão enviados quando houver conexão.'
                    : 'Seus registros locais estão em dia com a nuvem.'}
                </Text>
              </View>

              {pendentes > 0 ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Sincronizar registros pendentes"
                  style={({ pressed }) => [
                    estilos.botaoSync,
                    pressed && estilos.botaoPressed,
                    sincronizar.isPending && estilos.botaoDesabilitado,
                  ]}
                  onPress={() => sincronizar.mutate()}
                  disabled={sincronizar.isPending}
                >
                  <Ionicons
                    name="refresh"
                    size={17}
                    color={colors.primaryInk}
                  />
                </Pressable>
              ) : null}
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={estilos.vazio}>
            <View style={estilos.vazioIcon}>
              <Ionicons name="time-outline" size={30} color={colors.primary} />
            </View>
            <Text style={estilos.tituloVazio}>Seu histórico começa aqui</Text>
            <Text style={estilos.textoVazio}>
              Conclua sua primeira série para acompanhar carga, repetições e evolução.
            </Text>
          </View>
        }
        renderSectionHeader={({ section }) => (
          <View style={estilos.secaoHeader}>
            <Text style={estilos.secaoTitulo}>{section.title}</Text>
            <Text style={estilos.secaoContagem}>
              {section.data.length} registro{section.data.length === 1 ? '' : 's'}
            </Text>
          </View>
        )}
        renderItem={({ item, index, section }) => (
          <LinhaRegistro
            linha={item}
            index={index}
            ultimo={index === section.data.length - 1}
          />
        )}
        SectionSeparatorComponent={() => <View style={estilos.secaoEspaco} />}
      />
    </SafeAreaView>
  )
}

function agruparPorDia(linhas: LinhaHistorico[]): SecaoHistorico[] {
  const grupos = new Map<string, LinhaHistorico[]>()

  for (const linha of linhas) {
    const data = linha.registro.dataRegistro
    const chave = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`
    const grupo = grupos.get(chave) ?? []
    grupo.push(linha)
    grupos.set(chave, grupo)
  }

  return [...grupos.values()].map((data) => ({
    title: formatarDia(data[0].registro.dataRegistro),
    data,
  }))
}

const FORMATADOR_DIA = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'long',
  day: '2-digit',
  month: 'short',
})

const FORMATADOR_HORA = new Intl.DateTimeFormat('pt-BR', {
  hour: '2-digit',
  minute: '2-digit',
})

function formatarDia(data: Date): string {
  const hoje = new Date()
  const ontem = new Date()
  ontem.setDate(hoje.getDate() - 1)

  const mesmaData = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()

  if (mesmaData(data, hoje)) return 'Hoje'
  if (mesmaData(data, ontem)) return 'Ontem'

  const texto = FORMATADOR_DIA.format(data).replace('.', '')
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

function ResumoCard({
  valor,
  rotulo,
  icone,
  destaque = false,
}: {
  valor: string | number
  rotulo: string
  icone: keyof typeof Ionicons.glyphMap
  destaque?: boolean
}) {
  return (
    <View style={[estilos.resumoCard, destaque && estilos.resumoCardDestaque]}>
      <Ionicons
        name={icone}
        size={16}
        color={destaque ? colors.warning : colors.primary}
      />
      <Text style={estilos.resumoValor}>{valor}</Text>
      <Text style={estilos.resumoRotulo}>{rotulo}</Text>
    </View>
  )
}

function LinhaRegistro({
  linha,
  index,
  ultimo,
}: {
  linha: LinhaHistorico
  index: number
  ultimo: boolean
}) {
  const { registro, nomeExercicio } = linha

  return (
    <View style={[estilos.linha, ultimo && estilos.linhaUltima]}>
      <View style={estilos.timelineColuna}>
        <View
          style={[
            estilos.timelinePonto,
            !registro.sincronizado && estilos.timelinePontoPendente,
          ]}
        />
        {!ultimo ? <View style={estilos.timelineLinha} /> : null}
      </View>

      <View style={estilos.linhaConteudo}>
        <View style={estilos.linhaTopo}>
          <Text style={estilos.nome} numberOfLines={1}>
            {nomeExercicio}
          </Text>
          <Text style={estilos.hora}>
            {FORMATADOR_HORA.format(registro.dataRegistro)}
          </Text>
        </View>

        <View style={estilos.metricasLinha}>
          <View style={estilos.metricaChip}>
            <Ionicons name="barbell-outline" size={14} color={colors.textSecondary} />
            <Text style={estilos.metricaTexto}>
              {registro.cargaUtilizada != null
                ? `${registro.cargaUtilizada} kg`
                : 'Sem carga'}
            </Text>
          </View>
          <View style={estilos.metricaChip}>
            <Ionicons name="repeat-outline" size={14} color={colors.textSecondary} />
            <Text style={estilos.metricaTexto}>
              {registro.repeticoesFeitas != null
                ? `${registro.repeticoesFeitas} reps`
                : 'Sem reps'}
            </Text>
          </View>
        </View>

        <View style={estilos.statusLinha}>
          <Ionicons
            name={registro.sincronizado ? 'cloud-done-outline' : 'cloud-upload-outline'}
            size={13}
            color={registro.sincronizado ? colors.primary : colors.warning}
          />
          <Text
            style={[
              estilos.statusTexto,
              !registro.sincronizado && estilos.statusTextoPendente,
            ]}
          >
            {registro.sincronizado ? 'Sincronizado' : 'Aguardando sincronização'}
          </Text>
          <Text style={estilos.indiceSerie}>#{index + 1}</Text>
        </View>
      </View>
    </View>
  )
}

const estilos = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  conteudo: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: 36,
  },
  headerConteudo: {
    gap: spacing.xl,
    marginBottom: spacing.xxl,
  },
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  kicker: {
    ...typography.label,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  titulo: {
    ...typography.display,
    color: colors.text,
  },
  subtitulo: {
    ...typography.body,
    color: colors.textMuted,
    marginTop: spacing.sm,
    maxWidth: 310,
  },
  statusSync: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusSyncPendente: {
    borderColor: 'rgba(245, 158, 11, 0.28)',
    backgroundColor: colors.warningSoft,
  },
  resumoGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  resumoCard: {
    flex: 1,
    minHeight: 104,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    padding: spacing.md,
    justifyContent: 'space-between',
  },
  resumoCardDestaque: {
    borderColor: 'rgba(245, 158, 11, 0.22)',
  },
  resumoValor: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
    marginTop: spacing.sm,
  },
  resumoRotulo: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  syncCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    padding: spacing.md,
  },
  syncCardIcone: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncCardTitulo: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  syncCardTexto: {
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
  },
  botaoSync: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botaoPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.96 }],
  },
  botaoDesabilitado: {
    opacity: 0.45,
  },
  secaoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  secaoTitulo: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  secaoContagem: {
    color: colors.textFaint,
    fontSize: 11,
    fontWeight: '600',
  },
  secaoEspaco: {
    height: spacing.xxl,
  },
  linha: {
    flexDirection: 'row',
    minHeight: 112,
  },
  linhaUltima: {
    minHeight: 96,
  },
  timelineColuna: {
    width: 24,
    alignItems: 'center',
  },
  timelinePonto: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: colors.primary,
    marginTop: 18,
    borderWidth: 2,
    borderColor: colors.background,
  },
  timelinePontoPendente: {
    backgroundColor: colors.warning,
  },
  timelineLinha: {
    width: 1,
    flex: 1,
    backgroundColor: colors.border,
    marginTop: 3,
  },
  linhaConteudo: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    padding: spacing.md,
    marginBottom: spacing.sm,
    marginLeft: spacing.sm,
  },
  linhaTopo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  nome: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  hora: {
    color: colors.textFaint,
    fontSize: 11,
    fontVariant: ['tabular-nums'],
  },
  metricasLinha: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  metricaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.sm,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  metricaTexto: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  statusLinha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: spacing.md,
  },
  statusTexto: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '700',
  },
  statusTextoPendente: {
    color: colors.warning,
  },
  indiceSerie: {
    marginLeft: 'auto',
    color: colors.textFaint,
    fontSize: 10,
    fontWeight: '700',
  },
  vazio: {
    alignItems: 'center',
    paddingTop: 56,
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  vazioIcon: {
    width: 64,
    height: 64,
    borderRadius: radius.lg,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  tituloVazio: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  textoVazio: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    maxWidth: 300,
  },
})
