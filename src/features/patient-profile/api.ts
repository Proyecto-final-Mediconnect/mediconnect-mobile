import { apiRequest } from '../../shared/lib/api-client';
import type { PatientProfile, PatientProfileInput, VitalInfoInput } from './types';

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

/**
 * `PUT /patients/me` (ENG-236): guarda los datos personales, la misma ruta que
 * la web. La primera vez crea la ficha. Un DNI que ya usa otro paciente da 409
 * con "Ese DNI ya está registrado.". Devuelve el perfil ya guardado.
 */
export function saveMyProfile(input: PatientProfileInput): Promise<PatientProfile> {
  return apiRequest<PatientProfile>('/patients/me', {
    method: 'PUT',
    body: input,
    fallbackMessage: 'No pudimos guardar tus datos.',
  });
}
