import * as LocalAuthentication from 'expo-local-authentication'
import * as SecureStore from 'expo-secure-store'

const CHAVE_ATIVA = 'shapeos.biometria.ativa'
const CHAVE_EMAIL_LEGADO = 'shapeos.biometria.email'
const CHAVE_SENHA_LEGADO = 'shapeos.biometria.senha'

async function apagarCredenciaisLegadas(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(CHAVE_EMAIL_LEGADO),
    SecureStore.deleteItemAsync(CHAVE_SENHA_LEGADO),
  ])
}

export async function biometriaDisponivel(): Promise<boolean> {
  const temHardware = await LocalAuthentication.hasHardwareAsync()
  if (!temHardware) return false
  return LocalAuthentication.isEnrolledAsync()
}

export async function biometriaAtivada(): Promise<boolean> {
  await apagarCredenciaisLegadas()
  return (await SecureStore.getItemAsync(CHAVE_ATIVA)) === '1'
}

export async function ativarBiometria(): Promise<void> {
  await apagarCredenciaisLegadas()
  await SecureStore.setItemAsync(CHAVE_ATIVA, '1')
}

export async function desativarBiometria(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(CHAVE_ATIVA),
    apagarCredenciaisLegadas(),
  ])
}

export async function autenticarPorBiometria(): Promise<boolean> {
  const resultado = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Entrar no ShapeOS',
    cancelLabel: 'Cancelar',
  })
  return resultado.success
}
