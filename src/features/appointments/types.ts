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
  /** Quién canceló (ADR-018): `PACIENTE`, `PROFESIONAL` o `SISTEMA`. Falta con
   *  un backend anterior a ENG-204. */
  cancelledBy?: string | null;
  /** El motivo que dio el profesional al cancelar (ENG-204). */
  cancellationReason?: string | null;
  /** Hasta cuándo se puede elegir en un turno `A_REPROGRAMAR` (ISO-8601). */
  reprogramDeadline?: string | null;
  /**
   * ENG-237: por qué quedó a reprogramar si no fue una cancelación a mano: el
   * profesional no se conectó (`AUSENCIA_PROFESIONAL`) o informó una falla
   * técnica (`FALLA_TECNICA`). `null` o ausente es una cancelación.
   */
  reprogramCause?: 'AUSENCIA_PROFESIONAL' | 'FALLA_TECNICA' | null;
  /** Cuándo se movió de horario (ENG-66), o `null` si nunca: se reprograma una sola vez. */
  rescheduledAt?: string | null;
  /** En qué quedó el reembolso de un turno cancelado o liberado que estaba pago
   *  (ENG-174). `null` si no hubo; falta con un backend anterior. */
  refundState?: AppointmentRefundState | null;
}

/** El reembolso de un turno, tal como quedó registrado (ENG-174). */
export interface AppointmentRefundState {
  /** El total de los reembolsos del turno, en pesos. El backend suma los
   *  `Decimal` y lo manda ya como número (backend#89), no como string. */
  amount: number;
  status: RefundOutcome;
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
/** Lo que devuelve pedir el reembolso total de un turno a reprogramar (ENG-204). */
export interface FullRefundResult {
  id: string;
  status: 'CANCELADO';
  refund: CancellationRefund;
}

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
