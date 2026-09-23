import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { fetchAccesses, fetchVitalBlock, revokeAccess } from '../api';

const ACCESOS_KEY = ['medipass', 'accesses'] as const;

export function useVitalBlock() {
  return useQuery({ queryKey: ['medipass', 'vital'], queryFn: fetchVitalBlock });
}

/**
 * Quién está mirando el MediPass (ENG-74). Se refresca cada 30 segundos
 * mientras la pantalla está abierta: es "en tiempo real" en la medida en que
 * importa, sin tener un socket abierto para una lista de dos o tres filas.
 */
export function useAccesses() {
  return useQuery({ queryKey: ACCESOS_KEY, queryFn: fetchAccesses, refetchInterval: 30_000 });
}

export function useRevokeAccess() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: revokeAccess,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ACCESOS_KEY }),
  });
}
