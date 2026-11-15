import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AppState } from 'react-native';

import { fetchMyNotifications, markNotificationRead } from '../api';
import type { InAppInbox } from '../types';

export const NOTIFICATIONS_KEY = ['notifications', 'me'] as const;

/**
 * Cada cuánto se vuelven a pedir los avisos con la app abierta. Más seguido que
 * la web (un minuto): "Abrieron tu MediPass" tiene que aparecer mientras el
 * médico todavía está mirando, para poder cortarle el acceso.
 */
export const NOTIFICATIONS_REFRESH_MS = 20_000;

/** La bandeja de avisos. Con la pantalla apagada no se consulta nada. */
export function useMyNotifications() {
  return useQuery({
    queryKey: NOTIFICATIONS_KEY,
    queryFn: fetchMyNotifications,
    refetchInterval: () => (AppState.currentState === 'active' ? NOTIFICATIONS_REFRESH_MS : false),
  });
}

/**
 * Marca un aviso como leído. Optimista, como en la web: el contador baja al
 * tocar, y si el pedido falla vuelve a lo que había.
 */
export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markNotificationRead,
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: NOTIFICATIONS_KEY });
      const previous = queryClient.getQueryData<InAppInbox>(NOTIFICATIONS_KEY);
      if (previous) {
        const ahora = new Date().toISOString();
        let marcados = 0;
        const notifications = previous.notifications.map((n) => {
          if (n.id !== id || n.readAt) return n;
          marcados += 1;
          return { ...n, readAt: ahora };
        });
        queryClient.setQueryData<InAppInbox>(NOTIFICATIONS_KEY, {
          unreadCount: Math.max(0, previous.unreadCount - marcados),
          notifications,
        });
      }
      return { previous };
    },
    onError: (_error, _id, context) => {
      if (context?.previous) queryClient.setQueryData(NOTIFICATIONS_KEY, context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY }),
  });
}
