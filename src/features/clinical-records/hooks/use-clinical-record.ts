import { useQuery } from '@tanstack/react-query';

import { fetchMyClinicalRecord } from '../api';

/**
 * La HC del paciente de la sesión.
 *
 * `staleTime` largo a propósito: cada lectura deja un registro de acceso en la
 * auditoría (Ley 26.529). Entrar y salir de la pantalla, o abrir el detalle de
 * una entrada, no es volver a consultar la historia; el pull-to-refresh sí.
 */
export function useMyClinicalRecord() {
  return useQuery({
    queryKey: ['clinical-record', 'me'],
    queryFn: fetchMyClinicalRecord,
    staleTime: 10 * 60_000,
  });
}
