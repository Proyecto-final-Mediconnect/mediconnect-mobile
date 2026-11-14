import { describe, expect, it } from 'vitest';

import { formatRestante, paymentMethodLabel, restanteParaPagar } from './receipt';

describe('comprobante y espera del pago (ENG-199)', () => {
  it('nombra el medio de MercadoPago y nunca lo deja vacío', () => {
    expect(paymentMethodLabel('account_money')).toBe('Dinero en cuenta de MercadoPago');
    expect(paymentMethodLabel('debit_card')).toBe('Tarjeta de débito');
    expect(paymentMethodLabel('otra_cosa')).toBe('MercadoPago');
    expect(paymentMethodLabel(null)).toBe('MercadoPago');
  });

  it('cuenta los 15 minutos para pagar desde la reserva', () => {
    const reserva = '2026-11-17T12:00:00.000Z';
    expect(restanteParaPagar(reserva, new Date('2026-11-17T12:03:00.000Z'))).toBe(12 * 60_000);
    expect(restanteParaPagar(reserva, new Date('2026-11-17T12:30:00.000Z'))).toBe(0);
    expect(restanteParaPagar(undefined, new Date())).toBeNull();
    expect(formatRestante(65_500)).toBe('1:06');
  });
});
