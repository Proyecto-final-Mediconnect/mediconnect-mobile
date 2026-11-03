import { apiRequest, ApiError } from '../../shared/lib/api-client';
import { MENSAJE_TAMANO } from './lib/document-file';
import type { DocumentDownload, PatientDocument, UploadDocumentInput } from './types';

/** `GET /patients/me/documents`: los vigentes, lo más nuevo primero. */
export function fetchMyDocuments(): Promise<PatientDocument[]> {
  return apiRequest<PatientDocument[]>('/patients/me/documents', {
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
export async function uploadDocument(input: UploadDocumentInput): Promise<PatientDocument> {
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
      fallbackMessage: 'No pudimos subir el documento.',
    });
  } catch (err) {
    // El 413 lo corta Multer antes de llegar al controller, sin un mensaje
    // pensado para el paciente.
    if (err instanceof ApiError && err.status === 413) throw new ApiError(413, MENSAJE_TAMANO);
    throw err;
  }
}

/** `DELETE /patients/me/documents/:id`: deja de verse, pero queda registrado. */
export function retireDocument(id: string): Promise<void> {
  return apiRequest<void>(`/patients/me/documents/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    fallbackMessage: 'No pudimos retirar el documento.',
  });
}

/** `GET /patient-documents/:id/download`: la URL firmada, que vence a los 5 minutos. */
export function fetchDocumentDownload(id: string): Promise<DocumentDownload> {
  return apiRequest<DocumentDownload>(`/patient-documents/${encodeURIComponent(id)}/download`, {
    fallbackMessage: 'No pudimos abrir el documento.',
  });
}
