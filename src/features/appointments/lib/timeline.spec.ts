import { describe, expect, it } from 'vitest';

import type { Appointment } from '../types';
import { appointmentTimeline } from './timeline';

const AHORA = new Date('2026-10-21T15:00:00Z');

function turno(status: string, extra: Partial<Appointment> = {}): Appointment {
  return {
    id: 't',
    scheduledAt: '2026-10-25T13:00:00Z',
    date: '2026-10-25',
    startTime: '10:00',
    durationMinutes: 30,
    price: 18_000,
    currency: 'ARS',
    status,
    professional: null,
    patient: null,
    ...extra,
  };
}

const titulos = (t: ReturnType<typeof appointmentTimeline>): string[] => t.map((p) => p.title);

describe('appointmentTimeline', () => {
  it('un turno pago cuenta la reserva, el pago con su hora, la confirmación y la consulta', () => {
    const pasos = appointmentTimeline(
      turno('CONFIRMADO', { createdAt: '2026-10-20T23:35:00Z' }),
      {
        appointmentId: 't',
        status: 'APROBADO',
        appointmentStatus: 'CONFIRMADO',
        confirmedAt: '2026-10-20T23:40:00Z',
      },
      AHORA,
    );

    expect(titulos(pasos)).toEqual([
      'Reservaste el turno',
      'Pagaste $18.000 con MercadoPago',
      'Quedó confirmado',
      'Consulta el dom 25 oct · 10:00',
    ]);
    // 23:35 UTC del 20 son las 20:35 del 20 en Argentina.
    expect(pasos[0]?.when).toBe('20 oct · 20:35');
    expect(pasos[1]?.when).toBe('20 oct · 20:40');
  });

  it('sin pagar, marca que falta el pago y no dice que está confirmado', () => {
    const pasos = appointmentTimeline(turno('RESERVADO_SIN_PAGAR'), null, AHORA);

    expect(titulos(pasos)).toContain('Falta pagarlo para confirmarlo');
    expect(titulos(pasos)).not.toContain('Quedó confirmado');
    expect(pasos[0]?.when).toBeNull();
  });

  it('un cancelado termina en la cancelación, con su fecha', () => {
    const pasos = appointmentTimeline(
      turno('CANCELADO', { cancelledAt: '2026-10-21T13:00:00Z' }),
      null,
      AHORA,
    );

    expect(pasos.at(-1)).toMatchObject({ title: 'Se canceló el turno', when: '21 oct · 10:00' });
    expect(titulos(pasos)).not.toContain('Quedó confirmado');
  });

  it('un liberado explica que fue por no pagar a tiempo', () => {
    const pasos = appointmentTimeline(turno('LIBERADO'), null, AHORA);

    expect(pasos.at(-1)?.title).toBe('Se liberó el horario porque no se pagó a tiempo');
  });
});
