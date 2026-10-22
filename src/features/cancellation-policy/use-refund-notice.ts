import { useQuery } from '@tanstack/react-query';

import { fetchPublicProfile } from '../catalog/api';
import type { Appointment } from '../appointments/types';
import { refundNotice } from './policy';

/**
 * El aviso de devolución para el turno que se está por cancelar (ENG-173). La
 * política sale del perfil público del profesional, con la misma clave que usa
 * `usePublicProfile`: si el paciente pasó por el perfil, ya está en caché.
 *
 * Solo pide el perfil para un turno pagado: uno sin pagar no tiene nada que
 * devolver.
 */
export function useRefundNotice(appointment: Appointment | null, now: Date): string | null {
  const professionalId = appointment?.professional?.id ?? '';
  const perfil = useQuery({
    queryKey: ['professionals', 'public', professionalId],
    queryFn: () => fetchPublicProfile(professionalId),
    enabled: appointment?.status === 'CONFIRMADO' && professionalId !== '',
    retry: false,
  });

  return appointment ? refundNotice(appointment, perfil.data?.cancellationPolicy, now) : null;
}
