import { apiRequest } from '../../shared/lib/api-client';
import type { CheckoutLink, PaymentStatusView } from './types';

/* API del pago de un turno: los mismos endpoints que usa la web (ENG-63). */

const base = (appointmentId: string): string =>
  `/appointments/${encodeURIComponent(appointmentId)}/payment`;

/**
 * `POST /appointments/:id/payment`: el link de Checkout Pro del turno. El
 * backend lo crea la primera vez y después devuelve el mismo, así que un doble
 * toque no genera dos cobros. Monto y moneda salen del turno.
 *
 * `origen: 'app'` hace que MercadoPago vuelva a la app (`mediconnect://pago/…`)
 * y no a la web (ENG-172). Necesita el backend de ENG-172: el anterior rechaza
 * el campo con un 400.
 */
export function startCheckout(appointmentId: string): Promise<CheckoutLink> {
  return apiRequest<CheckoutLink>(base(appointmentId), {
    method: 'POST',
    body: { origen: 'app' },
    fallbackMessage: 'No pudimos iniciar el pago. Probá de nuevo.',
  });
}

/** `GET /appointments/:id/payment`: el estado que escribió el webhook (ENG-64). */
export function getPaymentStatus(appointmentId: string): Promise<PaymentStatusView> {
  return apiRequest<PaymentStatusView>(base(appointmentId), {
    fallbackMessage: 'No pudimos consultar el estado del pago.',
  });
}
