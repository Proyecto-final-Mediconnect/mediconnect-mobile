import { describe, expect, it } from 'vitest';

import { describePolicy, refundOutcomeText, refundQuoteText } from './policy';

const DEFAULT = { hoursFullRefund: 24, hoursPartialRefund: 6, partialRefundPercent: 50 };
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

describe('refundQuoteText (ENG-65)', () => {
  it('dice que la devolución es automática, por MercadoPago', () => {
    expect(refundQuoteText(50, 7_500)).toBe(
      'Según la política del profesional, te corresponde el 50 % ($7.500). ' +
        'Te lo devolvemos por MercadoPago, al mismo medio con el que pagaste.',
    );
  });

  it('con 0 % no habla de devolución automática', () => {
    expect(refundQuoteText(0, 0)).toBe(
      'Según la política del profesional, si cancelás ahora no te corresponde devolución.',
    );
  });
});

describe('refundOutcomeText (ENG-65)', () => {
  it.each([
    ['PROCESADO', /Te devolvemos \$7\.500 por MercadoPago/],
    ['PENDIENTE', /todavía no la confirmó/],
    ['RECHAZADO', /no aceptó la devolución de \$7\.500/],
  ] as const)('%s', (status, texto) => {
    expect(refundOutcomeText({ percent: 50, amount: 7_500, status })).toMatch(texto);
  });

  it('sin nada que devolver, no dice nada', () => {
    expect(refundOutcomeText({ percent: 0, amount: 0, status: null })).toBeNull();
  });

  it('con un backend anterior a ENG-65 la respuesta no trae refund', () => {
    expect(refundOutcomeText(undefined)).toBeNull();
  });
});
