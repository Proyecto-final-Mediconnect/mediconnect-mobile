/**
 * El comprobante y la espera del pago (ENG-199), puros para testearlos sin
 * React. Los mismos que la web (`features/payments/lib/receipt.ts` y
 * `waiting.ts`).
 */

const METHOD_LABELS: Record<string, string> = {
  account_money: 'Dinero en cuenta de MercadoPago',
  credit_card: 'Tarjeta de crédito',
  debit_card: 'Tarjeta de débito',
  prepaid_card: 'Tarjeta prepaga',
  ticket: 'Efectivo',
  bank_transfer: 'Transferencia',
};

/** Nombre visible del medio. Uno desconocido o sin dato dice "MercadoPago", nunca vacío. */
export function paymentMethodLabel(method: string | null | undefined): string {
  return (method && METHOD_LABELS[method]) ?? 'MercadoPago';
}

/**
 * Milisegundos hasta que se libera la reserva (ENG-101), o `null` si el turno no
 * tiene plazo de pago. El plazo lo manda el backend en el turno (`paymentDueAt`,
 * ENG-229): la app no sabe cuántos minutos son.
 */
export function restanteParaPagar(
  paymentDueAt: string | null | undefined,
  now: Date,
): number | null {
  if (!paymentDueAt) return null;
  const hasta = new Date(paymentDueAt).getTime();
  if (Number.isNaN(hasta)) return null;
  return Math.max(0, hasta - now.getTime());
}

/** `12:05`. */
export function formatRestante(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const minutos = Math.floor(total / 60);
  const segundos = total % 60;
  return `${String(minutos)}:${String(segundos).padStart(2, '0')}`;
}
