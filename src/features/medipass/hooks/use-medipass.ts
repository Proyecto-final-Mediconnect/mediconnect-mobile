import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { fetchAccesses, fetchMyCode, fetchVitalBlock, revokeAccess } from '../api';
import { proximaConsultaDelCodigo } from '../lib/medipass';

export const CODIGO_KEY = ['medipass', 'code'] as const;
const ACCESOS_KEY = ['medipass', 'accesses'] as const;

/**
 * El código vigente (ENG-72). Se vuelve a pedir justo cuando vence, así el QR
 * nunca muestra uno que ya no sirve. `enabled` en falso mientras está oculto:
 * con la app en segundo plano no hay nada que mostrar ni que renovar.
 */
export function useMyMediPassCode(enabled: boolean) {
  return useQuery({
    queryKey: CODIGO_KEY,
    queryFn: fetchMyCode,
    enabled,
    // Nada de guardarlo después de dejar de mostrarlo (ENG-117).
    gcTime: 0,
    refetchInterval: (query) =>
      proximaConsultaDelCodigo(
        query.state.status === 'error' ? null : (query.state.data?.expiraEl ?? null),
        new Date(),
      ),
  });
}

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
