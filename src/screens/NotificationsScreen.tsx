import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CHAT_INBOX_KEY } from '../features/chat/hooks/use-chat';
import type { ConversationInbox } from '../features/chat/types';
import {
  useMarkNotificationRead,
  useMyNotifications,
} from '../features/notifications/hooks/use-notifications';
import { relativeTime, targetOf } from '../features/notifications/lib/notifications';
import type { InAppNotification } from '../features/notifications/types';
import { useNow } from '../shared/hooks/use-now';
import { Screen, ScreenHeader } from '../shared/ui/Screen';
import { EmptyState, ErrorState, LoadingState } from '../shared/ui/StatusViews';
import { colors, fonts, fontSize, radius, spacing } from '../shared/ui/theme';

/**
 * Avisos: la campanita de la web en la app (ENG-69). Los mismos avisos —pago
 * acreditado, recordatorios, turno cancelado, alguien abrió el MediPass,
 * mensaje nuevo— del más nuevo al más viejo, con los sin leer resaltados.
 *
 * Tocar uno lo marca como leído y lleva a donde se resuelve: el turno, el
 * MediPass para cortar un acceso, o el chat.
 */
export function NotificationsScreen(): React.JSX.Element {
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const bandeja = useMyNotifications();
  const marcarLeido = useMarkNotificationRead();
  const ahora = useNow(60_000);
  const { refetch } = bandeja;

  // Al entrar se pide de nuevo: lo que llegó desde la última consulta aparece ya.
  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch]),
  );

  const abrir = (n: InAppNotification): void => {
    if (n.readAt === null) marcarLeido.mutate(n.id);
    const destino = targetOf(n);
    if (!destino) return;
    if (destino.kind === 'medipass') {
      navigation.navigate('Paciente', { screen: 'MediPass' });
    } else if (destino.kind === 'turno') {
      navigation.navigate('Turno', { appointmentId: destino.appointmentId });
    } else {
      // El aviso trae solo la conversación; el nombre sale de la bandeja del
      // chat. Si todavía no está, se abre la bandeja.
      const chat = queryClient
        .getQueryData<ConversationInbox>(CHAT_INBOX_KEY)
        ?.conversaciones.find((c) => c.id === destino.conversationId);
      if (chat) {
        navigation.navigate('Conversacion', {
          contraparteId: chat.contraparte.id,
          nombre: chat.contraparte.nombre,
          conversationId: chat.id,
        });
      } else {
        navigation.navigate('Mensajes');
      }
    }
  };

  const header = <ScreenHeader title="Avisos" onBack={() => navigation.goBack()} />;

  if (bandeja.isPending) {
    return (
      <Screen header={header} scroll={false}>
        <LoadingState label="Buscando tus avisos…" />
      </Screen>
    );
  }

  if (bandeja.isError) {
    return (
      <Screen header={header} scroll={false}>
        <ErrorState message={bandeja.error.message} onRetry={() => void refetch()} />
      </Screen>
    );
  }

  const avisos = Array.isArray(bandeja.data.notifications) ? bandeja.data.notifications : [];

  if (avisos.length === 0) {
    return (
      <Screen header={header} scroll={false}>
        <EmptyState
          icon="notifications-outline"
          title="No tenés avisos todavía"
          description="Acá te avisamos cuando se acredita un pago, se acerca un turno o alguien abre tu MediPass."
        />
      </Screen>
    );
  }

  return (
    <Screen header={header}>
      <View style={styles.grupo}>
        {avisos.map((n, i) => {
          const sinLeer = n.readAt === null;
          return (
            <Pressable
              key={n.id}
              accessibilityRole="button"
              accessibilityLabel={`${sinLeer ? 'Sin leer: ' : ''}${n.title}. ${n.body}`}
              onPress={() => abrir(n)}
              style={({ pressed }) => [
                styles.fila,
                sinLeer && styles.filaSinLeer,
                i < avisos.length - 1 && styles.filaBorde,
                pressed && styles.presionada,
              ]}
            >
              <View style={styles.filaArriba}>
                <Text style={[styles.titulo, styles.flex]}>{n.title}</Text>
                {sinLeer ? <View style={styles.punto} /> : null}
              </View>
              <Text style={styles.cuerpo}>{n.body}</Text>
              <Text style={styles.hora}>{relativeTime(ahora, n.createdAt)}</Text>
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  grupo: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.card,
    overflow: 'hidden',
  },
  fila: {
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  filaSinLeer: { backgroundColor: colors.surfaceTeal },
  filaBorde: { borderBottomWidth: 1, borderBottomColor: colors.lineSoft },
  presionada: { backgroundColor: colors.surfaceTeal },
  filaArriba: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  titulo: { fontFamily: fonts.bold, fontSize: fontSize.md, color: colors.brandDeep },
  punto: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.brand },
  cuerpo: { fontFamily: fonts.regular, fontSize: fontSize.sm, lineHeight: 19, color: colors.ink },
  hora: { fontFamily: fonts.medium, fontSize: fontSize.xs, color: colors.mutedSoft },
});
