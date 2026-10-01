import { apiRequest } from '../../shared/lib/api-client';
import type { PatientProfile } from './types';

/** `GET /patients/me`: la ficha del paciente de la sesión. */
export function fetchMyProfile(): Promise<PatientProfile> {
  return apiRequest<PatientProfile>('/patients/me', {
    fallbackMessage: 'No pudimos cargar tus datos.',
  });
}
