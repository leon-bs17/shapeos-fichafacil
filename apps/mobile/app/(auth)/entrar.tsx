import { useState } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useRouter } from 'expo-router'
import { loginSchema } from '@shapeos/shared'
import { iniciarSincronizacaoAutomatica } from '@/sync/engine'
import { supabase } from '@/services/supabase/client'

export default function EntrarScreen() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(false)

  async function entrar() {
    setErro(null)

    const parsed = loginSchema.safeParse({ email, senha })
    if (!parsed.success) {
      setErro(parsed.error.issues[0]?.message ?? 'Dados inválidos')
      return
    }

    setCarregando(true)
    const { error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.senha,
    })

    if (error) {
      setErro('E-mail ou senha incorretos.')
      setCarregando(false)
      return
    }

    void iniciarSincronizacaoAutomatica()
    router.replace('/(tabs)')
  }

  return (
    <KeyboardAvoidingView
      style={estilos.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={estilos.logo}>
        Shape<Text style={{ color: '#10b981' }}>OS</Text>
      </Text>
      <Text style={estilos.subtitulo}>Seu treino, offline ou online</Text>

      <TextInput
        style={estilos.input}
        placeholder="E-mail"
        placeholderTextColor="#64748b"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={estilos.input}
        placeholder="Senha"
        placeholderTextColor="#64748b"
        secureTextEntry
        value={senha}
        onChangeText={setSenha}
      />

      {erro ? <Text style={estilos.erro}>{erro}</Text> : null}

      <Pressable
        style={({ pressed }) => [
          estilos.botao,
          pressed && { opacity: 0.8 },
          carregando && { opacity: 0.5 },
        ]}
        onPress={entrar}
        disabled={carregando}
      >
        {carregando ? (
          <ActivityIndicator color="#052e16" />
        ) : (
          <Text style={estilos.botaoTexto}>Entrar</Text>
        )}
      </Pressable>
    </KeyboardAvoidingView>
  )
}

const estilos = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 12,
  },
  logo: {
    fontSize: 32,
    fontWeight: '800',
    color: '#f8fafc',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitulo: {
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 24,
  },
  input: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#f8fafc',
    fontSize: 16,
  },
  erro: {
    color: '#f87171',
    textAlign: 'center',
  },
  botao: {
    backgroundColor: '#10b981',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
  },
  botaoTexto: {
    color: '#052e16',
    fontWeight: '700',
    fontSize: 16,
  },
})
