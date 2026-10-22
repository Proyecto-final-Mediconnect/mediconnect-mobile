import { formatPrice } from '../appointments/lib/appointments';
import type { Appointment } from '../appointments/types';

/**
 * Política de cancelación de un profesional (ENG-67), tal como viaja en
 * `GET /professionals/:id`.
 *
 * - Cancelando con `hoursFullRefund` horas o más de anticipación: 100 %.
 * - Con `hoursPartialRefund` horas o más: `partialRefundPercent` %.
 * - Con menos: nada.
 */
export interface CancellationPolicy {
  hoursFullRefund: number;
  hoursPartialRefund: number;
  partialRefundPercent: number;
}

const MAX_REFUND_PERCENT = 100;

/**
 * Qué porcentaje se devuelve cancelando en `now` un turno de `scheduledAt`. La
 * misma cuenta que el backend y la web: en el borde exacto gana el paciente, y
 * un turno ya pasado devuelve 0.
 */
export function refundPercentFor(policy: CancellationPolicy, scheduledAt: Date, now: Date): number {
  const hoursUntil = (scheduledAt.getTime() - now.getTime()) / 3_600_000;

  if (hoursUntil < 0) return 0;
  if (hoursUntil >= policy.hoursFullRefund) return MAX_REFUND_PERCENT;
  if (hoursUntil >= policy.hoursPartialRefund) return policy.partialRefundPercent;
  return 0;
}

function horas(n: number): string {
  return n === 1 ? '1 hora' : `${n} horas`;
}

/**
 * La política en palabras, igual que en la web (ENG-171).
 *
 * Los tramos que nunca se aplican no se cuentan: un parcial del 0 % o con las
 * mismas horas que el total, y un parcial del 100 % es una devolución total con
 * menos anticipación.
 */
export function describePolicy(policy: CancellationPolicy): string {
  const { partialRefundPercent: pct } = policy;
  const total = pct === MAX_REFUND_PERCENT ? policy.hoursPartialRefund : policy.hoursFullRefund;
  const hayParcial = pct > 0 && pct < MAX_REFUND_PERCENT && policy.hoursPartialRefund < total;

  if (total === 0) {
    return 'Podés cancelar hasta el horario del turno y te devolvemos el 100 %.';
  }

  const partes = [`Si cancelás con ${horas(total)} o más de anticipación, te devolvemos el 100 %.`];
  let minimo = total;

  if (hayParcial) {
    const parcial = policy.hoursPartialRefund;
    partes.push(
      parcial === 0
        ? `Con menos de ${horas(total)}, el ${pct} %.`
        : `Entre ${horas(total)} y ${horas(parcial)} antes, el ${pct} %.`,
    );
    minimo = parcial;
  }

  if (minimo > 0) partes.push(`Con menos de ${horas(minimo)}, no hay devolución.`);

  return partes.join(' ');
}

/**
 * Lo que se le dice al paciente antes de cancelar un turno **pagado**: cuánto
 * le corresponde según la política. `null` si el turno no está pagado (no hay
 * nada que devolver) o si no se sabe la política: mejor no decir un porcentaje
 * que decir uno falso.
 *
 * Mientras no esté ENG-65 la devolución no se pide sola, y el texto no lo
 * promete.
 */
export function refundNotice(
  appointment: Appointment,
  policy: CancellationPolicy | undefined,
  now: Date,
): string | null {
  if (appointment.status !== 'CONFIRMADO' || !policy) return null;

  const pct = refundPercentFor(policy, new Date(appointment.scheduledAt), now);
  if (pct === 0) {
    return 'Según la política del profesional, si cancelás ahora no te corresponde devolución.';
  }

  const monto = formatPrice((appointment.price * pct) / 100);
  return `Según la política del profesional, te corresponde ${
    pct === MAX_REFUND_PERCENT ? 'la devolución total' : `el ${pct} %`
  } (${monto}). Por ahora la devolución no se hace sola: se gestiona aparte.`;
}
