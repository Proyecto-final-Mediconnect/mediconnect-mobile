import { createNavigationContainerRef } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';

import {
  messagePushData,
  registerForPush,
  type MessagePushData,
} from '../infrastructure/notifications/push';
import type { RootStackParamList } from './types';

/**
 * El navegador, accesible desde fuera de las pantallas: tocar una notificación
 * pasa fuera del árbol de React Navigation.
 */
export const navigationRef = createNavigationContainerRef<RootStackParamList>();

type Route = { name: string; params?: object } | undefined;

/** Si el paciente está mirando justo esa conversación: ahí el aviso sobra. */
export function isViewingConversation(route: Route, conversationId: string): boolean {
  return (
    route?.name === 'Conversacion' &&
    (route.params as { conversationId?: string } | undefined)?.conversationId === conversationId
  );
}

/** A dónde lleva tocar el aviso de un mensaje: la conversación, no el inicio. */
export function conversationRoute(data: MessagePushData): RootStackParamList['Conversacion'] {
  return {
    contraparteId: data.contraparteId,
    nombre: data.nombre,
    conversationId: data.conversationId,
  };
}

// Con la app abierta, el aviso se muestra salvo que ya esté en esa conversación
// (ahí el mensaje llega solo). Va a nivel de módulo: el handler tiene que estar
// antes de que llegue el primer aviso.
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const data = messagePushData(notification.request.content.data);
    const hidden =
      data !== null && isViewingConversation(navigationRef.getCurrentRoute(), data.conversationId);
    return {
      shouldShowBanner: !hidden,
      shouldShowList: !hidden,
      shouldPlaySound: !hidden,
      shouldSetBadge: false,
    };
  },
});

/**
 * Registra el push al iniciar sesión y lleva a la conversación al tocar un
 * aviso, también si la app estaba cerrada (el aviso que la abrió).
 *
 * El toque puede llegar antes de que haya sesión o de que el navegador esté
 * listo (la app arranca desde el aviso): queda pendiente y se usa apenas se
 * pueda. Sin sesión no se navega: después del ingreso sí.
 */
export function usePushNotifications(signedIn: boolean, navigationReady: boolean): void {
  const pending = useRef<MessagePushData | null>(null);
  // Los listeners se instalan una vez: leen el estado actual por estos refs.
  const listo = useRef(false);
  listo.current = signedIn && navigationReady;

  const openPending = useRef(() => {
    const data = pending.current;
    if (!data || !listo.current || !navigationRef.isReady()) return;
    pending.current = null;
    // Si no, al volver a abrir la app desde el ícono llevaría otra vez a este chat.
    void Notifications.clearLastNotificationResponseAsync();
    navigationRef.navigate('Conversacion', conversationRoute(data));
  }).current;

  useEffect(() => {
    if (signedIn) void registerForPush();
  }, [signedIn]);

  useEffect(() => {
    let vigente = true;
    const recibir = (response: Notifications.NotificationResponse | null): void => {
      if (!vigente || !response) return;
      pending.current = messagePushData(response.notification.request.content.data);
      openPending();
    };
    void Notifications.getLastNotificationResponseAsync().then(recibir);
    const subscription = Notifications.addNotificationResponseReceivedListener(recibir);
    return () => {
      vigente = false;
      subscription.remove();
    };
  }, [openPending]);

  // Recién con sesión y navegador listos se abre lo que quedó pendiente.
  useEffect(() => {
    openPending();
  }, [signedIn, navigationReady, openPending]);
}
