import { useEffect, useState } from 'react'
import { Q } from '@nozbe/watermelondb'
import { combineLatest } from 'rxjs'
import { colecoes } from '../database'
import type { ItemTreinoLocal } from '../database'
import type Treino from '../database/models/Treino'

interface EstadoTreino {
  treino: Treino | null
  itens: ItemTreinoLocal[]
  carregando: boolean
}

export function useTreinoHoje(): EstadoTreino {
  const [estado, setEstado] = useState<EstadoTreino>({
    treino: null,
    itens: [],
    carregando: true,
  })

  useEffect(() => {
    const assinatura = combineLatest(
      colecoes().treinos.query(Q.where('ativo', true)).observe(),
      colecoes().itens.query().observe()
    ).subscribe(([treinos, todosItens]) => {
      const treinoAtivo = treinos[0] ?? null

      setEstado({
        treino: treinoAtivo,
        itens: todosItens
          .filter(
            (i) => !treinoAtivo || i.treinoRemoteId === treinoAtivo.remoteId
          )
          .sort((a, b) => a.ordem - b.ordem),
        carregando: false,
      })
    })

    return () => assinatura.unsubscribe()
  }, [])

  return estado
}
