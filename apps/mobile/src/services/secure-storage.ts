import AsyncStorage from '@react-native-async-storage/async-storage'
import * as SecureStore from 'expo-secure-store'

const CHUNK_SIZE = 1800
const CONTAGEM = '.__chunks'

function chaveContagem(key: string) {
  return key + CONTAGEM
}

function chaveParte(key: string, indice: number) {
  return key + '.__chunk_' + indice
}

async function lerSeguro(key: string): Promise<string | null> {
  const countRaw = await SecureStore.getItemAsync(chaveContagem(key))

  if (!countRaw) {
    return SecureStore.getItemAsync(key)
  }

  const count = Number(countRaw)
  if (!Number.isInteger(count) || count < 1 || count > 100) {
    await removerSeguro(key)
    return null
  }

  const partes = await Promise.all(
    Array.from({ length: count }, (_, indice) =>
      SecureStore.getItemAsync(chaveParte(key, indice))
    )
  )

  if (partes.some((parte) => parte === null)) {
    await removerSeguro(key)
    return null
  }

  return partes.join('')
}

async function escreverSeguro(key: string, value: string): Promise<void> {
  const countAnteriorRaw = await SecureStore.getItemAsync(chaveContagem(key))
  const countAnterior = Number(countAnteriorRaw ?? 0)
  const partes =
    value.length === 0
      ? ['']
      : Array.from(
          { length: Math.ceil(value.length / CHUNK_SIZE) },
          (_, indice) =>
            value.slice(indice * CHUNK_SIZE, (indice + 1) * CHUNK_SIZE)
        )

  await Promise.all(
    partes.map((parte, indice) =>
      SecureStore.setItemAsync(chaveParte(key, indice), parte, {
        keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
      })
    )
  )

  await SecureStore.setItemAsync(chaveContagem(key), String(partes.length), {
    keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
  })
  await SecureStore.deleteItemAsync(key)

  if (Number.isInteger(countAnterior) && countAnterior > partes.length) {
    await Promise.all(
      Array.from(
        { length: countAnterior - partes.length },
        (_, offset) =>
          SecureStore.deleteItemAsync(chaveParte(key, partes.length + offset))
      )
    )
  }
}

async function removerSeguro(key: string): Promise<void> {
  const countRaw = await SecureStore.getItemAsync(chaveContagem(key))
  const count = Number(countRaw ?? 0)

  if (Number.isInteger(count) && count > 0 && count <= 100) {
    await Promise.all(
      Array.from({ length: count }, (_, indice) =>
        SecureStore.deleteItemAsync(chaveParte(key, indice))
      )
    )
  }

  await Promise.all([
    SecureStore.deleteItemAsync(chaveContagem(key)),
    SecureStore.deleteItemAsync(key),
  ])
}

export const secureStorage = {
  async getItem(key: string): Promise<string | null> {
    const seguro = await lerSeguro(key)
    if (seguro !== null) return seguro

    const legado = await AsyncStorage.getItem(key)
    if (legado !== null) {
      await escreverSeguro(key, legado)
      await AsyncStorage.removeItem(key)
    }

    return legado
  },

  async setItem(key: string, value: string): Promise<void> {
    await escreverSeguro(key, value)
    await AsyncStorage.removeItem(key)
  },

  async removeItem(key: string): Promise<void> {
    await Promise.all([removerSeguro(key), AsyncStorage.removeItem(key)])
  },
}
