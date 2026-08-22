import NetInfo from '@react-native-community/netinfo'
import { supabase } from '../services/supabase/client'
import { baixarFichasDoAluno } from './fichas'
import {
  enviarRegistrosPendentes,
  salvarRegistro,
  type NovoRegistro,
} from './registros'

let cancelarObservacao: (() => void) | null = null
let cicloEmAndamento = false

export async function executarCicloSync(): Promise<void> {
  if (cicloEmAndamento) return
  cicloEmAndamento = true

  try {
    await enviarRegistrosPendentes()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) {
      await baixarFichasDoAluno(user.id)
    }
  } finally {
    cicloEmAndamento = false
  }
}

export async function salvarRegistroSincronizando(
  novo: NovoRegistro
): Promise<void> {
  await salvarRegistro(novo)
  try {
    await executarCicloSync()
  } catch {
    void 0
  }
}

export async function iniciarSincronizacaoAutomatica(): Promise<void> {
  const estado = await NetInfo.fetch()
  if (estado.isConnected) {
    try {
      await executarCicloSync()
    } catch {
      void 0
    }
  }

  cancelarObservacao?.()
  cancelarObservacao = NetInfo.addEventListener((state) => {
    if (state.isConnected) {
      void executarCicloSync().catch(() => undefined)
    }
  })
}

export function pararSincronizacaoAutomatica(): void {
  cancelarObservacao?.()
  cancelarObservacao = null
}
