/**
 * Tipos del pago de un turno (ENG-168), portados de `mediconnect-web`
 * (`features/payments/types/payment.ts`). Espejan lo que devuelven `POST` y
 * `GET /appointments/:id/payment` (ENG-63). **La tarjeta nunca pasa por la
 * app**: se carga en el checkout de MercadoPago (ADR-013).
 */

/** Espeja el enum `payment_status` de la base. */
export type PaymentStatus = 'PENDIENTE' | 'APROBADO' | 'RECHAZADO' | 'REEMBOLSADO';

/** Respuesta de `POST /appointments/:id/payment`: adónde mandar al paciente. */
export interface CheckoutLink {
  appointmentId: string;
  /** URL del Checkout Pro de MercadoPago. */
  checkoutUrl: string;
  /** `true` con credenciales de prueba: el cobro no es real. */
  sandbox: boolean;
  amount: number;
  currency: string;
  status: PaymentStatus;
}

/**
 * Respuesta de `GET /appointments/:id/payment`. `SIN_INICIAR` no es un estado
 * de la base: es que todavía nunca se pidió el link.
 */
export interface PaymentStatusView {
  appointmentId: string;
  status: PaymentStatus | 'SIN_INICIAR';
  appointmentStatus: string;
}
