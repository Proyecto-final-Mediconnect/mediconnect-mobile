import type { Appointment } from '../../appointments/types';
import type { PaymentStatus, PaymentStatusView } from '../types';

/**
 * Reglas del pago de un turno (ENG-168), portadas de `mediconnect-web`
 * (`features/payments/lib/checkout.ts`). Puras, para testearlas sin montar
 * pantallas. **Nada de esto autoriza un cobro**: decide qué se muestra; el turno
 * lo confirma el webhook del backend.
 */

/**
 * Qué pasó con el pago, según el backend.
 *
 * - `CONFIRMADO`: el webhook confirmó el turno. Es lo único que cuenta como éxito.
 * - `RECHAZADO`: MercadoPago rechazó el pago; el turno sigue reservado.
 * - `SIN_TURNO`: el pago se acreditó, pero el turno ya no esperaba pago (se
 *   canceló o se liberó en el medio).
 * - `TURNO_VENCIDO`: el turno dejó de esperar el pago (lo liberó ENG-101 a los
 *   15 minutos, o se canceló) y no hay pago aprobado.
 * - `ESPERANDO`: todavía no llegó el webhook.
 */
export type PaymentOutcome =
  'CONFIRMADO' | 'RECHAZADO' | 'SIN_TURNO' | 'TURNO_VENCIDO' | 'ESPERANDO';

/**
 * Distinto de la web en un punto: la web sabe con qué `resultado` volvió el
 * paciente de MercadoPago (viene en la URL), la app no —al cerrar el navegador
 * solo se sabe que volvió—. Para no mostrar el `RECHAZADO` de un intento
 * **anterior** como si fuera el resultado del nuevo, se compara con el estado
 * que había antes de abrir el checkout: si ya estaba rechazado, un `RECHAZADO`
 * todavía puede ser el viejo y se sigue esperando el webhook del intento nuevo.
 */
export function paymentOutcomeOf(
  view: PaymentStatusView,
  statusBeforeCheckout: PaymentStatus | 'SIN_INICIAR' | null = null,
): PaymentOutcome {
  if (view.appointmentStatus === 'CONFIRMADO') return 'CONFIRMADO';
  // El turno ya no espera pago: eso se decide antes que el rechazo.
  if (view.appointmentStatus !== 'RESERVADO_SIN_PAGAR') {
    return view.status === 'APROBADO' ? 'SIN_TURNO' : 'TURNO_VENCIDO';
  }
  if (view.status === 'RECHAZADO') {
    return statusBeforeCheckout === 'RECHAZADO' ? 'ESPERANDO' : 'RECHAZADO';
  }
  return 'ESPERANDO';
}

/**
 * Si la URL de pago que mandó el backend es del checkout de MercadoPago (https y
 * dominio `mercadopago.com[.ar]`, incluido el sandbox). Se valida antes de abrirla:
 * `Linking.openURL` acepta cualquier esquema (`intent:`, `tel:`, otra app…).
 */
export function isCheckoutUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && /(^|\.)mercadopago\.com(\.ar)?$/.test(u.hostname);
  } catch {
    return false;
  }
}

/**
 * Si se ofrece pagar el turno: reservado sin pagar y todavía no empezó. El
 * backend revalida todo (incluida la retención de 15 minutos de ENG-101).
 */
export function canPay(appointment: Appointment, now: Date = new Date()): boolean {
  return (
    appointment.status === 'RESERVADO_SIN_PAGAR' &&
    Date.parse(appointment.scheduledAt) > now.getTime()
  );
}
