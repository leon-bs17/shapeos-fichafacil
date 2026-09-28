import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import {
  executarCicloSync,
  pararSincronizacaoAutomatica,
} from '@/sync/engine'
import { contarRegistrosPendentes } from '@/sync/registros'
import { limparContextoLocal } from '@/sync/local-user'
import { supabase } from '@/services/supabase/client'
import {
  ativarBiometria,
  biometriaAtivada,
  biometriaDisponivel,
  desativarBiometria,
} from '@/services/biometria'
import { colors, radius, spacing, typography } from '@/theme'

export default function PerfilScreen() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [nome, setNome] = useState('')
  const [biometriaSuportada, setBiometriaSuportada] = useState(false)
  const [biometriaOn, setBiometriaOn] = useState(false)
  const [senhaBiometria, setSenhaBiometria] = useState('')
  const [senhaVisivel, setSenhaVisivel] = useState(false)
  const [ativandoBiometria, setAtivandoBiometria] = useState(false)
  const [pendentes, setPendentes] = useState(0)
  const [sincronizando, setSincronizando] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setEmail(data.user.email ?? '')
        setNome((data.user.user_metadata?.nome as string) ?? '')
      }
    })

    void (async () => {
      const [suportada, ativada, registrosPendentes] = await Promise.all([
        biometriaDisponivel(),
        biometriaAtivada(),
        contarRegistrosPendentes(),
      ])

      setBiometriaSuportada(suportada)
      setBiometriaOn(ativada)
      setPendentes(registrosPendentes)
    })()
  }, [])

  const iniciais = nome
    ? nome
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((parte) => parte.charAt(0).toUpperCase())
        .join('')
    : email.charAt(0).toUpperCase() || 'S'

  async function ativar() {
    if (!senhaBiometria) return
    setAtivandoBiometria(true)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: senhaBiometria,
    })

    if (error) {
      setAtivandoBiometria(false)
      Alert.alert('Senha incorreta', 'Confirme sua senha para ativar a biometria.')
      return
    }

    await ativarBiometria()
    setSenhaBiometria('')
    setSenhaVisivel(false)
    setBiometriaOn(true)
    setAtivandoBiometria(false)
  }

  function desativar() {
    Alert.alert(
      'Desativar biometria',
      'Você precisará desbloquear o aparelho normalmente ao abrir o app.',
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

  async function sincronizarAgora() {
    if (sincronizando) return
    setSincronizando(true)

    try {
      await executarCicloSync()
      setPendentes(await contarRegistrosPendentes())
    } catch {
      Alert.alert(
        'Não foi possível sincronizar',
        'Seus dados continuam salvos no aparelho. Tente novamente quando houver internet.'
      )
    } finally {
      setSincronizando(false)
    }
  }

  async function sair() {
    const pendentesAntes = await contarRegistrosPendentes()

    if (pendentesAntes > 0) {
      try {
        await executarCicloSync()
      } catch {
        void 0
      }

      const pendentesDepois = await contarRegistrosPendentes()
      if (pendentesDepois > 0) {
        setPendentes(pendentesDepois)
        Alert.alert(
          'Sincronização pendente',
          'Existem registros de treino ainda não enviados. Conecte-se à internet e sincronize antes de sair para não perder esses dados.'
        )
        return
      }
    }

    pararSincronizacaoAutomatica()
    await limparContextoLocal()
    await desativarBiometria()
    await supabase.auth.signOut()
    router.replace('/(auth)/entrar')
  }

  return (
    <SafeAreaView style={estilos.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={estilos.conteudo}
      >
        <View style={estilos.cabecalho}>
          <Text style={estilos.kicker}>CONTA</Text>
          <Text style={estilos.titulo}>Perfil</Text>
          <Text style={estilos.subtitulo}>
            Gerencie sua sessão, segurança e dados salvos no aparelho.
          </Text>
        </View>

        <View style={estilos.perfilCard}>
          <View style={estilos.avatar}>
            <Text style={estilos.avatarTexto}>{iniciais}</Text>
          </View>
          <View style={estilos.identidade}>
            <Text style={estilos.nome} numberOfLines={1}>
              {nome || 'Atleta ShapeOS'}
            </Text>
            <Text style={estilos.email} numberOfLines={1}>
              {email || '—'}
            </Text>
            <View style={estilos.statusConta}>
              <View style={estilos.statusContaPonto} />
              <Text style={estilos.statusContaTexto}>Sessão ativa neste aparelho</Text>
            </View>
          </View>
        </View>

        <SecaoTitulo
          titulo="Sincronização"
          descricao="Dados do treino e disponibilidade offline"
        />

        <View style={estilos.cardAgrupado}>
          <ConfiguracaoLinha
            icone="cloud-done-outline"
            titulo="Modo offline-first"
            descricao="Sua ficha e seus registros continuam disponíveis sem internet."
            direita={
              <View style={estilos.statusBadge}>
                <Text style={estilos.statusBadgeTexto}>ATIVO</Text>
              </View>
            }
          />

          <View style={estilos.divisor} />

          <ConfiguracaoLinha
            icone={pendentes > 0 ? 'cloud-upload-outline' : 'checkmark-circle-outline'}
            titulo={pendentes > 0 ? 'Sincronização pendente' : 'Dados sincronizados'}
            descricao={
              pendentes > 0
                ? `${pendentes} registro${pendentes === 1 ? '' : 's'} aguardando envio.`
                : 'Não há registros aguardando envio.'
            }
            destaque={pendentes > 0}
            direita={
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Sincronizar dados agora"
                style={({ pressed }) => [
                  estilos.botaoIcone,
                  pressed && estilos.botaoPressed,
                  sincronizando && estilos.botaoDesabilitado,
                ]}
                onPress={() => void sincronizarAgora()}
                disabled={sincronizando}
              >
                {sincronizando ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Ionicons name="refresh" size={19} color={colors.primary} />
                )}
              </Pressable>
            }
          />
        </View>

        <SecaoTitulo
          titulo="Segurança"
          descricao="Proteção da sua sessão neste dispositivo"
        />

        {biometriaSuportada ? (
          <View style={estilos.cardBiometria}>
            <View style={estilos.cardBiometriaTopo}>
              <View
                style={[
                  estilos.iconeGrande,
                  biometriaOn && estilos.iconeGrandeAtivo,
                ]}
              >
                <Ionicons
                  name="finger-print-outline"
                  size={24}
                  color={biometriaOn ? colors.primary : colors.textSecondary}
                />
              </View>

              <View style={{ flex: 1 }}>
                <View style={estilos.biometriaTituloRow}>
                  <Text style={estilos.cardTitulo}>Entrada por biometria</Text>
                  <View
                    style={[
                      estilos.pillEstado,
                      biometriaOn && estilos.pillEstadoAtivo,
                    ]}
                  >
                    <Text
                      style={[
                        estilos.pillEstadoTexto,
                        biometriaOn && estilos.pillEstadoTextoAtivo,
                      ]}
                    >
                      {biometriaOn ? 'ATIVADA' : 'DESATIVADA'}
                    </Text>
                  </View>
                </View>
                <Text style={estilos.cardDescricao}>
                  {biometriaOn
                    ? 'Sua sessão fica protegida por digital ou Face ID ao abrir o app.'
                    : 'Use digital ou Face ID para proteger o acesso à sua sessão.'}
                </Text>
              </View>
            </View>

            {biometriaOn ? (
              <Pressable
                accessibilityRole="button"
                style={({ pressed }) => [
                  estilos.botaoDesativar,
                  pressed && estilos.botaoPressed,
                ]}
                onPress={desativar}
              >
                <Ionicons name="lock-open-outline" size={17} color={colors.danger} />
                <Text style={estilos.botaoDesativarTexto}>Desativar biometria</Text>
              </Pressable>
            ) : (
              <View style={estilos.ativacaoBiometria}>
                <Text style={estilos.labelSenha}>CONFIRME SUA SENHA</Text>
                <View style={estilos.inputWrap}>
                  <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} />
                  <TextInput
                    style={estilos.inputSenha}
                    placeholder="Sua senha"
                    placeholderTextColor={colors.textFaint}
                    secureTextEntry={!senhaVisivel}
                    value={senhaBiometria}
                    onChangeText={setSenhaBiometria}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="done"
                    onSubmitEditing={() => void ativar()}
                  />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={senhaVisivel ? 'Ocultar senha' : 'Mostrar senha'}
                    hitSlop={10}
                    onPress={() => setSenhaVisivel((valor) => !valor)}
                  >
                    <Ionicons
                      name={senhaVisivel ? 'eye-off-outline' : 'eye-outline'}
                      size={19}
                      color={colors.textMuted}
                    />
                  </Pressable>
                </View>

                <Pressable
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    estilos.botaoAtivar,
                    pressed && estilos.botaoPressed,
                    (!senhaBiometria || ativandoBiometria) && estilos.botaoDesabilitado,
                  ]}
                  onPress={() => void ativar()}
                  disabled={!senhaBiometria || ativandoBiometria}
                >
                  {ativandoBiometria ? (
                    <ActivityIndicator size="small" color={colors.primaryInk} />
                  ) : (
                    <Ionicons name="finger-print" size={18} color={colors.primaryInk} />
                  )}
                  <Text style={estilos.botaoAtivarTexto}>
                    {ativandoBiometria ? 'Ativando...' : 'Ativar biometria'}
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        ) : (
          <View style={estilos.cardAgrupado}>
            <ConfiguracaoLinha
              icone="finger-print-outline"
              titulo="Biometria indisponível"
              descricao="Este aparelho não informou suporte a digital ou Face ID."
            />
          </View>
        )}

        <SecaoTitulo
          titulo="Sessão"
          descricao="Ações relacionadas à sua conta neste aparelho"
        />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Sair da conta"
          style={({ pressed }) => [
            estilos.botaoSair,
            pressed && estilos.botaoSairPressed,
          ]}
          onPress={() => void sair()}
        >
          <View style={estilos.botaoSairIcone}>
            <Ionicons name="log-out-outline" size={20} color={colors.danger} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={estilos.botaoSairTitulo}>Sair da conta</Text>
            <Text style={estilos.botaoSairDescricao}>
              Sincronizamos seus registros pendentes antes de encerrar a sessão.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.danger} />
        </Pressable>

        <Text style={estilos.rodape}>ShapeOS · Dados protegidos neste aparelho</Text>
      </ScrollView>
    </SafeAreaView>
  )
}

