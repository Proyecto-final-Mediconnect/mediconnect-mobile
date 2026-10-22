import { apiRequest } from '../../shared/lib/api-client';
import type {
  Appointment,
  Availability,
  BookAppointmentInput,
  CancellationRefund,
  CancelledAppointment,
} from './types';

/* API de turnos: los mismos endpoints que usa la web. */

/** `GET /appointments/me`: los turnos del paciente de la sesión. */
export function fetchMyAppointments(): Promise<Appointment[]> {
  return apiRequest<Appointment[]>('/appointments/me', {
    fallbackMessage: 'No se pudieron cargar tus turnos.',
  });
}

/**
 * `PATCH /appointments/:id/cancel`: devuelve el turno ya en `CANCELADO` y, desde
 * ENG-65, lo que se devolvió. Sin body: el backend corre con
 * `forbidNonWhitelisted` y mandar uno daría 400.
 */
export function cancelAppointment(id: string): Promise<CancelledAppointment> {
  return apiRequest<CancelledAppointment>(`/appointments/${id}/cancel`, {
    method: 'PATCH',
    fallbackMessage: 'No se pudo cancelar el turno.',
  });
}

/**
 * `GET /appointments/:id/cancellation-quote` (ENG-65): cuánto se devolvería si
 * se cancela ahora, con la política que quedó guardada en el turno al
 * reservarlo. No cancela nada.
 */
export function fetchCancellationQuote(id: string): Promise<CancellationRefund> {
  return apiRequest<CancellationRefund>(`/appointments/${id}/cancellation-quote`, {
    fallbackMessage: 'No pudimos calcular la devolución.',
  });
}

/** `GET /professionals/:id/availability`: los horarios del profesional entre dos fechas. */
export function fetchAvailability(
  professionalId: string,
  from: string,
  to: string,
): Promise<Availability> {
  const query = new URLSearchParams({ from, to });
  return apiRequest<Availability>(
    `/professionals/${encodeURIComponent(professionalId)}/availability?${query.toString()}`,
    { fallbackMessage: 'No se pudo cargar la disponibilidad.' },
  );
}

/**
 * `POST /appointments`: reserva el turno, que queda en `RESERVADO_SIN_PAGAR`.
 * Fecha y hora son las de Argentina, las que eligió el paciente.
 */
export function bookAppointment(input: BookAppointmentInput): Promise<Appointment> {
  return apiRequest<Appointment>('/appointments', {
    method: 'POST',
    body: input,
    fallbackMessage: 'No se pudo reservar el turno.',
  });
}
