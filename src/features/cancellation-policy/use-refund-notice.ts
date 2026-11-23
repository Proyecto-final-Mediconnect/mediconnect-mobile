import { useQuery } from '@tanstack/react-query';

import { fetchCancellationQuote } from '../appointments/api';
import type { Appointment } from '../appointments/types';
import { refundQuoteText } from './policy';

/**
 * El aviso de devolución para el turno que se está por cancelar (ENG-173).
 *
 * Lo calcula **solo el backend** (`cancellation-quote`, ENG-65) con la política
 * que quedó guardada en el turno al reservarlo (ENG-229: la app ya no repite la
 * cuenta). Si la cotización falla, el aviso es neutro: no se dice un porcentaje
 * que no es.
 *
 * Mientras se calcula, `cargando` es `true`: la cancelación no se confirma sin
 * ver cuánto se devuelve.
 *
 * Solo se pide algo para un turno pagado: uno sin pagar no tiene nada que
 * devolver.
 */
const CALCULANDO = 'Calculando cuánto te devolvemos…';
const NO_SE_PUDO_CALCULAR =
  'No pudimos calcular la devolución ahora; se aplica la política del profesional.';

export interface RefundNotice {
  texto: string | null;
  cargando: boolean;
}

export function useRefundNotice(appointment: Appointment | null): RefundNotice {
  const id = appointment?.id ?? '';
  const pagado = appointment?.status === 'CONFIRMADO';
  const cotizacion = useQuery({
    queryKey: ['appointments', id, 'cancellation-quote'],
    queryFn: () => fetchCancellationQuote(id),
    enabled: pagado,
    retry: false,
    // Depende de la hora: con el tiempo el porcentaje baja.
    staleTime: 0,
    gcTime: 0,
  });

  if (!appointment || !pagado) return { texto: null, cargando: false };
  if (cotizacion.data) {
    return {
      texto: refundQuoteText(cotizacion.data.percent, cotizacion.data.amount),
      cargando: false,
    };
  }
  if (cotizacion.isPending) return { texto: CALCULANDO, cargando: true };
  return { texto: NO_SE_PUDO_CALCULAR, cargando: false };
}
