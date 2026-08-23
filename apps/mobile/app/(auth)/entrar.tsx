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
      setErro(parsed.error.issues[0]?.message ?? 'Dados invalidos')
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
      <View style={estilos.header}>
        <View style={estilos.logoContainer}>
          <Text style={estilos.logoIcon}>💪</Text>
        </View>
        <Text style={estilos.logo}>
          Shape<Text style={{ color: '#10b981' }}>OS</Text>
        </Text>
        <Text style={estilos.subtitulo}>Seu treino, offline ou online</Text>
      </View>

      <View style={estilos.formCard}>
        <View style={estilos.inputGroup}>
          <Text style={estilos.label}>E-MAIL</Text>
          <TextInput
            style={estilos.input}
            placeholder="voce@exemplo.com"
            placeholderTextColor="#475569"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            value={email}
            onChangeText={setEmail}
          />
        </View>

        <View style={estilos.inputGroup}>
          <Text style={estilos.label}>SENHA</Text>
          <TextInput
            style={estilos.input}
            placeholder="Minimo 6 caracteres"
            placeholderTextColor="#475569"
            secureTextEntry
            value={senha}
            onChangeText={setSenha}
          />
        </View>

        {erro ? (
          <View style={estilos.erroBox}>
            <Text style={estilos.erro}>{erro}</Text>
          </View>
        ) : null}

        <Pressable
          style={({ pressed }) => [
            estilos.botao,
            pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
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
      </View>

      <Text style={estilos.footer}>
        Treinos offline · Sincronizacao automatica
      </Text>
    </KeyboardAvoidingView>
  )
}

const estilos = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0f1a',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
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
    fontSize: 36,
    fontWeight: '800',
    color: '#f8fafc',
    letterSpacing: -0.5,
  },
  subtitulo: {
    color: '#64748b',
    textAlign: 'center',
    marginTop: 8,
    fontSize: 15,
  },
  formCard: {
    backgroundColor: '#111827',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1f2937',
    padding: 24,
    gap: 16,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#f8fafc',
    fontSize: 16,
  },
  erroBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  erro: {
    color: '#f87171',
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '500',
  },
  botao: {
    backgroundColor: '#10b981',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  botaoTexto: {
    color: '#052e16',
    fontWeight: '700',
    fontSize: 16,
  },
  footer: {
    color: '#334155',
    textAlign: 'center',
    marginTop: 24,
    fontSize: 12,
  },
})
