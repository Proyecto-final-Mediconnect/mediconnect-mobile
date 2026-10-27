import { useQuery } from '@tanstack/react-query';

import { fetchCancellationQuote } from '../appointments/api';
import type { Appointment } from '../appointments/types';
import { ApiError } from '../../shared/lib/api-client';
import { fetchPublicProfile } from '../catalog/api';
import { refundNotice, refundQuoteText } from './policy';

/**
 * El aviso de devolución para el turno que se está por cancelar (ENG-173).
 *
 * Lo calcula el backend (`cancellation-quote`, ENG-65) con la política que
 * quedó guardada en el turno al reservarlo. Si el backend todavía no la tiene,
 * se cuenta en la app con la política actual del perfil, avisando que la
 * devolución no es automática. Eso es solo para un 404 (la ruta no existe): un
 * timeout o un 5xx no dice nada de la política, así que el aviso es neutro.
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

export function useRefundNotice(appointment: Appointment | null, now: Date): RefundNotice {
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

  // El backend es anterior a ENG-65: la cotización no existe.
  const sinCotizacion = cotizacion.error instanceof ApiError && cotizacion.error.status === 404;

  const professionalId = appointment?.professional?.id ?? '';
  const perfil = useQuery({
    queryKey: ['professionals', 'public', professionalId],
    queryFn: () => fetchPublicProfile(professionalId),
    enabled: pagado && sinCotizacion && professionalId !== '',
    retry: false,
  });

  if (!appointment || !pagado) return { texto: null, cargando: false };
  if (cotizacion.data) {
    return {
      texto: refundQuoteText(cotizacion.data.percent, cotizacion.data.amount, true),
      cargando: false,
    };
  }
  if (cotizacion.isPending) return { texto: CALCULANDO, cargando: true };
  if (!sinCotizacion) return { texto: NO_SE_PUDO_CALCULAR, cargando: false };
  if (perfil.isLoading) return { texto: CALCULANDO, cargando: true };
  return {
    texto: refundNotice(appointment, perfil.data?.cancellationPolicy, now),
    cargando: false,
  };
}
