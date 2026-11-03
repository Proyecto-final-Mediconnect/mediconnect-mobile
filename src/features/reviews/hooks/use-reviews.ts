import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useSessionUser } from '../../auth/session';
import { createReview, fetchMyReviews, fetchProfessionalReviews } from '../api';
import type { NewReview } from '../types';

/**
 * Prefijo de la clave, el mismo que la web. Como en los turnos, cada consulta le
 * suma el id de la sesión: las reseñas de un paciente no se le muestran al
 * siguiente aunque el `clear()` del cierre de sesión llegue tarde.
 */
export const MY_REVIEWS_KEY = ['reviews', 'me'] as const;

export function useMyReviews(enabled = true) {
  const { id } = useSessionUser();
  return useQuery({ queryKey: [...MY_REVIEWS_KEY, id], queryFn: fetchMyReviews, enabled });
}

export function useCreateReview(appointmentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (review: NewReview) => createReview(appointmentId, review),
    // Sin reintento: hay una reseña por turno, y un segundo envío daría 409.
    retry: false,
    // También si falla: un 409 es que ya la había dejado (desde otro dispositivo o
    // la web), y releer `/reviews/me` hace que la tarjeta muestre esa reseña en
    // vez de seguir ofreciendo dejar una.
    onSettled: () => queryClient.invalidateQueries({ queryKey: MY_REVIEWS_KEY }),
  });
}

/**
 * Las reseñas aprobadas del perfil, con "Ver más" como página siguiente. Con
 * `useInfiniteQuery` y no con un número de página en el estado: las páginas ya
 * cargadas quedan en la caché y no se repiten al pedir la que sigue.
 */
export function useProfessionalReviews(professionalId: string) {
  const query = useInfiniteQuery({
    queryKey: ['reviews', 'professional', professionalId],
    queryFn: ({ pageParam }) => fetchProfessionalReviews(professionalId, pageParam),
    initialPageParam: 1,
    getNextPageParam: (ultima) => (ultima.hasMore ? ultima.page + 1 : undefined),
    // Son públicas y cambian poco: así volver al perfil no vuelve a pedir, en
    // fila, todas las páginas ya cargadas.
    staleTime: 5 * 60_000,
  });

  // La paginación es por número de página: si se aprueba una reseña entre un
  // "Ver más" y el siguiente, la última de una página vuelve en la otra. Se
  // descarta la repetida para no mostrarla dos veces (ni repetir la `key`).
  const reviews = useMemo(() => {
    const vistas = new Set<string>();
    return (query.data?.pages.flatMap((pagina) => pagina.reviews) ?? []).filter((r) => {
      if (vistas.has(r.id)) return false;
      vistas.add(r.id);
      return true;
    });
  }, [query.data]);
  /** El promedio sale de la primera página: es el mismo en todas. */
  const rating = query.data?.pages[0]?.rating ?? null;

  return { ...query, reviews, rating };
}
