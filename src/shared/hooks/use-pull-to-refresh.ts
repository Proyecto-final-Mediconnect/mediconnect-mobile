import { useCallback, useState } from 'react';

/**
 * Estado del pull-to-refresh, separado de `isRefetching`: el indicador tiene que
 * aparecer solo cuando el paciente tira de la lista, no en cada refetch de
 * fondo (el que sigue a cancelar un turno, el del foco de la app).
 */
export function usePullToRefresh(refetch: () => Promise<unknown>): {
  refreshing: boolean;
  onRefresh: () => void;
} {
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void refetch().finally(() => setRefreshing(false));
  }, [refetch]);

  return { refreshing, onRefresh };
}
