import { useQuery } from '@tanstack/react-query';

import { useSessionUser } from '../../auth/session';
import { fetchMyProfile } from '../api';

/** Misma clave que la web, más el id de la sesión (ver `MY_APPOINTMENTS_KEY`). */
export function useMyProfile() {
  const { id } = useSessionUser();
  return useQuery({ queryKey: ['patients', 'me', id], queryFn: fetchMyProfile });
}
