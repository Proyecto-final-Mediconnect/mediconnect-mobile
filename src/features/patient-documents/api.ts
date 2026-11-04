import { apiRequest, ApiError } from '../../shared/lib/api-client';
import { MENSAJE_TAMANO } from './lib/document-file';
import type { DocumentDownload, PatientDocument, UploadDocumentInput } from './types';

/**
 * El minuto de siempre alcanza para despertar a Render, pero no para mandar 10
 * MB por datos móviles flojos: la subida espera hasta 3 minutos.
 */
const TIMEOUT_SUBIDA_MS = 3 * 60_000;

const SIN_DETALLE = 'No pudimos subir el documento.';

const MENSAJES_SUBIDA: Record<400 | 422, string> = {
  400: 'Solo se pueden subir PDF, JPG o PNG.',
  422: 'Llegaste al máximo de documentos. Retirá alguno para subir otro.',
};

/**
 * Tope de documentos vigentes por paciente (backend#90): con más, la subida da
 * 422. Como entra en una sola página, la lista se pide entera de una vez.
 */
export const MAX_DOCUMENTOS = 50;

/** `GET /patients/me/documents`: los vigentes, lo más nuevo primero. */
export function fetchMyDocuments(): Promise<PatientDocument[]> {
  return apiRequest<PatientDocument[]>(`/patients/me/documents?limit=${MAX_DOCUMENTOS}`, {
    fallbackMessage: 'No pudimos cargar tus documentos.',
  });
}

/**
 * `POST /patients/me/documents`, multipart.
 *
 * En React Native el archivo va como `{ uri, name, type }`: el `FormData` nativo
 * lo lee del disco al mandar, sin pasar los bytes por JavaScript. No es un
 * `Blob`, de ahí el cast.
 */
export async function uploadDocument(
  input: UploadDocumentInput,
  signal?: AbortSignal,
): Promise<PatientDocument> {
  const form = new FormData();
  form.append('file', {
    uri: input.file.uri,
    name: input.file.name,
    type: input.file.mimeType,
  } as unknown as Blob);
  form.append('type', input.type);
  form.append('title', input.title.trim());
  const fecha = input.documentDate?.trim();
  if (fecha) form.append('documentDate', fecha);
  const institucion = input.sourceInstitution?.trim();
  if (institucion) form.append('sourceInstitution', institucion);

  try {
    return await apiRequest<PatientDocument>('/patients/me/documents', {
      method: 'POST',
      body: form,
      fallbackMessage: SIN_DETALLE,
      timeoutMs: TIMEOUT_SUBIDA_MS,
      signal,
    });
  } catch (err) {
    // El 413 lo corta Multer antes de llegar al controller, sin un mensaje
    // pensado para el paciente.
    if (err instanceof ApiError && err.status === 413) throw new ApiError(413, MENSAJE_TAMANO);
    // El 400 (tipo o firma del archivo) y el 422 (tope de 50 documentos o 200
    // MB) traen un mensaje del backend pensado para el paciente, que dice qué
    // hacer; solo se cubre el caso de que venga sin texto.
    if (
      err instanceof ApiError &&
      (err.status === 400 || err.status === 422) &&
      err.message === SIN_DETALLE
    ) {
      throw new ApiError(err.status, MENSAJES_SUBIDA[err.status]);
    }
    throw err;
  }
}

/**
 * `DELETE /patients/me/documents/:id`: deja de verse, pero queda registrado.
 *
 * El 404 es que ya estaba retirado (desde la web, otro teléfono o un doble
 * toque): lo que el paciente pidió ya pasó, así que no es un error.
 */
export async function retireDocument(id: string): Promise<void> {
  try {
    await apiRequest<void>(`/patients/me/documents/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      fallbackMessage: 'No pudimos retirar el documento.',
    });
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return;
    throw err;
  }
}

/** `GET /patient-documents/:id/download`: la URL firmada, que vence a los 5 minutos. */
export function fetchDocumentDownload(id: string): Promise<DocumentDownload> {
  return apiRequest<DocumentDownload>(`/patient-documents/${encodeURIComponent(id)}/download`, {
    fallbackMessage: 'No pudimos abrir el documento.',
  });
}
