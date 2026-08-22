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
      setValores((atual) => ({ ...atual, [novo.itemTreinoRemoteId]: { carga: '', reps: '' } }))
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
        <Text style={estilos.tituloVazio}>Nenhum treino ativo</Text>
        <Text style={estilos.textoVazio}>
          Conecte-se à internet para baixar sua ficha. Ela ficará disponível
          offline depois.
        </Text>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={estilos.container} edges={['top']}>
      <View style={estilos.cabecalho}>
        <Text style={estilos.tituloTreino}>{treino.titulo}</Text>
        {(pendentes.data ?? 0) > 0 ? (
          <View style={estilos.badgePendente}>
            <Text style={estilos.badgeTexto}>
              {pendentes.data} aguardando sync
            </Text>
          </View>
        ) : null}
      </View>

      <FlatList
        data={itens}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        renderItem={({ item }) => (
          <CartaoExercicio
            item={item}
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
  valor,
  onChange,
  onRegistrar,
  ocupado,
}: {
  item: ItemTreinoLocal
  valor: ValorSerie
  onChange: (v: ValorSerie) => void
  onRegistrar: () => void
  ocupado: boolean
}) {
  return (
    <View style={estilos.cartao}>
      <Text style={estilos.nomeExercicio}>{item.exercicioNome}</Text>
      <Text style={estilos.detalheExercicio}>
        {item.series} × {item.repeticoes} · descanso {item.descansoSegundos}s ·{' '}
        {item.exercicioGrupoMuscular}
      </Text>

      <View style={estilos.linhaInputs}>
        <TextInput
          style={estilos.input}
          placeholder="Carga (kg)"
          placeholderTextColor="#64748b"
          keyboardType="decimal-pad"
          value={valor.carga}
          onChangeText={(carga) => onChange({ ...valor, carga })}
        />
        <TextInput
          style={estilos.input}
          placeholder="Reps"
          placeholderTextColor="#64748b"
          keyboardType="number-pad"
          value={valor.reps}
          onChangeText={(reps) => onChange({ ...valor, reps })}
        />
        <Pressable
          style={({ pressed }) => [
            estilos.botaoRegistrar,
            pressed && { opacity: 0.8 },
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
    backgroundColor: '#0f172a',
  },
  centro: {
    flex: 1,
    backgroundColor: '#0f172a',
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
  },
  tituloTreino: {
    color: '#f8fafc',
    fontSize: 22,
    fontWeight: '800',
    flexShrink: 1,
  },
  badgePendente: {
    backgroundColor: '#f59e0b',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeTexto: {
    color: '#451a03',
    fontSize: 11,
    fontWeight: '700',
  },
  cartao: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  nomeExercicio: {
    color: '#f8fafc',
    fontSize: 17,
    fontWeight: '700',
  },
  detalheExercicio: {
    color: '#94a3b8',
    fontSize: 13,
  },
  linhaInputs: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  input: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#f8fafc',
    fontSize: 15,
  },
  botaoRegistrar: {
    width: 48,
    backgroundColor: '#10b981',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  botaoRegistrarTexto: {
    color: '#052e16',
    fontSize: 20,
    fontWeight: '800',
  },
  tituloVazio: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: '700',
  },
  textoVazio: {
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 20,
  },
})