function SecaoTitulo({
  titulo,
  descricao,
}: {
  titulo: string
  descricao: string
}) {
  return (
    <View style={estilos.secaoTituloWrap}>
      <Text style={estilos.secaoTitulo}>{titulo}</Text>
      <Text style={estilos.secaoDescricao}>{descricao}</Text>
    </View>
  )
}

function ConfiguracaoLinha({
  icone,
  titulo,
  descricao,
  direita,
  destaque = false,
}: {
  icone: keyof typeof Ionicons.glyphMap
  titulo: string
  descricao: string
  direita?: React.ReactNode
  destaque?: boolean
}) {
  return (
    <View style={estilos.configLinha}>
      <View
        style={[
          estilos.configIcone,
          destaque && estilos.configIconeDestaque,
        ]}
      >
        <Ionicons
          name={icone}
          size={20}
          color={destaque ? colors.warning : colors.primary}
        />
      </View>
      <View style={estilos.configTexto}>
        <Text style={estilos.configTitulo}>{titulo}</Text>
        <Text style={estilos.configDescricao}>{descricao}</Text>
      </View>
      {direita}
    </View>
  )
}

const estilos = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  conteudo: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: 36,
    gap: spacing.lg,
  },
  cabecalho: {
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  kicker: {
    ...typography.label,
    color: colors.primary,
  },
  titulo: {
    ...typography.display,
    color: colors.text,
  },
  subtitulo: {
    ...typography.body,
    color: colors.textMuted,
    maxWidth: 330,
  },
  perfilCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    padding: spacing.xl,
  },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarTexto: {
    color: colors.primary,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  identidade: {
    flex: 1,
    gap: 4,
  },
  nome: {
    color: colors.text,
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: -0.25,
  },
  email: {
    color: colors.textMuted,
    fontSize: 13,
  },
  statusConta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  statusContaPonto: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  statusContaTexto: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  secaoTituloWrap: {
    gap: 2,
    marginTop: spacing.sm,
  },
  secaoTitulo: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  secaoDescricao: {
    color: colors.textFaint,
    fontSize: 12,
  },
  cardAgrupado: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    paddingHorizontal: spacing.lg,
  },
  configLinha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
  },
  configIcone: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  configIconeDestaque: {
    backgroundColor: colors.warningSoft,
  },
  configTexto: {
    flex: 1,
    gap: 3,
  },
  configTitulo: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  configDescricao: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
  },
  divisor: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.borderSoft,
    marginLeft: 54,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  statusBadgeTexto: {
    color: colors.primary,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
  botaoIcone: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botaoPressed: {
    opacity: 0.78,
    transform: [{ scale: 0.98 }],
  },
  botaoDesabilitado: {
    opacity: 0.5,
  },
  cardBiometria: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  cardBiometriaTopo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  iconeGrande: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconeGrandeAtivo: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primaryBorder,
  },
  biometriaTituloRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  cardTitulo: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  cardDescricao: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 5,
  },
  pillEstado: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillEstadoAtivo: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primaryBorder,
  },
  pillEstadoTexto: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  pillEstadoTextoAtivo: {
    color: colors.primary,
  },
  ativacaoBiometria: {
    gap: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderSoft,
  },
  labelSenha: {
    ...typography.label,
    color: colors.textMuted,
  },
  inputWrap: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
  },
  inputSenha: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    paddingVertical: 12,
  },
  botaoAtivar: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
  },
  botaoAtivarTexto: {
    color: colors.primaryInk,
    fontWeight: '800',
    fontSize: 14,
  },
  botaoDesativar: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.24)',
    backgroundColor: 'rgba(127, 29, 29, 0.12)',
  },
  botaoDesativarTexto: {
    color: colors.danger,
    fontWeight: '700',
    fontSize: 13,
  },
  botaoSair: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: 'rgba(127, 29, 29, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.18)',
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  botaoSairPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.99 }],
  },
  botaoSairIcone: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: 'rgba(248, 113, 113, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  botaoSairTitulo: {
    color: '#fca5a5',
    fontSize: 14,
    fontWeight: '800',
  },
  botaoSairDescricao: {
    color: '#9f6b72',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
  },
  rodape: {
    color: colors.textFaint,
    textAlign: 'center',
    fontSize: 11,
    paddingTop: spacing.sm,
  },
})
