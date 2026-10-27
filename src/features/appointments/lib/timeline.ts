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
function cuando(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const { date, time } = enArgentina(new Date(iso));
  // `formatShortDay` arma `mié 21 oct · 21:35`; acá sobra el día de la semana.
  return formatShortDay(date, time).replace(/^\S+ /, '');
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
  const pago = payment?.status;
  if (
    pago === 'APROBADO' ||
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
    return pasos;
  }
  if (status === 'LIBERADO') {
    pasos.push({
      key: 'fin',
      title: 'Se liberó el horario porque no se pagó a tiempo',
      when: null,
      tone: 'bad',
    });
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
