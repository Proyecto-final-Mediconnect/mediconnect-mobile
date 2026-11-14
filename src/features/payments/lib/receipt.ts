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

/** Lo que tiene el paciente para pagar desde que reservó (ENG-101). */
const MINUTOS_PARA_PAGAR = 15;

/** Milisegundos hasta que se libera la reserva, o `null` si no se sabe cuándo se reservó. */
export function restanteParaPagar(createdAt: string | null | undefined, now: Date): number | null {
  if (!createdAt) return null;
  const desde = new Date(createdAt).getTime();
  if (Number.isNaN(desde)) return null;
  return Math.max(0, desde + MINUTOS_PARA_PAGAR * 60_000 - now.getTime());
}

/** `12:05`. */
export function formatRestante(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const minutos = Math.floor(total / 60);
  const segundos = total % 60;
  return `${String(minutos)}:${String(segundos).padStart(2, '0')}`;
}

/** Si un turno se muestra como pagado: confirmado es pagado (ENG-64). */
export function isPaid(status: string): boolean {
  return status === 'CONFIRMADO';
}
