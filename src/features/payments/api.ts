import { apiRequest } from '../../shared/lib/api-client';
import type { CheckoutLink, PaymentStatusView } from './types';

/* API del pago de un turno: los mismos endpoints que usa la web (ENG-63). */

const base = (appointmentId: string): string =>
  `/appointments/${encodeURIComponent(appointmentId)}/payment`;

/**
 * `POST /appointments/:id/payment`: el link de Checkout Pro del turno. El
 * backend lo crea la primera vez y después devuelve el mismo, así que un doble
 * toque no genera dos cobros. Sin body: monto y moneda salen del turno.
 */
export function startCheckout(appointmentId: string): Promise<CheckoutLink> {
  return apiRequest<CheckoutLink>(base(appointmentId), {
    method: 'POST',
    fallbackMessage: 'No pudimos iniciar el pago. Probá de nuevo.',
  });
}

/** `GET /appointments/:id/payment`: el estado que escribió el webhook (ENG-64). */
export function getPaymentStatus(appointmentId: string): Promise<PaymentStatusView> {
  return apiRequest<PaymentStatusView>(base(appointmentId), {
    fallbackMessage: 'No pudimos consultar el estado del pago.',
  });
}
