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
            nomes.get(registro.itemTreinoRemoteId) ?? 'Exercicio removido',
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
        <View style={estilos.tituloRow}>
          <Text style={estilos.titulo}>Historico</Text>
          {pendentes > 0 ? (
            <View style={estilos.pendenteCount}>
              <Text style={estilos.pendenteCountTexto}>{pendentes}</Text>
            </View>
          ) : null}
        </View>
        {pendentes > 0 ? (
          <Pressable
            style={({ pressed }) => [
              estilos.botaoSync,
              pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
              sincronizar.isPending && { opacity: 0.5 },
            ]}
            onPress={() => sincronizar.mutate()}
            disabled={sincronizar.isPending}
          >
            <Text style={estilos.botaoSyncTexto}>
              {sincronizar.isPending ? 'Sincronizando...' : 'Sincronizar'}
            </Text>
          </Pressable>
        ) : (
          <View style={estilos.syncOk}>
            <Text style={estilos.syncOkTexto}>Tudo sincronizado ✓</Text>
          </View>
        )}
      </View>

      <FlatList
        data={linhas}
        keyExtractor={({ registro }) => registro.id}
        contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 32 }}
        ListEmptyComponent={
          <View style={estilos.vazio}>
            <View style={estilos.vazioIcon}>
              <Text style={estilos.vazioEmoji}>📝</Text>
            </View>
            <Text style={estilos.tituloVazio}>Nenhum registro</Text>
            <Text style={estilos.textoVazio}>
              Faca seu primeiro treino para ver os registros aqui!
            </Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <LinhaRegistro linha={item} index={index} />
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

function LinhaRegistro({
  linha,
  index,
}: {
  linha: LinhaHistorico
  index: number
}) {
  const { registro, nomeExercicio } = linha

  return (
    <View style={estilos.linha}>
      <View style={estilos.linhaIndex}>
        <Text style={estilos.linhaIndexTexto}>{index + 1}</Text>
      </View>
      <View style={{ flex: 1 }}>
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
          <View style={estilos.pendenteChip}>
            <Text style={estilos.pendenteTexto}>pendente</Text>
          </View>
        ) : (
          <View style={estilos.syncChip}>
            <Text style={estilos.syncTexto}>sync</Text>
          </View>
        )}
      </View>
    </View>
  )
}

const estilos = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0f1a',
  },
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
    gap: 12,
  },
  tituloRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  titulo: {
    color: '#f8fafc',
    fontSize: 22,
    fontWeight: '800',
  },
  pendenteCount: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  pendenteCountTexto: {
    color: '#f59e0b',
    fontSize: 13,
    fontWeight: '700',
  },
  botaoSync: {
    backgroundColor: '#10b981',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  botaoSyncTexto: {
    color: '#052e16',
    fontWeight: '700',
    fontSize: 13,
  },
  syncOk: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  syncOkTexto: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '600',
  },
  vazio: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 8,
  },
  vazioIcon: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1f2937',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  vazioEmoji: {
    fontSize: 32,
  },
  tituloVazio: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '700',
  },
  textoVazio: {
    color: '#64748b',
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
  },
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1f2937',
    padding: 14,
    gap: 12,
  },
  linhaIndex: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(100, 116, 139, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  linhaIndexTexto: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '700',
  },
  nome: {
    color: '#f8fafc',
    fontWeight: '700',
    fontSize: 15,
  },
  detalhe: {
    color: '#64748b',
    fontSize: 13,
    marginTop: 2,
  },
  data: {
    color: '#475569',
    fontSize: 11,
  },
  pendenteChip: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  pendenteTexto: {
    color: '#f59e0b',
    fontSize: 10,
    fontWeight: '700',
  },
  syncChip: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  syncTexto: {
    color: '#10b981',
    fontSize: 10,
    fontWeight: '700',
  },
})
