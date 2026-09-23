import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { cancelAppointment, fetchMyAppointments } from '../api';

/** Misma clave que la web: si algún día comparten caché, coinciden. */
export const MY_APPOINTMENTS_KEY = ['appointments', 'me'] as const;

export function useMyAppointments() {
  return useQuery({ queryKey: MY_APPOINTMENTS_KEY, queryFn: fetchMyAppointments });
}

export function useCancelAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: cancelAppointment,
    // Se vuelve a pedir la lista en vez de editarla a mano: el backend puede
    // haber cambiado algo más —un reembolso, con ENG-65— y la lista tiene que
    // decir lo que dice el servidor.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: MY_APPOINTMENTS_KEY }),
  });
}
