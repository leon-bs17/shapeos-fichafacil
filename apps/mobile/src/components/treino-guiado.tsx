import { StyleSheet, View } from 'react-native'
import type { ItemTreinoLocal } from '@/database'
import { TreinoGuiado as TreinoGuiadoCore } from './treino-guiado-core'
import { ExerciseMediaGallery } from './exercise-media-gallery'

interface TreinoGuiadoProps {
  titulo: string
  itens: ItemTreinoLocal[]
  onSair: () => void
}

export function TreinoGuiado(props: TreinoGuiadoProps) {
  return (
    <View style={estilos.container}>
      <TreinoGuiadoCore {...props} />
      <ExerciseMediaGallery itens={props.itens} />
    </View>
  )
}

const estilos = StyleSheet.create({
  container: {
    flex: 1,
  },
})
