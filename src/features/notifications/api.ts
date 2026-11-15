import { apiRequest } from '../../shared/lib/api-client';
import type { InAppInbox } from './types';

/* API de los avisos: los mismos endpoints que la campanita de la web (ENG-69). */

/** `GET /notifications/me`: los últimos avisos y cuántos están sin leer. */
export function fetchMyNotifications(): Promise<InAppInbox> {
  return apiRequest<InAppInbox>('/notifications/me', {
    fallbackMessage: 'No pudimos cargar tus avisos.',
  });
}

/** `PATCH /notifications/:id/read`: marca un aviso propio como leído. */
export function markNotificationRead(id: string): Promise<void> {
  return apiRequest<void>(`/notifications/${encodeURIComponent(id)}/read`, {
    method: 'PATCH',
    fallbackMessage: 'No pudimos marcar el aviso como leído.',
  });
}
