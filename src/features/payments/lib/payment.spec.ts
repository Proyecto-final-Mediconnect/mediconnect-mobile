import { describe, expect, it } from 'vitest';

import type { Appointment } from '../../appointments/types';
import { canPay, isCheckoutUrl, paymentOutcomeOf } from './payment';

const vista = (status: string, appointmentStatus: string) => ({
  appointmentId: 'a1',
  status: status as 'PENDIENTE',
  appointmentStatus,
});

describe('paymentOutcomeOf (ENG-168)', () => {
  it('solo el turno CONFIRMADO cuenta como confirmado', () => {
    expect(paymentOutcomeOf(vista('APROBADO', 'CONFIRMADO'))).toBe('CONFIRMADO');
    expect(paymentOutcomeOf(vista('APROBADO', 'RESERVADO_SIN_PAGAR'))).toBe('ESPERANDO');
  });

  it('un turno que ya no espera pago es TURNO_VENCIDO, o SIN_TURNO si el pago se acreditó', () => {
    expect(paymentOutcomeOf(vista('PENDIENTE', 'LIBERADO'))).toBe('TURNO_VENCIDO');
    expect(paymentOutcomeOf(vista('RECHAZADO', 'LIBERADO'), 'RECHAZADO')).toBe('TURNO_VENCIDO');
    expect(paymentOutcomeOf(vista('APROBADO', 'CANCELADO'))).toBe('SIN_TURNO');
  });

  it('un rechazo nuevo se muestra como rechazo', () => {
    expect(paymentOutcomeOf(vista('RECHAZADO', 'RESERVADO_SIN_PAGAR'), 'PENDIENTE')).toBe(
      'RECHAZADO',
    );
  });

  // La app no sabe con qué resultado volvió el paciente: si ya estaba rechazado
  // antes de abrir el checkout, el RECHAZADO puede ser el del intento anterior.
  it('un rechazo que ya estaba antes de abrir el checkout sigue esperando', () => {
    expect(paymentOutcomeOf(vista('RECHAZADO', 'RESERVADO_SIN_PAGAR'), 'RECHAZADO')).toBe(
      'ESPERANDO',
    );
  });
});

describe('canPay', () => {
  const ahora = new Date('2026-10-21T12:00:00Z');
  const turno = (status: string, scheduledAt: string) => ({ status, scheduledAt }) as Appointment;

  it('se paga un turno reservado sin pagar que todavía no empezó', () => {
    expect(canPay(turno('RESERVADO_SIN_PAGAR', '2026-10-22T12:00:00Z'), ahora)).toBe(true);
  });

  it('no se paga uno confirmado, liberado o que ya pasó', () => {
    expect(canPay(turno('CONFIRMADO', '2026-10-22T12:00:00Z'), ahora)).toBe(false);
    expect(canPay(turno('LIBERADO', '2026-10-22T12:00:00Z'), ahora)).toBe(false);
    expect(canPay(turno('RESERVADO_SIN_PAGAR', '2026-10-20T12:00:00Z'), ahora)).toBe(false);
  });
});

describe('isCheckoutUrl', () => {
  it('acepta el checkout de MercadoPago, sandbox incluido', () => {
    expect(isCheckoutUrl('https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=1')).toBe(
      true,
    );
    expect(isCheckoutUrl('https://sandbox.mercadopago.com.ar/checkout/v1/redirect')).toBe(true);
  });

  it('rechaza otros esquemas, otros dominios y basura', () => {
    expect(isCheckoutUrl('http://www.mercadopago.com.ar/x')).toBe(false);
    expect(isCheckoutUrl('intent://pagar#Intent;end')).toBe(false);
    expect(isCheckoutUrl('https://mercadopago.com.ar.evil.com/x')).toBe(false);
    expect(isCheckoutUrl('https://evilmercadopago.com/x')).toBe(false);
    expect(isCheckoutUrl('no es una url')).toBe(false);
  });
});
