import * as LocalAuthentication from 'expo-local-authentication'
import * as SecureStore from 'expo-secure-store'

const CHAVE_EMAIL = 'shapeos.biometria.email'
const CHAVE_SENHA = 'shapeos.biometria.senha'

export async function biometriaDisponivel(): Promise<boolean> {
  const temHardware = await LocalAuthentication.hasHardwareAsync()
  if (!temHardware) return false
  const cadastrada = await LocalAuthentication.isEnrolledAsync()
  return cadastrada
}

export async function biometriaAtivada(): Promise<boolean> {
  const email = await SecureStore.getItemAsync(CHAVE_EMAIL)
  const senha = await SecureStore.getItemAsync(CHAVE_SENHA)
  return Boolean(email && senha)
}

export async function ativarBiometria(
  email: string,
  senha: string
): Promise<void> {
  await SecureStore.setItemAsync(CHAVE_EMAIL, email)
  await SecureStore.setItemAsync(CHAVE_SENHA, senha)
}

export async function desativarBiometria(): Promise<void> {
  await SecureStore.deleteItemAsync(CHAVE_EMAIL)
  await SecureStore.deleteItemAsync(CHAVE_SENHA)
}

export async function credenciaisBiometria(): Promise<{
  email: string
  senha: string
} | null> {
  const email = await SecureStore.getItemAsync(CHAVE_EMAIL)
  const senha = await SecureStore.getItemAsync(CHAVE_SENHA)
  if (!email || !senha) return null
  return { email, senha }
}

export async function autenticarPorBiometria(): Promise<boolean> {
  const resultado = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Entrar no ShapeOS',
    cancelLabel: 'Cancelar',
  })
  return resultado.success
}
