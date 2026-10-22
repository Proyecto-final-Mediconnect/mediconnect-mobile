import { describe, expect, it } from 'vitest';

import type { Appointment } from '../appointments/types';
import { describePolicy, refundNotice, refundPercentFor } from './policy';

const DEFAULT = { hoursFullRefund: 24, hoursPartialRefund: 6, partialRefundPercent: 50 };
const NOW = new Date('2026-10-22T12:00:00.000Z');

function enHoras(h: number): Date {
  return new Date(NOW.getTime() + h * 3_600_000);
}

function turno(status: string, horas: number): Appointment {
  return {
    id: 't1',
    scheduledAt: enHoras(horas).toISOString(),
    date: '2026-10-23',
    startTime: '10:00',
    durationMinutes: 30,
    price: 15_000,
    currency: 'ARS',
    status,
    professional: { id: 'pro-1', firstName: 'Ana', lastName: 'García' },
    patient: null,
  };
}

describe('refundPercentFor', () => {
  it.each([
    [25, 100],
    [24, 100],
    [10, 50],
    [6, 50],
    [1, 0],
    [-1, 0],
  ])('a %i h del turno devuelve %i %%', (horas, esperado) => {
    expect(refundPercentFor(DEFAULT, enHoras(horas), NOW)).toBe(esperado);
  });
});

describe('describePolicy (mismos textos que la web)', () => {
  it('cuenta los tres tramos de la política por defecto', () => {
    expect(describePolicy(DEFAULT)).toBe(
      'Si cancelás con 24 horas o más de anticipación, te devolvemos el 100 %. ' +
        'Entre 24 horas y 6 horas antes, el 50 %. Con menos de 6 horas, no hay devolución.',
    );
  });

  it('sin tramo parcial cuando el porcentaje es 0', () => {
    expect(describePolicy({ ...DEFAULT, partialRefundPercent: 0 })).toBe(
      'Si cancelás con 24 horas o más de anticipación, te devolvemos el 100 %. ' +
        'Con menos de 24 horas, no hay devolución.',
    );
  });

  it('un parcial del 100 % es una devolución total con menos anticipación', () => {
    expect(describePolicy({ ...DEFAULT, partialRefundPercent: 100 })).toBe(
      'Si cancelás con 6 horas o más de anticipación, te devolvemos el 100 %. ' +
        'Con menos de 6 horas, no hay devolución.',
    );
  });

  it('con 0 horas para el total, siempre se devuelve todo', () => {
    expect(
      describePolicy({ hoursFullRefund: 0, hoursPartialRefund: 0, partialRefundPercent: 50 }),
    ).toBe('Podés cancelar hasta el horario del turno y te devolvemos el 100 %.');
  });
});

describe('refundNotice', () => {
  it('pagado y con anticipación: la devolución total, con el monto', () => {
    expect(refundNotice(turno('CONFIRMADO', 30), DEFAULT, NOW)).toMatch(
      /te corresponde la devolución total \(\$15\.000\)/,
    );
  });

  it('pagado a 10 h: el parcial', () => {
    expect(refundNotice(turno('CONFIRMADO', 10), DEFAULT, NOW)).toMatch(
      /te corresponde el 50 % \(\$7\.500\)/,
    );
  });

  it('pagado a 2 h: nada', () => {
    expect(refundNotice(turno('CONFIRMADO', 2), DEFAULT, NOW)).toMatch(
      /no te corresponde devolución/,
    );
  });

  it('sin pagar no hay nada que devolver', () => {
    expect(refundNotice(turno('RESERVADO_SIN_PAGAR', 30), DEFAULT, NOW)).toBeNull();
  });

  it('sin la política no inventa un porcentaje', () => {
    expect(refundNotice(turno('CONFIRMADO', 30), undefined, NOW)).toBeNull();
  });
});
