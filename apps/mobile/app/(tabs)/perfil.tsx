import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { pararSincronizacaoAutomatica } from '@/sync/engine'
import { supabase } from '@/services/supabase/client'

export default function PerfilScreen() {
  const router = useRouter()
  const [email, setEmail] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setEmail(data.user.email ?? '')
    })
  }, [])

  async function sair() {
    pararSincronizacaoAutomatica()
    await supabase.auth.signOut()
    router.replace('/(auth)/entrar')
  }

  return (
    <SafeAreaView style={estilos.container} edges={['top']}>
      <Text style={estilos.titulo}>Perfil</Text>

      <View style={estilos.cartao}>
        <Text style={estilos.rotulo}>E-mail</Text>
        <Text style={estilos.valor}>{email || '—'}</Text>
      </View>

      <View style={estilos.cartao}>
        <Text style={estilos.rotulo}>Modo</Text>
        <Text style={estilos.valor}>
          Offline-first: seus treinos ficam salvos no aparelho e sincronizam
          automaticamente quando há internet.
        </Text>
      </View>

      <Pressable
        style={({ pressed }) => [
          estilos.botaoSair,
          pressed && { opacity: 0.8 },
        ]}
        onPress={sair}
      >
        <Text style={estilos.botaoSairTexto}>Sair da conta</Text>
      </Pressable>
    </SafeAreaView>
  )
}

const estilos = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    paddingHorizontal: 16,
    gap: 16,
  },
  titulo: {
    color: '#f8fafc',
    fontSize: 22,
    fontWeight: '800',
    paddingTop: 12,
  },
  cartao: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    gap: 6,
  },
  rotulo: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  valor: {
    color: '#f8fafc',
    fontSize: 15,
    lineHeight: 21,
  },
  botaoSair: {
    backgroundColor: '#7f1d1d',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  botaoSairTexto: {
    color: '#fecaca',
    fontWeight: '700',
    fontSize: 15,
  },
})
