import { useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useQuery } from '@tanstack/react-query'
import { useTreinoHoje } from '@/hooks/use-treino-hoje'
import { contarRegistrosPendentes } from '@/sync/registros'
import { TreinoGuiado } from '@/components/treino-guiado'
import { colors, radius, spacing, typography } from '@/theme'

export default function TreinoScreen() {
  const { treino, itens, carregando } = useTreinoHoje()
  const [emSessao, setEmSessao] = useState(false)

  const pendentes = useQuery({
    queryKey: ['registros-pendentes'],
    queryFn: contarRegistrosPendentes,
  })

  const totalSeries = useMemo(
    () => itens.reduce((total, item) => total + item.series, 0),
    [itens]
  )

  if (carregando) {
    return (
      <SafeAreaView style={estilos.centro}>
        <View style={estilos.loadingIcon}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
        <Text style={estilos.loadingTitulo}>Preparando seu treino</Text>
        <Text style={estilos.loadingTexto}>Carregando sua ficha salva no aparelho.</Text>
      </SafeAreaView>
    )
  }

  if (!treino) {
    return (
      <SafeAreaView style={estilos.centro}>
        <View style={estilos.vazioIcone}>
          <Ionicons name="barbell-outline" size={30} color={colors.primary} />
        </View>
        <Text style={estilos.tituloVazio}>Nenhum treino ativo</Text>
        <Text style={estilos.textoVazio}>
          Conecte-se à internet para baixar sua ficha. Depois disso, ela ficará disponível offline.
        </Text>
      </SafeAreaView>
    )
  }

  if (emSessao) {
    return (
      <TreinoGuiado titulo={treino.titulo} itens={itens} onSair={() => setEmSessao(false)} />
    )
  }

  const registrosPendentes = pendentes.data ?? 0

  return (
    <SafeAreaView style={estilos.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={estilos.conteudo}
      >
        <View style={estilos.topo}>
          <View>
            <Text style={estilos.kicker}>SHAPEOS</Text>
            <Text style={estilos.tituloPagina}>Treino de hoje</Text>
          </View>
          <View
            style={[
              estilos.syncStatus,
              registrosPendentes > 0 && estilos.syncStatusPendente,
            ]}
          >
            <Ionicons
              name={registrosPendentes > 0 ? 'cloud-upload-outline' : 'cloud-done-outline'}
              size={16}
              color={registrosPendentes > 0 ? colors.warning : colors.primary}
            />
            <Text
              style={[
                estilos.syncStatusTexto,
                registrosPendentes > 0 && estilos.syncStatusTextoPendente,
              ]}
            >
              {registrosPendentes > 0 ? `${registrosPendentes} pendente(s)` : 'Offline pronto'}
            </Text>
          </View>
        </View>

        <View style={estilos.hero}>
          <View style={estilos.heroGlow} />
          <View style={estilos.heroTopo}>
            <View style={estilos.badgeHoje}>
              <Ionicons name="flash" size={12} color={colors.primary} />
              <Text style={estilos.badgeHojeTexto}>HOJE</Text>
            </View>
            <View style={estilos.heroIcone}>
              <Ionicons name="barbell" size={22} color={colors.primary} />
            </View>
          </View>

          <Text style={estilos.tituloTreino}>{treino.titulo}</Text>
          <Text style={estilos.heroDescricao}>
            Sua ficha está pronta. Registre carga e repetições durante cada série.
          </Text>

          <View style={estilos.metricas}>
            <Metrica valor={itens.length} rotulo="exercícios" icone="fitness-outline" />
            <View style={estilos.metricaDivisor} />
            <Metrica valor={totalSeries} rotulo="séries" icone="layers-outline" />
            <View style={estilos.metricaDivisor} />
            <Metrica valor="offline" rotulo="disponível" icone="wifi-outline" />
          </View>
        </View>

        <View style={estilos.secaoCabecalho}>
          <View>
            <Text style={estilos.secaoTitulo}>Sua sequência</Text>
            <Text style={estilos.secaoSubtitulo}>Prévia da ficha de hoje</Text>
          </View>
          <Text style={estilos.secaoContagem}>{itens.length} total</Text>
        </View>

        <View style={estilos.listaResumo}>
          {itens.slice(0, 5).map((item, i) => (
            <View key={item.id} style={estilos.listaLinha}>
              <View style={estilos.listaIndexWrap}>
                <Text style={estilos.listaIndex}>{String(i + 1).padStart(2, '0')}</Text>
              </View>
              <View style={estilos.listaTexto}>
                <Text style={estilos.listaNome} numberOfLines={1}>
                  {item.exercicioNome}
                </Text>
                <Text style={estilos.listaMeta} numberOfLines={1}>
                  {item.exercicioGrupoMuscular || 'Exercício'}
                </Text>
              </View>
              <View style={estilos.serieBadge}>
                <Text style={estilos.listaSerie}>{item.series} × {item.repeticoes}</Text>
              </View>
            </View>
          ))}

          {itens.length > 5 ? (
            <View style={estilos.listaMaisRow}>
              <Ionicons name="ellipsis-horizontal" size={18} color={colors.textMuted} />
              <Text style={estilos.listaMais}>Mais {itens.length - 5} exercício(s) no treino</Text>
            </View>
          ) : null}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Iniciar treino de hoje"
          style={({ pressed }) => [
            estilos.botaoIniciar,
            pressed && estilos.botaoIniciarPressed,
          ]}
          onPress={() => setEmSessao(true)}
        >
          <View style={estilos.botaoIcone}>
            <Ionicons name="play" size={20} color={colors.primaryInk} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={estilos.botaoIniciarTexto}>Iniciar treino</Text>
            <Text style={estilos.botaoIniciarSubtexto}>Modo guiado, série por série</Text>
          </View>
          <Ionicons name="arrow-forward" size={21} color={colors.primaryInk} />
        </Pressable>

        <View style={estilos.dicaCard}>
          <Ionicons name="information-circle-outline" size={18} color={colors.textSecondary} />
          <Text style={estilos.dica}>
            O treino funciona sem internet e sincroniza seus registros automaticamente quando a conexão voltar.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

function Metrica({
  valor,
  rotulo,
  icone,
}: {
  valor: string | number
  rotulo: string
  icone: keyof typeof Ionicons.glyphMap
}) {
  return (
    <View style={estilos.metrica}>
      <Ionicons name={icone} size={16} color={colors.primary} />
      <Text style={estilos.metricaValor}>{valor}</Text>
      <Text style={estilos.metricaRotulo}>{rotulo}</Text>
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
    gap: spacing.xl,
  },
  centro: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xxxl,
    gap: spacing.sm,
  },
  loadingIcon: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  loadingTitulo: {
    color: colors.text,
    ...typography.subtitle,
  },
  loadingTexto: {
    color: colors.textMuted,
    ...typography.caption,
    textAlign: 'center',
  },
  vazioIcone: {
    width: 72,
    height: 72,
    borderRadius: radius.lg,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  tituloVazio: {
    color: colors.text,
    ...typography.title,
    fontSize: 20,
  },
  textoVazio: {
    color: colors.textMuted,
    textAlign: 'center',
    ...typography.body,
  },
  topo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  kicker: {
    color: colors.primary,
    ...typography.label,
    marginBottom: spacing.xs,
  },
  tituloPagina: {
    color: colors.text,
    ...typography.display,
  },
  syncStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: radius.pill,
  },
  syncStatusPendente: {
    backgroundColor: colors.warningSoft,
    borderColor: 'rgba(245, 158, 11, 0.24)',
  },
  syncStatusTexto: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  syncStatusTextoPendente: {
    color: colors.warning,
  },
  hero: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    padding: spacing.xl,
    gap: spacing.md,
  },
  heroGlow: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    right: -70,
    top: -90,
  },
  heroTopo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badgeHoje: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  badgeHojeTexto: {
    color: colors.primary,
    ...typography.label,
    fontSize: 10,
  },
  heroIcone: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tituloTreino: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  heroDescricao: {
    color: colors.textSecondary,
    ...typography.body,
    maxWidth: 320,
  },
  metricas: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    marginTop: spacing.xs,
  },
  metrica: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  metricaValor: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
    marginTop: 2,
    textTransform: 'capitalize',
  },
  metricaRotulo: {
    color: colors.textMuted,
    fontSize: 10,
  },
  metricaDivisor: {
    width: 1,
    height: 34,
    backgroundColor: colors.borderSoft,
  },
  secaoCabecalho: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  secaoTitulo: {
    color: colors.text,
    ...typography.subtitle,
  },
  secaoSubtitulo: {
    color: colors.textMuted,
    ...typography.caption,
    marginTop: 2,
  },
  secaoContagem: {
    color: colors.textFaint,
    fontSize: 11,
    fontWeight: '700',
  },
  listaResumo: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    overflow: 'hidden',
  },
  listaLinha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSoft,
  },
  listaIndexWrap: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listaIndex: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '800',
  },
  listaTexto: {
    flex: 1,
    gap: 2,
  },
  listaNome: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  listaMeta: {
    color: colors.textMuted,
    fontSize: 11,
    textTransform: 'capitalize',
  },
  serieBadge: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  listaSerie: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  listaMaisRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.md,
  },
  listaMais: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  botaoIniciar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    shadowColor: colors.primary,
    shadowOpacity: 0.2,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  botaoIniciarPressed: {
    transform: [{ scale: 0.985 }],
    opacity: 0.92,
  },
  botaoIcone: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: 'rgba(2, 44, 34, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  botaoIniciarTexto: {
    color: colors.primaryInk,
    fontSize: 17,
    fontWeight: '900',
  },
  botaoIniciarSubtexto: {
    color: 'rgba(2, 44, 34, 0.72)',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  dicaCard: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
    paddingHorizontal: spacing.sm,
  },
  dica: {
    flex: 1,
    color: colors.textMuted,
    ...typography.caption,
  },
})
