import { useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ItemTreinoLocal } from '@/database'
import { useTreinoHoje } from '@/hooks/use-treino-hoje'
import {
  contarRegistrosPendentes,
  type NovoRegistro,
} from '@/sync/registros'
import { salvarRegistroSincronizando } from '@/sync/engine'

interface ValorSerie {
  carga: string
  reps: string
}

export default function TreinoScreen() {
  const { treino, itens, carregando } = useTreinoHoje()
  const [valores, setValores] = useState<Record<string, ValorSerie>>({})
  const queryClient = useQueryClient()

  const pendentes = useQuery({
    queryKey: ['registros-pendentes'],
    queryFn: contarRegistrosPendentes,
  })

  const mutacao = useMutation({
    mutationFn: (novo: NovoRegistro) => salvarRegistroSincronizando(novo),
    onSuccess: (_data, novo) => {
      setValores((atual) => ({
        ...atual,
        [novo.itemTreinoRemoteId]: { carga: '', reps: '' },
      }))
      void pendentes.refetch()
    },
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
        <View style={estilos.vazioIcon}>
          <Text style={estilos.vazioEmoji}>📋</Text>
        </View>
        <Text style={estilos.tituloVazio}>Nenhum treino ativo</Text>
        <Text style={estilos.textoVazio}>
          Conecte-se a internet para baixar sua ficha. Ela ficara disponivel
          offline depois.
        </Text>
      </SafeAreaView>
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
            <Text style={estilos.badgeTexto}>
              {pendentes.data} pendente(s)
            </Text>
          </View>
        ) : null}
      </View>

      <FlatList
        data={itens}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 32 }}
        renderItem={({ item, index }) => (
          <CartaoExercicio
            item={item}
            index={index}
            valor={valores[item.id] ?? { carga: '', reps: '' }}
            onChange={(v) =>
              setValores((atual) => ({ ...atual, [item.id]: v }))
            }
            onRegistrar={() =>
              mutacao.mutate({
                itemTreinoRemoteId: item.remoteId,
                cargaUtilizada: valores[item.id]?.carga
                  ? Number(valores[item.id].carga.replace(',', '.'))
                  : null,
                repeticoesFeitas: valores[item.id]?.reps
                  ? Number(valores[item.id].reps)
                  : null,
              })
            }
            ocupado={
              mutacao.isPending &&
              mutacao.variables?.itemTreinoRemoteId === item.remoteId
            }
          />
        )}
      />
    </SafeAreaView>
  )
}

function CartaoExercicio({
  item,
  index,
  valor,
  onChange,
  onRegistrar,
  ocupado,
}: {
  item: ItemTreinoLocal
  index: number
  valor: ValorSerie
  onChange: (v: ValorSerie) => void
  onRegistrar: () => void
  ocupado: boolean
}) {
  return (
    <View style={estilos.cartao}>
      <View style={estilos.cartaoHeader}>
        <View style={estilos.cartaoIndex}>
          <Text style={estilos.cartaoIndexTexto}>{index + 1}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={estilos.nomeExercicio}>{item.exercicioNome}</Text>
          <Text style={estilos.grupoMuscular}>
            {item.exercicioGrupoMuscular}
          </Text>
        </View>
      </View>

      <View style={estilos.seriesInfo}>
        <View style={estilos.seriesItem}>
          <Text style={estilos.seriesLabel}>Series</Text>
          <Text style={estilos.seriesValue}>{item.series}</Text>
        </View>
        <View style={estilos.seriesDivider} />
        <View style={estilos.seriesItem}>
          <Text style={estilos.seriesLabel}>Reps</Text>
          <Text style={estilos.seriesValue}>{item.repeticoes}</Text>
        </View>
        <View style={estilos.seriesDivider} />
        <View style={estilos.seriesItem}>
          <Text style={estilos.seriesLabel}>Descanso</Text>
          <Text style={estilos.seriesValue}>{item.descansoSegundos}s</Text>
        </View>
      </View>

      <View style={estilos.linhaInputs}>
        <TextInput
          style={estilos.input}
          placeholder="Carga (kg)"
          placeholderTextColor="#475569"
          keyboardType="decimal-pad"
          value={valor.carga}
          onChangeText={(carga) => onChange({ ...valor, carga })}
        />
        <TextInput
          style={estilos.input}
          placeholder="Reps"
          placeholderTextColor="#475569"
          keyboardType="number-pad"
          value={valor.reps}
          onChangeText={(reps) => onChange({ ...valor, reps })}
        />
        <Pressable
          style={({ pressed }) => [
            estilos.botaoRegistrar,
            pressed && { opacity: 0.8, transform: [{ scale: 0.95 }] },
          ]}
          onPress={onRegistrar}
          disabled={ocupado}
        >
          {ocupado ? (
            <ActivityIndicator size="small" color="#052e16" />
          ) : (
            <Text style={estilos.botaoRegistrarTexto}>✓</Text>
          )}
        </Pressable>
      </View>
    </View>
  )
}

const estilos = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0f1a',
  },
  centro: {
    flex: 1,
    backgroundColor: '#0a0f1a',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 8,
  },
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  tituloRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 1,
  },
  tituloBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tituloBadgeTexto: {
    color: '#10b981',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  tituloTreino: {
    color: '#f8fafc',
    fontSize: 22,
    fontWeight: '800',
    flexShrink: 1,
  },
  badgePendente: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeTexto: {
    color: '#f59e0b',
    fontSize: 11,
    fontWeight: '700',
  },
  cartao: {
    backgroundColor: '#111827',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1f2937',
    padding: 16,
    gap: 12,
  },
  cartaoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cartaoIndex: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartaoIndexTexto: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: '800',
  },
  nomeExercicio: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '700',
  },
  grupoMuscular: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 1,
  },
  seriesInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 12,
  },
  seriesItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  seriesLabel: {
    color: '#475569',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  seriesValue: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '700',
  },
  seriesDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#1e293b',
  },
  linhaInputs: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#f8fafc',
    fontSize: 15,
  },
  botaoRegistrar: {
    width: 52,
    backgroundColor: '#10b981',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  botaoRegistrarTexto: {
    color: '#052e16',
    fontSize: 22,
    fontWeight: '800',
  },
  vazioIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1f2937',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  vazioEmoji: {
    fontSize: 36,
  },
  tituloVazio: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: '700',
  },
  textoVazio: {
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
    fontSize: 14,
  },
})
