import { useEffect, useState } from 'react'
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { pararSincronizacaoAutomatica } from '@/sync/engine'
import { supabase } from '@/services/supabase/client'
import {
  ativarBiometria,
  biometriaAtivada,
  biometriaDisponivel,
  desativarBiometria,
} from '@/services/biometria'

export default function PerfilScreen() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [nome, setNome] = useState('')
  const [biometriaSuportada, setBiometriaSuportada] = useState(false)
  const [biometriaOn, setBiometriaOn] = useState(false)
  const [senhaBiometria, setSenhaBiometria] = useState('')
  const [ativandoBiometria, setAtivandoBiometria] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setEmail(data.user.email ?? '')
        setNome((data.user.user_metadata?.nome as string) ?? '')
      }
    })
    void (async () => {
      setBiometriaSuportada(await biometriaDisponivel())
      setBiometriaOn(await biometriaAtivada())
    })()
  }, [])

  const iniciais = nome
    ? nome
        .split(' ')
        .slice(0, 2)
        .map((p) => p.charAt(0).toUpperCase())
        .join('')
    : email.charAt(0).toUpperCase()

  async function ativar() {
    if (!senhaBiometria) return
    setAtivandoBiometria(true)
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: senhaBiometria,
    })
    setAtivandoBiometria(false)
    if (error) {
      Alert.alert('Senha incorreta', 'Confirme sua senha para ativar.')
      return
    }
    await ativarBiometria(email, senhaBiometria)
    setSenhaBiometria('')
    setBiometriaOn(true)
  }

  function desativar() {
    Alert.alert(
      'Desativar biometria',
      'Voce precisara digitar e-mail e senha ao abrir o app.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desativar',
          style: 'destructive',
          onPress: () => {
            void desativarBiometria().then(() => setBiometriaOn(false))
          },
        },
      ]
    )
  }

  async function sair() {
    pararSincronizacaoAutomatica()
    await desativarBiometria()
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

      {biometriaSuportada ? (
        <View style={estilos.card}>
          <View style={estilos.cardRow}>
            <View style={estilos.cardIcon}>
              <Ionicons
                name="finger-print-outline"
                size={20}
                color="#10b981"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={estilos.cardLabel}>Entrada por biometria</Text>
              <Text style={estilos.cardValue}>
                {biometriaOn
                  ? 'Ativada. Ao abrir o app, use digital ou Face ID para entrar.'
                  : 'Use digital ou Face ID para entrar sem digitar a senha.'}
              </Text>
            </View>
          </View>

          {biometriaOn ? (
            <Pressable
              style={({ pressed }) => [
                estilos.botaoDesativar,
                pressed && { opacity: 0.85 },
              ]}
              onPress={desativar}
            >
              <Text style={estilos.botaoDesativarTexto}>Desativar</Text>
            </Pressable>
          ) : (
            <View style={estilos.ativacaoBiometria}>
              <TextInput
                style={estilos.inputSenha}
                placeholder="Confirme sua senha"
                placeholderTextColor="#475569"
                secureTextEntry
                value={senhaBiometria}
                onChangeText={setSenhaBiometria}
              />
              <Pressable
                style={({ pressed }) => [
                  estilos.botaoAtivar,
                  pressed && { opacity: 0.85 },
                  (!senhaBiometria || ativandoBiometria) && { opacity: 0.5 },
                ]}
                onPress={() => void ativar()}
                disabled={!senhaBiometria || ativandoBiometria}
              >
                <Text style={estilos.botaoAtivarTexto}>
                  {ativandoBiometria ? 'Ativando...' : 'Ativar'}
                </Text>
              </Pressable>
            </View>
          )}
        </View>
      ) : null}

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
  botaoDesativar: {
    alignSelf: 'flex-end',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    backgroundColor: 'rgba(127, 29, 29, 0.2)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginTop: 12,
  },
  botaoDesativarTexto: {
    color: '#fca5a5',
    fontWeight: '700',
    fontSize: 13,
  },
  ativacaoBiometria: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  inputSenha: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1e293b',
    paddingHorizontal: 12,
    paddingVertical: 9,
    color: '#f8fafc',
    fontSize: 14,
  },
  botaoAtivar: {
    backgroundColor: '#10b981',
    borderRadius: 10,
    paddingHorizontal: 18,
    justifyContent: 'center',
  },
  botaoAtivarTexto: {
    color: '#052e16',
    fontWeight: '700',
    fontSize: 13,
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
