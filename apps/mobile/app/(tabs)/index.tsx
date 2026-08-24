import { useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useQuery } from '@tanstack/react-query'
import { useTreinoHoje } from '@/hooks/use-treino-hoje'
import { contarRegistrosPendentes } from '@/sync/registros'
import { TreinoGuiado } from '@/components/treino-guiado'

export default function TreinoScreen() {
  const { treino, itens, carregando } = useTreinoHoje()
  const [emSessao, setEmSessao] = useState(false)

  const pendentes = useQuery({
    queryKey: ['registros-pendentes'],
    queryFn: contarRegistrosPendentes,
  })

  if (carregando) {
    return (
      <SafeAreaView style={estilos.centro}>
        <ActivityIndicator size="large" color="#10b981" />
      </SafeAreaView>
    )
  }

  if (!treino) {
    return (
      <SafeAreaView style={estilos.centro}>
        <View style={estilos.vazioIcone}>
          <Text style={{ fontSize: 36 }}>📋</Text>
        </View>
        <Text style={estilos.tituloVazio}>Nenhum treino ativo</Text>
        <Text style={estilos.textoVazio}>
          Conecte-se a internet para baixar sua ficha. Ela ficara disponivel
          offline depois.
        </Text>
      </SafeAreaView>
    )
  }

  if (emSessao) {
    return (
      <TreinoGuiado titulo={treino.titulo} itens={itens} onSair={() => setEmSessao(false)} />
    )
  }

  return (
    <SafeAreaView style={estilos.container} edges={['top']}>
      <View style={estilos.cabecalho}>
        <View style={estilos.tituloRow}>
          <View style={estilos.tituloBadge}>
            <Text style={estilos.tituloBadgeTexto}>HOJE</Text>
          </View>
          <Text style={estilos.tituloTreino}>{treino.titulo}</Text>
        </View>
        {(pendentes.data ?? 0) > 0 ? (
          <View style={estilos.badgePendente}>
            <Text style={estilos.badgeTexto}>{pendentes.data} pendente(s)</Text>
          </View>
        ) : null}
      </View>

      <View style={estilos.listaResumo}>
        <Text style={estilos.listaTitulo}>
          {itens.length} exercicio{itens.length === 1 ? '' : 's'} na ficha de hoje
        </Text>
        {itens.slice(0, 5).map((item, i) => (
          <View key={item.id} style={estilos.listaLinha}>
            <Text style={estilos.listaIndex}>{i + 1}</Text>
            <Text style={estilos.listaNome} numberOfLines={1}>{item.exercicioNome}</Text>
            <Text style={estilos.listaSerie}>{item.series}×{item.repeticoes}</Text>
          </View>
        ))}
        {itens.length > 5 ? (
          <Text style={estilos.listaMais}>+ {itens.length - 5} outros</Text>
        ) : null}
      </View>

      <Pressable
        style={({ pressed }) => [
          estilos.botaoIniciar,
          pressed && { transform: [{ scale: 0.98 }], opacity: 0.9 },
        ]}
        onPress={() => setEmSessao(true)}
      >
        <Text style={estilos.botaoIniciarEmoji}>▶</Text>
        <Text style={estilos.botaoIniciarTexto}>Iniciar treino</Text>
      </Pressable>

      <Text style={estilos.dica}>
        Modo guiado: um exercicio por vez, com descanso cronometrado entre as series.
      </Text>
    </SafeAreaView>
  )
}

const estilos = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0f1a',
    paddingHorizontal: 20,
    justifyContent: 'center',
    gap: 18,
  },
  centro: {
    flex: 1,
    backgroundColor: '#0a0f1a',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 10,
  },
  vazioIcone: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1f2937',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  tituloVazio: { color: '#f8fafc', fontSize: 20, fontWeight: '700' },
  textoVazio: { color: '#64748b', textAlign: 'center', lineHeight: 22, fontSize: 14 },
  cabecalho: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  tituloRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 },
  tituloBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tituloBadgeTexto: { color: '#10b981', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  tituloTreino: { color: '#f8fafc', fontSize: 24, fontWeight: '800', flexShrink: 1 },
  badgePendente: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeTexto: { color: '#f59e0b', fontSize: 11, fontWeight: '700' },
  listaResumo: {
    backgroundColor: '#111827',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1f2937',
    padding: 16,
    gap: 8,
  },
  listaTitulo: { color: '#64748b', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  listaLinha: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  listaIndex: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    color: '#10b981',
    textAlign: 'center',
    lineHeight: 24,
    fontSize: 12,
    fontWeight: '800',
  },
  listaNome: { color: '#e2e8f0', fontSize: 14, fontWeight: '600', flex: 1 },
  listaSerie: { color: '#64748b', fontSize: 12, fontVariant: ['tabular-nums'] },
  listaMais: { color: '#475569', fontSize: 12, paddingLeft: 34 },
  botaoIniciar: {
    flexDirection: 'row',
    backgroundColor: '#10b981',
    borderRadius: 18,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#10b981',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  botaoIniciarEmoji: { color: '#052e16', fontSize: 16, fontWeight: '900' },
  botaoIniciarTexto: { color: '#052e16', fontSize: 17, fontWeight: '800' },
  dica: { color: '#334155', fontSize: 12, textAlign: 'center', lineHeight: 18, paddingHorizontal: 8 },
})
