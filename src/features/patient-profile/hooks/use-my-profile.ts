import { useQuery } from '@tanstack/react-query';

import { fetchMyProfile } from '../api';

/** Misma clave que la web. */
export function useMyProfile() {
  return useQuery({ queryKey: ['patients', 'me'], queryFn: fetchMyProfile });
}
