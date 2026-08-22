import { useEffect, useState } from 'react'
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useMutation } from '@tanstack/react-query'
import { Q } from '@nozbe/watermelondb'
import { combineLatest } from 'rxjs'
import { colecoes } from '@/database'
import type { RegistroExecucao } from '@/database'
import { executarCicloSync } from '@/sync/engine'

interface LinhaHistorico {
  registro: RegistroExecucao
  nomeExercicio: string
}

interface EstadoHistorico {
  linhas: LinhaHistorico[]
  pendentes: number
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

  return (
    <SafeAreaView style={estilos.container} edges={['top']}>
      <View style={estilos.cabecalho}>
        <Text style={estilos.titulo}>Histórico</Text>
        {pendentes > 0 ? (
          <Pressable
            style={({ pressed }) => [
              estilos.botaoSync,
              pressed && { opacity: 0.8 },
              sincronizar.isPending && { opacity: 0.5 },
            ]}
            onPress={() => sincronizar.mutate()}
            disabled={sincronizar.isPending}
          >
            <Text style={estilos.botaoSyncTexto}>
              {sincronizar.isPending
                ? 'Sincronizando...'
                : `Sincronizar (${pendentes})`}
            </Text>
          </Pressable>
        ) : (
          <Text style={estilos.sincronizadoTexto}>Tudo sincronizado ✓</Text>
        )}
      </View>

      <FlatList
        data={linhas}
        keyExtractor={({ registro }) => registro.id}
        contentContainerStyle={{ padding: 16, gap: 8 }}
        ListEmptyComponent={
          <View style={estilos.vazio}>
            <Text style={estilos.textoVazio}>
              Nenhum registro ainda. Faça seu primeiro treino!
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <LinhaRegistro linha={item} />
        )}
      />
    </SafeAreaView>
  )
}

const FORMATADOR_DATA = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
})

function LinhaRegistro({ linha }: { linha: LinhaHistorico }) {
  const { registro, nomeExercicio } = linha

  return (
    <View style={estilos.linha}>
      <View style={{ flexShrink: 1 }}>
        <Text style={estilos.nome}>{nomeExercicio}</Text>
        <Text style={estilos.detalhe}>
          {registro.cargaUtilizada != null
            ? `${registro.cargaUtilizada} kg`
            : '—'}{' '}
          ·{' '}
          {registro.repeticoesFeitas != null
            ? `${registro.repeticoesFeitas} reps`
            : '—'}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        <Text style={estilos.data}>
          {FORMATADOR_DATA.format(registro.dataRegistro)}
        </Text>
        {!registro.sincronizado ? (
          <Text style={estilos.pendenteChip}>pendente</Text>
        ) : null}
      </View>
    </View>
  )
}

const estilos = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 12,
  },
  titulo: {
    color: '#f8fafc',
    fontSize: 22,
    fontWeight: '800',
  },
  botaoSync: {
    backgroundColor: '#10b981',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  botaoSyncTexto: {
    color: '#052e16',
    fontWeight: '700',
    fontSize: 12,
  },
  sincronizadoTexto: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '600',
  },
  vazio: {
    alignItems: 'center',
    paddingTop: 48,
  },
  textoVazio: {
    color: '#94a3b8',
    textAlign: 'center',
  },
  linha: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  nome: {
    color: '#f8fafc',
    fontWeight: '700',
    fontSize: 15,
  },
  detalhe: {
    color: '#94a3b8',
    fontSize: 13,
    marginTop: 2,
  },
  data: {
    color: '#64748b',
    fontSize: 11,
  },
  pendenteChip: {
    color: '#fbbf24',
    fontSize: 11,
    fontWeight: '700',
  },
})
