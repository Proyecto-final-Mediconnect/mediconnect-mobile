import { useQuery } from '@tanstack/react-query';

import { useSessionUser } from '../../auth/session';
import { fetchClinicalRecord } from '../api';

/**
 * La HC del paciente de la sesión.
 *
 * `staleTime` largo a propósito: cada lectura deja un registro de acceso en la
 * auditoría (Ley 26.529). Entrar y salir de la pantalla, o abrir el detalle de
 * una entrada, no es volver a consultar la historia; el pull-to-refresh sí.
 */
export function useMyClinicalRecord() {
  const { id } = useSessionUser();

  return useQuery({
    queryKey: ['clinical-record', id],
    queryFn: () => fetchClinicalRecord(id),
    staleTime: 10 * 60_000,
    // Si no, la caché se descarta a los 5 minutos sin pantallas que la usen y la
    // próxima lectura vuelve al servidor (y a la auditoría) aunque no esté vencida.
    gcTime: 15 * 60_000,
  });
}
