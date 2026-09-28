import { useMemo, useState } from 'react'
import {
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { ItemTreinoLocal } from '@/database'
import { colors, radius, spacing, typography } from '@/theme'

type MidiaExercicio = {
  id: string
  nome: string
  url: string
}

interface ExerciseMediaGalleryProps {
  itens: ItemTreinoLocal[]
}

function ehVideoDireto(url: string) {
  return /\.(mp4|webm|ogg|mov|m4v)(?:[?#].*)?$/i.test(url) || /(?:youtube\.com|youtu\.be|vimeo\.com)/i.test(url)
}

export function ExerciseMediaGallery({ itens }: ExerciseMediaGalleryProps) {
  const midias = useMemo<MidiaExercicio[]>(
    () =>
      itens
        .filter((item) => Boolean(item.exercicioVideoUrl))
        .map((item) => ({
          id: item.id,
          nome: item.exercicioNome,
          url: item.exercicioVideoUrl as string,
        })),
    [itens]
  )

  const [aberto, setAberto] = useState(false)
  const [selecionado, setSelecionado] = useState(0)
  const [falhou, setFalhou] = useState(false)

  if (midias.length === 0) return null

  const atual = midias[Math.min(selecionado, midias.length - 1)]
  const videoDireto = atual ? ehVideoDireto(atual.url) : false

  function abrirGaleria() {
    setSelecionado(0)
    setFalhou(false)
    setAberto(true)
  }

  function selecionar(index: number) {
    setSelecionado(index)
    setFalhou(false)
  }

  async function abrirVideo() {
    if (!atual) return
    try {
      await Linking.openURL(atual.url)
    } catch {
      setFalhou(true)
    }
  }

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Ver demonstrações dos exercícios"
        onPress={abrirGaleria}
        style={({ pressed }) => [
          estilos.botaoFlutuante,
          pressed && estilos.botaoFlutuantePressed,
        ]}
      >
        <View style={estilos.botaoFlutuanteIcone}>
          <Ionicons name="play" size={15} color={colors.primaryInk} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={estilos.botaoFlutuanteTitulo}>Execuções</Text>
          <Text style={estilos.botaoFlutuanteMeta}>{midias.length} demonstração(ões)</Text>
        </View>
        <Ionicons name="expand-outline" size={18} color={colors.primary} />
      </Pressable>

      <Modal
        visible={aberto}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setAberto(false)}
      >
        <View style={estilos.overlay}>
          <View style={estilos.modalCard}>
            <View style={estilos.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={estilos.modalKicker}>EXECUÇÃO DO EXERCÍCIO</Text>
                <Text style={estilos.modalTitulo} numberOfLines={2}>
                  {atual?.nome}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Fechar demonstração"
                onPress={() => setAberto(false)}
                hitSlop={10}
                style={({ pressed }) => [
                  estilos.fechar,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </Pressable>
            </View>

            <View style={estilos.visualizacao}>
              {videoDireto ? (
                <View style={estilos.videoFallback}>
                  <View style={estilos.videoIcone}>
                    <Ionicons name="videocam-outline" size={36} color={colors.primary} />
                  </View>
                  <Text style={estilos.videoTitulo}>Vídeo de execução</Text>
                  <Text style={estilos.videoTexto}>
                    Abra o vídeo no visualizador do aparelho para assistir em tela cheia.
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    onPress={abrirVideo}
                    style={({ pressed }) => [
                      estilos.abrirVideo,
                      pressed && { opacity: 0.85 },
                    ]}
                  >
                    <Ionicons name="play-circle" size={20} color={colors.primaryInk} />
                    <Text style={estilos.abrirVideoTexto}>Abrir vídeo em tela cheia</Text>
                  </Pressable>
                </View>
              ) : falhou ? (
                <View style={estilos.videoFallback}>
                  <Ionicons name="image-outline" size={36} color={colors.textMuted} />
                  <Text style={estilos.videoTitulo}>Demonstração indisponível</Text>
                  <Text style={estilos.videoTexto}>
                    Não foi possível carregar esta mídia agora.
                  </Text>
                </View>
              ) : (
                <Image
                  source={{ uri: atual?.url }}
                  style={estilos.imagemGrande}
                  resizeMode="contain"
                  onError={() => setFalhou(true)}
                  accessibilityLabel={`Execução ampliada de ${atual?.nome}`}
                />
              )}
            </View>

            {midias.length > 1 ? (
              <View style={estilos.seletorArea}>
                <Text style={estilos.seletorTitulo}>Outros exercícios</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={estilos.seletorConteudo}
                >
                  {midias.map((midia, index) => {
                    const ativo = index === selecionado
                    const itemVideo = ehVideoDireto(midia.url)
                    return (
                      <Pressable
                        key={midia.id}
                        accessibilityRole="button"
                        accessibilityLabel={`Ver execução de ${midia.nome}`}
                        onPress={() => selecionar(index)}
                        style={[
                          estilos.thumb,
                          ativo && estilos.thumbAtivo,
                        ]}
                      >
                        {itemVideo ? (
                          <View style={estilos.thumbPlaceholder}>
                            <Ionicons name="videocam" size={20} color={colors.primary} />
                          </View>
                        ) : (
                          <Image
                            source={{ uri: midia.url }}
                            style={estilos.thumbImagem}
                            resizeMode="cover"
                          />
                        )}
                        <View style={estilos.thumbTextoWrap}>
                          <Text style={[estilos.thumbNome, ativo && estilos.thumbNomeAtivo]} numberOfLines={1}>
                            {midia.nome}
                          </Text>
                        </View>
                      </Pressable>
                    )
                  })}
                </ScrollView>
              </View>
            ) : null}
          </View>
        </View>
      </Modal>
    </>
  )
}

const estilos = StyleSheet.create({
  botaoFlutuante: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    zIndex: 20,
    minWidth: 176,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    borderRadius: radius.lg,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  botaoFlutuantePressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  botaoFlutuanteIcone: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  botaoFlutuanteTitulo: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
  },
  botaoFlutuanteMeta: {
    color: colors.textMuted,
    fontSize: 9,
    marginTop: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.94)',
    paddingHorizontal: spacing.lg,
    paddingVertical: 34,
    justifyContent: 'center',
  },
  modalCard: {
    maxHeight: '94%',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  modalKicker: {
    ...typography.label,
    color: colors.primary,
    fontSize: 9,
  },
  modalTitulo: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
    marginTop: 3,
  },
  fechar: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  visualizacao: {
    minHeight: 300,
    maxHeight: 520,
    aspectRatio: 1,
    width: '100%',
    alignSelf: 'center',
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagemGrande: {
    width: '100%',
    height: '100%',
  },
  videoFallback: {
    padding: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  videoIcone: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  videoTitulo: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  videoTexto: {
    color: colors.textMuted,
    ...typography.body,
    textAlign: 'center',
    maxWidth: 280,
  },
  abrirVideo: {
    marginTop: spacing.md,
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
  },
  abrirVideoTexto: {
    color: colors.primaryInk,
    fontSize: 13,
    fontWeight: '800',
  },
  seletorArea: {
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  seletorTitulo: {
    ...typography.label,
    color: colors.textMuted,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    fontSize: 9,
  },
  seletorConteudo: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  thumb: {
    width: 112,
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surfaceSubtle,
  },
  thumbAtivo: {
    borderColor: colors.primary,
  },
  thumbImagem: {
    width: '100%',
    height: 76,
    backgroundColor: '#000',
  },
  thumbPlaceholder: {
    width: '100%',
    height: 76,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
  },
  thumbTextoWrap: {
    paddingHorizontal: 8,
    paddingVertical: 7,
  },
  thumbNome: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
  },
  thumbNomeAtivo: {
    color: colors.primary,
  },
})
