import { apiRequest } from '../../shared/lib/api-client';
import type {
  EmergencyCardCreated,
  EmergencyCardStatus,
  MediPassAccess,
  MediPassCode,
  MediPassScope,
  VitalBlock,
} from './types';

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

/** `GET /medipass/me/scope`: qué bloques ve un consultante externo (ENG-149). */
export function fetchScope(): Promise<MediPassScope> {
  return apiRequest<MediPassScope>('/medipass/me/scope', {
    fallbackMessage: 'No pudimos cargar qué se muestra.',
  });
}

/** `PUT /medipass/me/scope`: cambia qué ve un consultante externo (ENG-149). */
export function saveScope(scope: MediPassScope): Promise<MediPassScope> {
  return apiRequest<MediPassScope>('/medipass/me/scope', {
    method: 'PUT',
    body: scope,
    fallbackMessage: 'No pudimos guardar el cambio, probá de nuevo.',
  });
}

/** `GET /medipass/me/emergency-card`: si hay una tarjeta de emergencia activa (ENG-176). */
export function fetchEmergencyCard(): Promise<EmergencyCardStatus> {
  return apiRequest<EmergencyCardStatus>('/medipass/me/emergency-card', {
    fallbackMessage: 'No pudimos cargar tu tarjeta de emergencia.',
  });
}

/**
 * `POST /medipass/me/emergency-card`: la genera, o una nueva que reemplaza a la
 * anterior (ENG-176). El token llega una sola vez.
 */
export function createEmergencyCard(): Promise<EmergencyCardCreated> {
  return apiRequest<EmergencyCardCreated>('/medipass/me/emergency-card', {
    method: 'POST',
    fallbackMessage: 'No pudimos generar la tarjeta. Probá de nuevo.',
  });
}

/** `DELETE /medipass/me/emergency-card`: la desactiva. Idempotente (ENG-176). */
export function disableEmergencyCard(): Promise<void> {
  return apiRequest<void>('/medipass/me/emergency-card', {
    method: 'DELETE',
    fallbackMessage: 'No pudimos desactivar la tarjeta. Probá de nuevo.',
  });
}
