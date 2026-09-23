/**
 * Tipos de turnos, portados de `mediconnect-web` (`features/appointments/types`).
 * Espejan lo que devuelve `GET /appointments/me`: si el backend cambia, cambian
 * los dos.
 */

export interface AppointmentParty {
  id: string;
  firstName: string;
  lastName: string;
}

export interface Appointment {
  id: string;
  /** Instante ISO-8601 en UTC. */
  scheduledAt: string;
  /** Fecha y hora locales: las que el paciente eligió. `YYYY-MM-DD` y `HH:MM`. */
  date: string;
  startTime: string;
  durationMinutes: number;
  price: number;
  currency: string;
  status: string;
  professional: AppointmentParty | null;
  patient: AppointmentParty | null;
}
