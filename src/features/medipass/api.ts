import { apiRequest } from '../../shared/lib/api-client';
import type { MediPassAccess, MediPassCode, VitalBlock } from './types';

/* API del MediPass: los mismos endpoints que usa la web. */

/**
 * `GET /medipass/me`: el código vigente (ENG-72). **No se guarda en el
 * teléfono**: vive en la caché en memoria mientras se muestra (ENG-117).
 */
export function fetchMyCode(): Promise<MediPassCode> {
  return apiRequest<MediPassCode>('/medipass/me', {
    fallbackMessage: 'No pudimos cargar tu código MediPass.',
  });
}

/** `GET /medipass/me/vital`: lo que ve quien escanea el código (ENG-103). */
export function fetchVitalBlock(): Promise<VitalBlock> {
  return apiRequest<VitalBlock>('/medipass/me/vital', {
    fallbackMessage: 'No pudimos cargar tu información vital.',
  });
}

/** `GET /medipass/me/accesses`: quién está mirando ahora (ENG-74). */
export function fetchAccesses(): Promise<MediPassAccess[]> {
  return apiRequest<MediPassAccess[]>('/medipass/me/accesses', {
    fallbackMessage: 'No pudimos cargar quién está mirando tu MediPass.',
  });
}

/**
 * `DELETE /medipass/me/accesses/:id`: corta un acceso (ENG-75). Es idempotente:
 * cortar uno que ya venció también da 204.
 */
export function revokeAccess(id: string): Promise<void> {
  return apiRequest<void>(`/medipass/me/accesses/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    fallbackMessage: 'No pudimos revocar el acceso. Probá de nuevo.',
  });
}
