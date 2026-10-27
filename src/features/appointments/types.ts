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
  /**
   * Cuándo se reservó y cuándo se canceló, ISO-8601. Opcionales: un backend
   * anterior a que se expusieran no los manda, y el detalle se arregla sin ellos.
   */
  createdAt?: string | null;
  cancelledAt?: string | null;
}

/* Disponibilidad y reserva (ENG-133): `GET /professionals/:id/availability` y `POST /appointments`. */

/** Qué pasó con el reembolso de una cancelación (ENG-65). */
export type RefundOutcome = 'PROCESADO' | 'PENDIENTE' | 'RECHAZADO';

/**
 * Cuánto le corresponde al paciente si cancela, y qué pasó con eso (ENG-65).
 * `status` es `null` cuando no hay nada que devolver: el turno no estaba pago
 * o la política da 0 %. En la cotización, antes de cancelar, siempre es `null`.
 */
export interface CancellationRefund {
  percent: number;
  amount: number;
  status: RefundOutcome | null;
}

/** Lo que devuelve `PATCH /appointments/:id/cancel`. `refund` falta con un
 *  backend anterior a ENG-65. */
export interface CancelledAppointment extends Appointment {
  refund?: CancellationRefund;
}

export type SlotStatus = 'AVAILABLE' | 'BOOKED' | 'BLOCKED' | 'PAST';

export interface AvailabilitySlot {
  /** `HH:MM`, hora de Argentina. */
  startTime: string;
  durationMinutes: number;
  status: SlotStatus;
}

export interface AvailabilityDay {
  /** `YYYY-MM-DD`, en Argentina. */
  date: string;
  weekday: number;
  fullyBlocked: boolean;
  slots: AvailabilitySlot[];
}

export interface Availability {
  professional: {
    id: string;
    firstName: string;
    lastName: string;
    consultationPrice: number | null;
    currency: string;
  };
  from: string;
  to: string;
  days: AvailabilityDay[];
}

export interface BookAppointmentInput {
  professionalId: string;
  date: string;
  startTime: string;
}
