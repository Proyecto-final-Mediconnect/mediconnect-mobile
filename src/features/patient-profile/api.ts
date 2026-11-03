import { apiRequest } from '../../shared/lib/api-client';
import type { PatientProfile, VitalInfoInput } from './types';

/** `GET /patients/me`: la ficha del paciente de la sesión. */
export function fetchMyProfile(): Promise<PatientProfile> {
  return apiRequest<PatientProfile>('/patients/me', {
    fallbackMessage: 'No pudimos cargar tus datos.',
  });
}

/**
 * `PUT /patients/me/vital` (ENG-134): guarda los datos de emergencia del
 * MediPass. Reemplaza el bloque entero, así que quitar una fila y guardar la
 * borra. Devuelve el perfil ya guardado.
 */
export function saveMyVitalInfo(input: VitalInfoInput): Promise<PatientProfile> {
  return apiRequest<PatientProfile>('/patients/me/vital', {
    method: 'PUT',
    body: input,
    fallbackMessage: 'No pudimos guardar tus datos de emergencia.',
  });
}
