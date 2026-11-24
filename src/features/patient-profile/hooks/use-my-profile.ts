import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useSession, useSessionUser } from '../../auth/session';
import { fetchMyProfile, saveMyProfile, saveMyVitalInfo } from '../api';

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

/**
 * Guarda los datos personales (ENG-236). El perfil guardado queda en la caché y
 * el nombre pasa a la sesión: el saludo del inicio y el perfil lo muestran sin
 * reiniciar. El MediPass lleva el nombre y la edad: se lo vuelve a pedir.
 */
export function useSaveProfile() {
  const { id } = useSessionUser();
  const { updateUser } = useSession();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: saveMyProfile,
    onSuccess: async (perfil) => {
      queryClient.setQueryData(['patients', 'me', id], perfil);
      updateUser({ firstName: perfil.firstName, lastName: perfil.lastName });
      await queryClient.invalidateQueries({ queryKey: ['medipass'] });
    },
  });
}
