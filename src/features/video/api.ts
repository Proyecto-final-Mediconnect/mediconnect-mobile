import { apiRequest } from '../../shared/lib/api-client';
import type { VideoConsultationAccess } from './types';

/**
 * `POST /appointments/:id/video`: entra a la videoconsulta del turno y devuelve
 * la URL de la sala con el meeting token. La primera llamada **crea** la sala,
 * así que no es una lectura, y la URL lleva una credencial: no se cachea.
 */
export function joinVideoConsultation(appointmentId: string): Promise<VideoConsultationAccess> {
  return apiRequest<VideoConsultationAccess>(
    `/appointments/${encodeURIComponent(appointmentId)}/video`,
    { method: 'POST', fallbackMessage: 'No se pudo abrir la videoconsulta.' },
  );
}
