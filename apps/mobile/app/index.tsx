import { useEffect } from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { useRouter } from 'expo-router'
import {
  iniciarSincronizacaoAutomatica,
  pararSincronizacaoAutomatica,
} from '@/sync/engine'
import { supabase } from '@/services/supabase/client'

export default function IndexRedirect() {
  const router = useRouter()

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_evento, sessao) => {
      if (sessao) {
        void iniciarSincronizacaoAutomatica()
        router.replace('/(tabs)')
      } else {
        pararSincronizacaoAutomatica()
        router.replace('/(auth)/entrar')
      }
    })

    return () => subscription.unsubscribe()
  }, [router])

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
  },
})
