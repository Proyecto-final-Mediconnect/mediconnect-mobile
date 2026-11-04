import { apiRequest } from '../../shared/lib/api-client';

/** La frase que pide el backend para dar de baja la cuenta (ENG-86). */
export const FRASE_DE_BAJA = 'ELIMINAR MI CUENTA';

export interface Preferences {
  recordatoriosPorEmail: boolean;
}

/** `GET /me/preferences` (derecho de oposición, ENG-86). */
export function fetchPreferences(): Promise<Preferences> {
  return apiRequest<Preferences>('/me/preferences', {
    fallbackMessage: 'No pudimos cargar tus preferencias.',
  });
}

/** `PUT /me/preferences`. */
export function savePreferences(preferences: Preferences): Promise<Preferences> {
  return apiRequest<Preferences>('/me/preferences', {
    method: 'PUT',
    body: preferences,
    fallbackMessage: 'No pudimos guardar el cambio.',
  });
}

/** `DELETE /me` (derecho de supresión, ENG-86). */
export function deleteMyAccount(): Promise<void> {
  return apiRequest<void>('/me', {
    method: 'DELETE',
    body: { confirmacion: FRASE_DE_BAJA },
    fallbackMessage: 'No pudimos dar de baja tu cuenta. Probá de nuevo.',
  });
}
