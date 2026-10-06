import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useSessionUser } from '../../auth/session';
import { cancelAppointment, fetchMyAppointments } from '../api';

/**
 * Prefijo de la clave, el mismo que la web. Cada consulta le suma el id de la
 * sesión: si el `clear()` del cierre de sesión llegara tarde, los turnos de un
 * paciente igual no se le muestran al siguiente.
 */
export const MY_APPOINTMENTS_KEY = ['appointments', 'me'] as const;

export function useMyAppointments() {
  const { id } = useSessionUser();
  return useQuery({ queryKey: [...MY_APPOINTMENTS_KEY, id], queryFn: fetchMyAppointments });
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
