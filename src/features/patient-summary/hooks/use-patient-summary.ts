import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { useSessionUser } from '../../auth/session';
import { fetchMySummary } from '../api';

/** Como el resto de las consultas del paciente, la clave lleva el id de la sesión. */
export function usePatientSummary(from: string, to: string) {
  const { id } = useSessionUser();
  return useQuery({
    queryKey: ['patients', 'me', 'summary', id, from, to],
    queryFn: () => fetchMySummary(from, to),
    // Al cambiar de período quedan los números anteriores hasta que llegan los nuevos.
    placeholderData: keepPreviousData,
  });
}
