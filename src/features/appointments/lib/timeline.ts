import * as Sentry from '@sentry/react-native';

import { enArgentina } from '../../../shared/lib/argentina-time';
import type { PaymentStatusView } from '../../payments/types';
import type { Appointment } from '../types';
import { formatPrice, formatShortDay, isActive } from './appointments';

/**
 * "Qué pasó" con un turno, de la reserva a la consulta, para el detalle.
 *
 * Se arma con lo que hay: el estado del turno, el del pago y, si el backend las
 * manda, las fechas de cada paso. Un paso sin fecha se muestra igual —que se
 * pagó importa aunque no se sepa a qué hora—.
 */

export type StepTone = 'done' | 'current' | 'pending' | 'bad';

export interface TimelineStep {
  key: string;
  title: string;
  /** `21 oct · 21:35`, o `null` si no se sabe cuándo. */
  when: string | null;
  tone: StepTone;
}

/** Un instante ISO en hora argentina: `21 oct · 21:35`. */
export function cuando(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const { date, time } = enArgentina(new Date(iso));
  // `formatShortDay` arma `mié 21 oct · 21:35`; acá sobra el día de la semana.
  return formatShortDay(date, time).replace(/^\S+ /, '');
}

/**
 * En qué quedó el reembolso de un turno que se cayó (ENG-174). `null` si no hubo
 * reembolso. Lo usan el detalle y la fila de "Mis turnos".
 */
export function refundStep(appointment: Appointment): { title: string; tone: StepTone } | null {
  const refund = appointment.refundState;
  if (!refund) return null;
  // `amount` es el total de los reembolsos del turno, ya como número (backend#89).
  // Un monto roto no se muestra como "$NaN"; uno en 0 es que no hubo nada que devolver.
  const conMonto = Number.isFinite(refund.amount);
  if (conMonto && refund.amount <= 0) return null;
  const de = conMonto ? ` de ${formatPrice(refund.amount)}` : '';
  switch (refund.status) {
    case 'PENDIENTE':
      return { title: `Pedimos el reembolso${de}`, tone: 'current' };
    case 'PROCESADO':
      return {
        title: conMonto ? `Te devolvimos ${formatPrice(refund.amount)}` : 'Te hicimos el reembolso',
        tone: 'done',
      };
    case 'RECHAZADO':
      return { title: `No se pudo hacer el reembolso${de}`, tone: 'bad' };
    default:
      // El estado viene del backend: uno nuevo no tiene que hacer desaparecer el
      // reembolso. Se avisa a Sentry solo con el estado, sin monto ni turno.
      Sentry.captureMessage('Estado de reembolso desconocido', {
        level: 'warning',
        tags: { refundStatus: String(refund.status) },
      });
      return { title: `Tenés un reembolso${de} en proceso`, tone: 'current' };
  }
}

export function appointmentTimeline(
  appointment: Appointment,
  payment: PaymentStatusView | null,
  now: Date = new Date(),
): TimelineStep[] {
  const pasos: TimelineStep[] = [
    {
      key: 'reserva',
      title: 'Reservaste el turno',
      when: cuando(appointment.createdAt),
      tone: 'done',
    },
  ];
  const { status } = appointment;

  // El pago. Sin dato del pago, se deduce del estado: un turno confirmado se pagó.
  // Con un reembolso registrado (ENG-174) también se pagó, y lo que se devolvió
  // va en su propio paso después de la cancelación: así un parcial no se lee
  // como "te devolvimos el pago" ni uno pendiente desaparece.
  const pago = payment?.status;
  const reembolso = refundStep(appointment);
  if (
    pago === 'APROBADO' ||
    (reembolso && pago !== 'RECHAZADO' && (status === 'CANCELADO' || status === 'LIBERADO')) ||
    (!pago && ['CONFIRMADO', 'COMPLETADO', 'NO_ASISTIO'].includes(status))
  ) {
    pasos.push({
      key: 'pago',
      title: `Pagaste ${formatPrice(appointment.price)} con MercadoPago`,
      when: cuando(payment?.confirmedAt),
      tone: 'done',
    });
  } else if (pago === 'REEMBOLSADO') {
    pasos.push({ key: 'pago', title: 'Te devolvimos el pago', when: null, tone: 'done' });
  } else if (pago === 'RECHAZADO' && status === 'RESERVADO_SIN_PAGAR') {
    pasos.push({ key: 'pago', title: 'MercadoPago rechazó el pago', when: null, tone: 'bad' });
  } else if (status === 'RESERVADO_SIN_PAGAR') {
    pasos.push({
      key: 'pago',
      title: 'Falta pagarlo para confirmarlo',
      when: null,
      tone: 'current',
    });
  }

  if (status === 'CANCELADO') {
    pasos.push({
      key: 'fin',
      title: 'Se canceló el turno',
      when: cuando(appointment.cancelledAt),
      tone: 'bad',
    });
    if (reembolso) pasos.push({ key: 'reembolso', when: null, ...reembolso });
    return pasos;
  }
  if (status === 'LIBERADO') {
    pasos.push({
      key: 'fin',
      title: 'Se liberó el horario porque no se pagó a tiempo',
      when: null,
      tone: 'bad',
    });
    if (reembolso) pasos.push({ key: 'reembolso', when: null, ...reembolso });
    return pasos;
  }

  if (status !== 'RESERVADO_SIN_PAGAR') {
    pasos.push({ key: 'confirmado', title: 'Quedó confirmado', when: null, tone: 'done' });
  }

  const consulta = formatShortDay(appointment.date, appointment.startTime);
  if (status === 'COMPLETADO') {
    pasos.push({
      key: 'consulta',
      title: 'Tuviste la consulta',
      when: consulta.replace(/^\S+ /, ''),
      tone: 'done',
    });
  } else if (status === 'NO_ASISTIO') {
    pasos.push({
      key: 'consulta',
      title: 'No te conectaste a la consulta',
      when: null,
      tone: 'bad',
    });
  } else if (isActive(appointment)) {
    const empezo = Date.parse(appointment.scheduledAt) <= now.getTime();
    pasos.push({
      key: 'consulta',
      title: empezo ? 'La consulta está en curso' : `Consulta el ${consulta}`,
      when: null,
      tone: empezo ? 'current' : 'pending',
    });
  }
  return pasos;
}
