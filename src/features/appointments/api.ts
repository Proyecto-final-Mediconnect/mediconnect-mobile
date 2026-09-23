import { conDemora } from '../../mocks/demo';
import { turnosDemo } from '../../mocks/appointments';
import type { Appointment } from './types';

/*
 * API de turnos. Hoy sale de los datos de ejemplo (ver `src/mocks/demo.ts`).
 *
 * Con la sesión de ENG-114 cada función pasa a su endpoint, los mismos que usa
 * la web:
 *   fetchMyAppointments  → GET   /appointments/me
 *   cancelAppointment    → PATCH /appointments/:id/cancel
 */

export function fetchMyAppointments(): Promise<Appointment[]> {
  return conDemora(turnosDemo.listar());
}

export function cancelAppointment(id: string): Promise<Appointment> {
  return conDemora(turnosDemo.cancelar(id));
}
