import type { Appointment } from '../types';

/**
 * Cuándo se puede entrar a la videoconsulta de un turno. Portado tal cual de
 * `mediconnect-web` (`features/video/lib/joinWindow.ts`, ENG-56).
 *
 * Lógica pura, sin React, para poder testear los bordes del reloj sin montar
 * componentes — mismo criterio que `appointments.ts`.
 *
 * **Esto no autoriza nada.** Decide si se dibuja el botón; quien decide si se
 * entra es el backend, que revalida exactamente lo mismo en
 * `video-consultation.service.ts`. Existe acá para no tener que preguntarle al
 * servidor en cada tick del reloj, no para ahorrarle la validación.
 */

/**
 * Estados del turno que tienen videoconsulta. Espeja `JOINABLE_STATUSES`.
 *
 * `RESERVADO_SIN_PAGAR` también tiene sala, pero no se entra hasta pagar
 * (ENG-147): ver `UNPAID` en {@link JoinState}.
 */
const JOINABLE_STATUSES = ['RESERVADO_SIN_PAGAR', 'CONFIRMADO'];

export type JoinState =
  /** Todavía falta: se muestra a partir de cuándo se va a poder entrar. */
  | { kind: 'TOO_EARLY'; opensAt: Date }
  | { kind: 'OPEN' }
  | { kind: 'CLOSED' }
  /**
   * Turno sin pagar que todavía no terminó: en vez de entrar, hay que pagar. El
   * backend responde 409 "Pagá el turno para entrar a la consulta." (ENG-147).
   */
  | { kind: 'UNPAID' }
  /** Cancelado o liberado: no hay consulta que abrir. */
  | { kind: 'NOT_APPLICABLE' };

/**
 * Lo que ve el paciente en un turno sin pagar, junto al botón que lleva a `Pago`
 * (ENG-168).
 */
export const UNPAID_JOIN_MESSAGE = 'Pagá el turno para entrar a la consulta.';

export interface JoinWindow {
  opensAt: Date;
  closesAt: Date;
}

/**
 * La ventana viene en el turno (`joinOpensAt` y `joinClosesAt`, ENG-229), con
 * las reglas del backend: la app no las repite. Son instantes ISO-8601, así que
 * compararlos no depende del huso del teléfono.
 */
export function joinWindowFor(appointment: Appointment): JoinWindow {
  return {
    opensAt: new Date(appointment.joinOpensAt),
    closesAt: new Date(appointment.joinClosesAt),
  };
}

export function joinStateOf(appointment: Appointment, now: Date = new Date()): JoinState {
  if (!JOINABLE_STATUSES.includes(appointment.status)) {
    return { kind: 'NOT_APPLICABLE' };
  }

  const { opensAt, closesAt } = joinWindowFor(appointment);

  if (now > closesAt) return { kind: 'CLOSED' };
  if (appointment.status === 'RESERVADO_SIN_PAGAR') return { kind: 'UNPAID' };
  if (now < opensAt) return { kind: 'TOO_EARLY', opensAt };

  return { kind: 'OPEN' };
}

export function canJoin(appointment: Appointment, now: Date = new Date()): boolean {
  return joinStateOf(appointment, now).kind === 'OPEN';
}

/**
 * Cuánto falta para que abra la sala, en texto.
 *
 * Se redondea hacia arriba para no decir "en 0 minutos" durante los últimos 59
 * segundos, que es cuando el usuario está mirando la pantalla esperando el botón.
 */
export function timeUntilOpen(opensAt: Date, now: Date = new Date()): string {
  const minutes = Math.ceil((opensAt.getTime() - now.getTime()) / 60_000);

  if (minutes <= 1) return 'en menos de un minuto';
  if (minutes < 60) return `en ${minutes} minutos`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours === 1 ? 'en una hora' : `en ${hours} horas`;

  const days = Math.round(hours / 24);
  return days === 1 ? 'mañana' : `en ${days} días`;
}

/**
 * El primer turno al que se puede entrar ahora mismo.
 *
 * Sirve para el ítem de videoconsulta del menú lateral: la videoconsulta no es
 * una sección que se navega, es un momento. El menú la ofrece cuando hay algo a
 * lo que entrar y no antes.
 *
 * Si hubiera dos solapados —no debería, pero el backend no lo impide— gana el
 * más cercano en el tiempo, que es el que la persona está por atender.
 */
export function firstJoinable(
  appointments: Appointment[],
  now: Date = new Date(),
): Appointment | null {
  const abiertos = appointments
    .filter((appointment) => canJoin(appointment, now))
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

  return abiertos[0] ?? null;
}
