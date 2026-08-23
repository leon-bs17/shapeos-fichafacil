import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { pararSincronizacaoAutomatica } from '@/sync/engine'
import { supabase } from '@/services/supabase/client'

export default function PerfilScreen() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [nome, setNome] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setEmail(data.user.email ?? '')
        setNome((data.user.user_metadata?.nome as string) ?? '')
      }
    })
  }, [])

  const iniciais = nome
    ? nome
        .split(' ')
        .slice(0, 2)
        .map((p) => p.charAt(0).toUpperCase())
        .join('')
    : email.charAt(0).toUpperCase()

  async function sair() {
    pararSincronizacaoAutomatica()
    await supabase.auth.signOut()
    router.replace('/(auth)/entrar')
  }

  return (
    <SafeAreaView style={estilos.container} edges={['top']}>
      <Text style={estilos.titulo}>Perfil</Text>

      <View style={estilos.avatarSection}>
        <View style={estilos.avatar}>
          <Text style={estilos.avatarTexto}>{iniciais}</Text>
        </View>
        {nome ? <Text style={estilos.nome}>{nome}</Text> : null}
        <Text style={estilos.email}>{email || '—'}</Text>
      </View>

      <View style={estilos.card}>
        <View style={estilos.cardRow}>
          <View style={estilos.cardIcon}>
            <Ionicons name="wifi-outline" size={20} color="#10b981" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={estilos.cardLabel}>Modo offline-first</Text>
            <Text style={estilos.cardValue}>
              Seus treinos ficam salvos no aparelho e sincronizam
              automaticamente quando ha internet.
            </Text>
          </View>
        </View>
      </View>

      <Pressable
        style={({ pressed }) => [
          estilos.botaoSair,
          pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
        ]}
        onPress={sair}
      >
        <Ionicons name="log-out-outline" size={18} color="#fca5a5" />
        <Text style={estilos.botaoSairTexto}>Sair da conta</Text>
      </Pressable>
    </SafeAreaView>
  )
}

const estilos = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0f1a',
    paddingHorizontal: 16,
    gap: 20,
  },
  titulo: {
    color: '#f8fafc',
    fontSize: 22,
    fontWeight: '800',
    paddingTop: 12,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 2,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarTexto: {
    color: '#10b981',
    fontSize: 26,
    fontWeight: '800',
  },
  nome: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '700',
  },
  email: {
    color: '#64748b',
    fontSize: 14,
  },
  card: {
    backgroundColor: '#111827',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1f2937',
    padding: 16,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardLabel: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '600',
  },
  cardValue: {
    color: '#64748b',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  botaoSair: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(127, 29, 29, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    borderRadius: 14,
    paddingVertical: 15,
    gap: 8,
    marginTop: 'auto',
    marginBottom: 16,
  },
  botaoSairTexto: {
    color: '#fca5a5',
    fontWeight: '700',
    fontSize: 15,
  },
})
