import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { formatSize } from '../../patient-documents/lib/document-file';
import { colors, fonts, fontSize, spacing } from '../../../shared/ui/theme';
import { getAttachmentUrl } from '../api';
import { attachmentKind } from '../lib/chat';
import type { ChatAttachment } from '../types';

/**
 * La URL firmada dura cinco minutos: se reusa cuatro y después se pide otra, así
 * una foto que se ve y se toca enseguida no hace dos pedidos, y nunca se abre
 * una URL a punto de vencer.
 */
const URL_FRESH_MS = 4 * 60_000;

interface Props {
  conversationId: string;
  messageId: string;
  attachment: ChatAttachment;
  /** Dentro de una burbuja propia (fondo oscuro) o ajena (blanca). */
  mine: boolean;
}

/**
 * El archivo de un mensaje (ENG-102). Una foto se ve en miniatura; un PDF, como
 * una tarjeta con su tamaño. Tocar cualquiera lo abre entero en el navegador
 * dentro de la app, igual que un documento de la historia clínica.
 *
 * No tiene una URL fija: el bucket es privado y cada URL la firma el backend por
 * cinco minutos con la sesión de quien la pide.
 */
export function MessageAttachment({
  conversationId,
  messageId,
  attachment,
  mine,
}: Props): React.JSX.Element {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [abriendo, setAbriendo] = useState(false);
  const foto = attachment.tipo.startsWith('image/');
  const query = {
    queryKey: ['chat', 'attachment', conversationId, messageId] as const,
    queryFn: () => getAttachmentUrl(conversationId, messageId),
    staleTime: URL_FRESH_MS,
    gcTime: URL_FRESH_MS,
  };
  // Solo las fotos piden la URL al dibujarse, para la miniatura. Un PDF, al tocarlo.
  const miniatura = useQuery({ ...query, enabled: foto, retry: false });

  async function abrir(): Promise<void> {
    setError(null);
    setAbriendo(true);
    try {
      const { url } = await queryClient.fetchQuery(query);
      await WebBrowser.openBrowserAsync(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos abrir el archivo.');
    } finally {
      setAbriendo(false);
    }
  }

  const tipo = attachmentKind(attachment);
  const etiqueta = `Abrir ${tipo.toLowerCase()} (${formatSize(attachment.tamano)})`;

  return (
    <View style={styles.contenedor}>
      {foto && miniatura.data ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={etiqueta}
          onPress={() => void abrir()}
          disabled={abriendo}
        >
          <Image
            source={{ uri: miniatura.data.url }}
            style={styles.foto}
            resizeMode="cover"
            accessibilityIgnoresInvertColors
            onError={() => void miniatura.refetch()}
          />
        </Pressable>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={etiqueta}
          onPress={() => void abrir()}
          disabled={abriendo}
          style={({ pressed }) => [
            styles.tarjeta,
            mine ? styles.tarjetaMia : styles.tarjetaSuya,
            pressed && styles.presionada,
          ]}
        >
          <View style={[styles.icono, mine && styles.iconoMio]}>
            <Ionicons
              name={foto ? 'image-outline' : 'document-text-outline'}
              size={20}
              color={mine ? colors.white : colors.brandDeep}
            />
          </View>
          <View>
            <Text style={[styles.tipo, mine && styles.textoMio]}>{tipo}</Text>
            <Text style={[styles.detalle, mine && styles.detalleMio]}>
              {formatSize(attachment.tamano)} · {abriendo ? 'Abriendo…' : 'Tocá para abrir'}
            </Text>
          </View>
        </Pressable>
      )}
      {error ? (
        <Text accessibilityRole="alert" style={[styles.error, mine && styles.textoMio]}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { gap: spacing.xs },
  foto: { width: 220, height: 220, borderRadius: 12, backgroundColor: colors.lineSoft },
  tarjeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minWidth: 190,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 12,
  },
  tarjetaMia: { backgroundColor: 'rgba(255,255,255,0.12)' },
  tarjetaSuya: { backgroundColor: colors.surface },
  presionada: { opacity: 0.8 },
  icono: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  iconoMio: { backgroundColor: 'rgba(255,255,255,0.16)' },
  tipo: { fontFamily: fonts.bold, fontSize: fontSize.sm, color: colors.ink },
  detalle: { fontFamily: fonts.medium, fontSize: fontSize.xs, color: colors.muted },
  textoMio: { color: colors.white },
  detalleMio: { color: 'rgba(255,255,255,0.75)' },
  error: { fontFamily: fonts.semibold, fontSize: fontSize.xs, color: colors.danger },
});
