import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef, useState, type ComponentRef } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { colors, fonts, fontSize, spacing } from '../../../shared/ui/theme';
import { CHAT_INBOX_KEY } from '../../chat/hooks/use-chat';
import type { ConversationInbox } from '../../chat/types';
import { useMarkNotificationRead, useMyNotifications } from '../hooks/use-notifications';
import { badgeText, targetOf } from '../lib/notifications';
import type { InAppNotification } from '../types';
import { NotificationsPanel } from './NotificationsPanel';

/**
 * La campanita del inicio, la misma que la de la web (ENG-69): muestra cuántos
 * avisos hay sin leer y, al tocarla, despliega la lista debajo. Va sobre la
 * franja oscura.
 *
 * El contador es el del servidor, no el de la lista, que trae solo los últimos.
 *
 * Tocar un aviso lo marca como leído y lleva a donde se resuelve: el turno, el
 * MediPass para cortar un acceso, o el chat.
 */
export function NotificationsBell(): React.JSX.Element {
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const bandeja = useMyNotifications();
  const marcarLeido = useMarkNotificationRead();
  const { width } = useWindowDimensions();
  const { refetch } = bandeja;
  const boton = useRef<ComponentRef<typeof Pressable>>(null);
  const [abierto, setAbierto] = useState(false);
  const [ancla, setAncla] = useState<{ top: number; centerX: number }>({
    top: 0,
    centerX: 0,
  });

  // Al volver al inicio el número tiene que estar al día.
  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch]),
  );

  // Una respuesta con otra forma no rompe el inicio: sin número.
  const sinLeer = typeof bandeja.data?.unreadCount === 'number' ? bandeja.data.unreadCount : 0;

  const abrirPanel = (): void => {
    void refetch();
    // El panel baja desde la campanita: se mide dónde quedó en la pantalla.
    const medido = (x: number, y: number, w: number, h: number): void => {
      setAncla({ top: y + h, centerX: x + w / 2 });
      setAbierto(true);
    };
    if (boton.current?.measureInWindow) boton.current.measureInWindow(medido);
    else {
      setAncla({ top: 0, centerX: width - spacing.md - 20 });
      setAbierto(true);
    }
  };

  const abrirAviso = (n: InAppNotification): void => {
    if (n.readAt === null) marcarLeido.mutate(n.id);
    setAbierto(false);
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

  return (
    <>
      <Pressable
        ref={boton}
        accessibilityRole="button"
        accessibilityLabel={sinLeer > 0 ? `Avisos, ${sinLeer} sin leer` : 'Avisos'}
        accessibilityState={{ expanded: abierto }}
        hitSlop={spacing.xs}
        onPress={abrirPanel}
        style={({ pressed }) => [styles.boton, (pressed || abierto) && styles.presionado]}
      >
        <Ionicons
          name={sinLeer > 0 ? 'notifications' : 'notifications-outline'}
          size={20}
          color={colors.white}
        />
        {sinLeer > 0 ? (
          <View style={styles.globo} accessibilityElementsHidden importantForAccessibility="no">
            <Text style={styles.globoTexto}>{badgeText(sinLeer)}</Text>
          </View>
        ) : null}
      </Pressable>

      <NotificationsPanel
        visible={abierto}
        anchor={ancla}
        inbox={bandeja.data}
        loading={bandeja.isPending}
        error={bandeja.isError && !bandeja.data ? bandeja.error.message : null}
        onRetry={() => void refetch()}
        onOpen={abrirAviso}
        onDismiss={() => setAbierto(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  boton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.nightIcon,
  },
  presionado: { backgroundColor: colors.nightTrack },
  globo: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.danger,
    borderWidth: 1.5,
    borderColor: colors.night,
  },
  globoTexto: {
    fontFamily: fonts.bold,
    fontSize: fontSize.micro,
    lineHeight: 12,
    color: colors.white,
  },
});
