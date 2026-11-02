import { describe, expect, it } from 'vitest';

import type { Appointment } from '../types';
import { appointmentTimeline, refundStep } from './timeline';

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

  describe('estado del reembolso (ENG-174)', () => {
    const cancelado = (refundState: Appointment['refundState']) =>
      turno('CANCELADO', { cancelledAt: '2026-10-21T13:00:00Z', refundState });
    const PAGO = {
      appointmentId: 't',
      status: 'APROBADO',
      appointmentStatus: 'CANCELADO',
    } as const;

    it('un parcial acreditado dice cuánto se devolvió, después de cancelar', () => {
      const pasos = titulos(
        appointmentTimeline(cancelado({ amount: 9000, status: 'PROCESADO' }), PAGO, AHORA),
      );

      expect(pasos[1]).toBe('Pagaste $18.000 con MercadoPago');
      expect(pasos.slice(-2)).toEqual(['Se canceló el turno', 'Te devolvimos $9.000']);
    });

    it('uno pendiente queda en curso y uno rechazado, mal', () => {
      expect(
        appointmentTimeline(cancelado({ amount: 18000, status: 'PENDIENTE' }), PAGO, AHORA).at(-1),
      ).toMatchObject({ title: 'Pedimos el reembolso de $18.000', tone: 'current' });
      expect(
        appointmentTimeline(cancelado({ amount: 18000, status: 'RECHAZADO' }), PAGO, AHORA).at(-1),
      ).toMatchObject({ title: 'No se pudo hacer el reembolso de $18.000', tone: 'bad' });
    });

    it('uno total con el pago reembolsado no repite "te devolvimos el pago"', () => {
      const pasos = titulos(
        appointmentTimeline(
          cancelado({ amount: 18000, status: 'PROCESADO' }),
          { ...PAGO, status: 'REEMBOLSADO' },
          AHORA,
        ),
      );

      expect(pasos).not.toContain('Te devolvimos el pago');
      expect(pasos.at(-1)).toBe('Te devolvimos $18.000');
    });

    it('un cancelado sin pago no muestra nada de reembolso', () => {
      expect(refundStep(cancelado(null))).toBeNull();
      expect(titulos(appointmentTimeline(cancelado(null), null, AHORA)).join(' ')).not.toMatch(
        /reembolso|devolvi/i,
      );
    });
  });
});
