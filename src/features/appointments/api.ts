import { apiRequest } from '../../shared/lib/api-client';
import type { Appointment } from './types';

/* API de turnos: los mismos endpoints que usa la web. */

/** `GET /appointments/me`: los turnos del paciente de la sesión. */
export function fetchMyAppointments(): Promise<Appointment[]> {
  return apiRequest<Appointment[]>('/appointments/me', {
    fallbackMessage: 'No se pudieron cargar tus turnos.',
  });
}

/**
 * `PATCH /appointments/:id/cancel`: devuelve el turno ya en `CANCELADO`. Sin
 * body: el backend corre con `forbidNonWhitelisted` y mandar uno daría 400.
 */
export function cancelAppointment(id: string): Promise<Appointment> {
  return apiRequest<Appointment>(`/appointments/${id}/cancel`, {
    method: 'PATCH',
    fallbackMessage: 'No se pudo cancelar el turno.',
  });
}
