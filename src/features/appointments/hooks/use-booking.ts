import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { bookAppointment, fetchAvailability } from '../api';
import { MY_APPOINTMENTS_KEY } from './use-appointments';

export function availabilityKey(professionalId: string, from: string, to: string) {
  return ['availability', professionalId, from, to] as const;
}

export function useAvailability(professionalId: string, from: string, to: string) {
  return useQuery({
    queryKey: availabilityKey(professionalId, from, to),
    queryFn: () => fetchAvailability(professionalId, from, to),
  });
}

/**
 * Reserva el turno. Después, la lista de turnos y la disponibilidad se vuelven a
 * pedir: el horario ya no está libre y el turno nuevo tiene que aparecer en
 * "Mis turnos" tal como lo guardó el backend.
 */
export function useBookAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: bookAppointment,
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: MY_APPOINTMENTS_KEY });
      void queryClient.invalidateQueries({ queryKey: ['availability'] });
    },
  });
}
