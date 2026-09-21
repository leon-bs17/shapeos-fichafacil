import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import {
  iniciarSincronizacaoAutomatica,
  pararSincronizacaoAutomatica,
} from '@/sync/engine'
import { prepararDadosLocaisParaUsuario } from '@/sync/local-user'
import { supabase } from '@/services/supabase/client'
import {
  autenticarPorBiometria,
  biometriaAtivada,
} from '@/services/biometria'

export default function IndexRedirect() {
  const router = useRouter()
  const [travado, setTravado] = useState(false)

  const liberarAcesso = useCallback(
    async (userId: string) => {
      await prepararDadosLocaisParaUsuario(userId, true)
      setTravado(false)
      await iniciarSincronizacaoAutomatica()
      router.replace('/(tabs)')
    },
    [router]
  )

  const desbloquear = useCallback(
    async (userId: string) => {
      const autenticou = await autenticarPorBiometria()
      if (autenticou) {
        await liberarAcesso(userId)
      }
    },
    [liberarAcesso]
  )

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_evento, sessao) => {
      if (sessao) {
        const userId = sessao.user.id

        void (async () => {
          const ativada = await biometriaAtivada()
          if (ativada) {
            setTravado(true)
            await desbloquear(userId)
          } else {
            await liberarAcesso(userId)
          }
        })()
      } else {
        pararSincronizacaoAutomatica()
        router.replace('/(auth)/entrar')
      }
    })

    return () => subscription.unsubscribe()
  }, [router, liberarAcesso, desbloquear])

  if (travado) {
    return (
      <View style={estilos.centro}>
        <View style={estilos.logoContainer}>
          <Text style={estilos.logoIcon}>💪</Text>
        </View>
        <Text style={estilos.logo}>
          Shape<Text style={estilos.logoOS}>OS</Text>
        </Text>
        <Text style={estilos.mensagem}>
          Desbloqueie para acessar seus treinos
        </Text>
        <Pressable
          style={({ pressed }) => [
            estilos.botao,
            pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
          ]}
          onPress={() => {
            void supabase.auth.getUser().then(({ data }) => {
              if (data.user) void desbloquear(data.user.id)
            })
          }}
        >
          <Ionicons name="finger-print-outline" size={22} color="#052e16" />
          <Text style={estilos.botaoTexto}>Desbloquear</Text>
        </Pressable>
      </View>
    )
  }

  return (
    <View style={estilos.centro}>
      <ActivityIndicator size="large" color="#10b981" />
    </View>
  )
}

const estilos = StyleSheet.create({
  centro: {
    flex: 1,
    backgroundColor: '#0a0f1a',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  logoContainer: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoIcon: {
    fontSize: 36,
  },
  logo: {
    fontSize: 32,
    fontWeight: '800',
    color: '#f8fafc',
    letterSpacing: -0.5,
  },
  logoOS: {
    fontWeight: '500',
    color: '#10b981',
    letterSpacing: -0.2,
  },
  mensagem: {
    color: '#64748b',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 32,
    fontSize: 15,
  },
  botao: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#10b981',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  botaoTexto: {
    color: '#052e16',
    fontWeight: '700',
    fontSize: 16,
  },
})
