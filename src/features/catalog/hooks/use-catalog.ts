import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { fetchPublicProfile, listProfessionals, listSpecialties } from '../api';
import type { CatalogFilters } from '../types';

/** El catálogo con scroll infinito. Mismas query keys que la web. */
export function useProfessionalsCatalog(filters: CatalogFilters) {
  const query = useInfiniteQuery({
    queryKey: ['catalog', 'professionals', filters],
    queryFn: ({ pageParam }) => listProfessionals(filters, pageParam),
    initialPageParam: 1,
    getNextPageParam: (ultima) => (ultima.meta.hasNextPage ? ultima.meta.page + 1 : undefined),
    // Al cambiar un filtro se sigue viendo la lista anterior hasta que llega la
    // nueva, en vez de un parpadeo de "Cargando…".
    placeholderData: (anterior) => anterior,
  });

  const professionals = useMemo(
    () => query.data?.pages.flatMap((pagina) => pagina.data) ?? [],
    [query.data],
  );

  return { ...query, professionals };
}

export function useSpecialties() {
  // Cambian muy de vez en cuando.
  return useQuery({ queryKey: ['specialties'], queryFn: listSpecialties, staleTime: 60 * 60_000 });
}

export function usePublicProfile(id: string) {
  return useQuery({
    queryKey: ['professionals', 'public', id],
    queryFn: () => fetchPublicProfile(id),
  });
}
