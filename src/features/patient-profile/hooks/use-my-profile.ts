import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useSessionUser } from '../../auth/session';
import { fetchMyProfile, saveMyVitalInfo } from '../api';

/** Misma clave que la web, más el id de la sesión (ver `MY_APPOINTMENTS_KEY`). */
export function useMyProfile() {
  const { id } = useSessionUser();
  return useQuery({ queryKey: ['patients', 'me', id], queryFn: fetchMyProfile });
}

/**
 * Guarda los datos de emergencia (ENG-136) y deja el perfil guardado en la
 * caché. El MediPass los lee aparte: se lo invalida para que muestre lo nuevo.
 */
export function useSaveVitalInfo() {
  const { id } = useSessionUser();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: saveMyVitalInfo,
    onSuccess: async (perfil) => {
      queryClient.setQueryData(['patients', 'me', id], perfil);
      await queryClient.invalidateQueries({ queryKey: ['medipass', 'vital'] });
    },
  });
}
