import { useQuery } from '@tanstack/react-query';

import { fetchCancellationQuote } from '../appointments/api';
import type { Appointment } from '../appointments/types';
import { fetchPublicProfile } from '../catalog/api';
import { refundNotice, refundQuoteText } from './policy';

/**
 * El aviso de devolución para el turno que se está por cancelar (ENG-173).
 *
 * Lo calcula el backend (`cancellation-quote`, ENG-65) con la política que
 * quedó guardada en el turno al reservarlo. Si el backend todavía no la tiene,
 * se cuenta en la app con la política actual del perfil, avisando que la
 * devolución no es automática.
 *
 * Solo se pide algo para un turno pagado: uno sin pagar no tiene nada que
 * devolver.
 */
export function useRefundNotice(appointment: Appointment | null, now: Date): string | null {
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

  const professionalId = appointment?.professional?.id ?? '';
  const perfil = useQuery({
    queryKey: ['professionals', 'public', professionalId],
    queryFn: () => fetchPublicProfile(professionalId),
    enabled: pagado && cotizacion.isError && professionalId !== '',
    retry: false,
  });

  if (!appointment || !pagado) return null;
  if (cotizacion.data) {
    return refundQuoteText(cotizacion.data.percent, cotizacion.data.amount, true);
  }
  return cotizacion.isError
    ? refundNotice(appointment, perfil.data?.cancellationPolicy, now)
    : null;
}
