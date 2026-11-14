import { apiRequest } from '../../shared/lib/api-client';
import type { PatientSummary } from './types';

/** `GET /patients/me/summary?from&to` (ENG-198). */
export function fetchMySummary(from: string, to: string): Promise<PatientSummary> {
  const qs = new URLSearchParams({ from, to }).toString();
  return apiRequest<PatientSummary>(`/patients/me/summary?${qs}`, {
    fallbackMessage: 'No pudimos cargar tu resumen.',
  });
}
