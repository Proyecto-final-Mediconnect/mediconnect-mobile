import { formatPrice } from '../appointments/lib/appointments';
import type { CancellationRefund } from '../appointments/types';

/**
 * Política de cancelación de un profesional (ENG-67), tal como viaja en
 * `GET /professionals/:id`.
 *
 * - Cancelando con `hoursFullRefund` horas o más de anticipación: 100 %.
 * - Con `hoursPartialRefund` horas o más: `partialRefundPercent` %.
 * - Con menos: nada.
 */
export interface CancellationPolicy {
  hoursFullRefund: number;
  hoursPartialRefund: number;
  partialRefundPercent: number;
}

const MAX_REFUND_PERCENT = 100;

function horas(n: number): string {
  return n === 1 ? '1 hora' : `${n} horas`;
}

/**
 * La política en palabras, igual que en la web (ENG-171).
 *
 * Los tramos que nunca se aplican no se cuentan: un parcial del 0 % o con las
 * mismas horas que el total, y un parcial del 100 % es una devolución total con
 * menos anticipación.
 */
export function describePolicy(policy: CancellationPolicy): string {
  const { partialRefundPercent: pct } = policy;
  const total = pct === MAX_REFUND_PERCENT ? policy.hoursPartialRefund : policy.hoursFullRefund;
  const hayParcial = pct > 0 && pct < MAX_REFUND_PERCENT && policy.hoursPartialRefund < total;

  if (total === 0) {
    return 'Podés cancelar hasta el horario del turno y te devolvemos el 100 %.';
  }

  const partes = [`Si cancelás con ${horas(total)} o más de anticipación, te devolvemos el 100 %.`];
  let minimo = total;

  if (hayParcial) {
    const parcial = policy.hoursPartialRefund;
    partes.push(
      parcial === 0
        ? `Con menos de ${horas(total)}, el ${pct} %.`
        : `Entre ${horas(total)} y ${horas(parcial)} antes, el ${pct} %.`,
    );
    minimo = parcial;
  }

  if (minimo > 0) partes.push(`Con menos de ${horas(minimo)}, no hay devolución.`);

  return partes.join(' ');
}

/**
 * Lo que se le dice al paciente antes de cancelar un turno pagado, con la
 * cotización del backend (ENG-65): el porcentaje y el monto los calcula él
 * (ENG-229: la app no repite la cuenta).
 */
export function refundQuoteText(percent: number, amount: number): string {
  if (percent === 0) {
    return 'Según la política del profesional, si cancelás ahora no te corresponde devolución.';
  }

  const cuanto = percent === MAX_REFUND_PERCENT ? 'la devolución total' : `el ${percent} %`;
  return `Según la política del profesional, te corresponde ${cuanto} (${formatPrice(amount)}). Te lo devolvemos por MercadoPago, al mismo medio con el que pagaste.`;
}

/**
 * Qué pasó con la devolución, después de cancelar (ENG-65). `null` si no había
 * nada que devolver.
 */
export function refundOutcomeText(refund: CancellationRefund | undefined): string | null {
  if (!refund || refund.status === null) return null;

  const monto = formatPrice(refund.amount);
  switch (refund.status) {
    case 'PROCESADO':
      return `Te devolvemos ${monto} por MercadoPago, al mismo medio con el que pagaste. Puede tardar unos días en verse.`;
    case 'PENDIENTE':
      return `Pedimos la devolución de ${monto}, pero MercadoPago todavía no la confirmó. La seguimos nosotros.`;
    case 'RECHAZADO':
      return `MercadoPago no aceptó la devolución de ${monto}. La vamos a resolver a mano.`;
  }
}
