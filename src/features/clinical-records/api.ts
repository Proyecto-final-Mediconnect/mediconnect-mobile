import { apiRequest } from '../../shared/lib/api-client';
import type { ClinicalEntry } from './types';

/**
 * `GET /patients/:id/clinical-record`, de la más vieja a la más nueva.
 *
 * El id es siempre el del paciente de la sesión (`useSessionUser()`), nunca uno
 * que venga de otro lado: la app no ofrece un camino para pedir la HC de otra
 * persona (ENG-116). El backend además lo impide con RLS.
 */
export function fetchClinicalRecord(patientId: string): Promise<ClinicalEntry[]> {
  return apiRequest<ClinicalEntry[]>(`/patients/${patientId}/clinical-record`, {
    fallbackMessage: 'No se pudo cargar tu historia clínica.',
  });
}
