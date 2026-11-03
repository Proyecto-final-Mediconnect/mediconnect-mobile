/**
 * Documentos que aporta el paciente (ENG-164): estudios, epicrisis y papeles
 * que trae de antes de MediConnect.
 *
 * No son parte de la historia clínica: la HC la firman los profesionales y
 * queda sellada; esto lo sube el paciente y nadie lo validó. Por eso viven en
 * su propio feature y la app los rotula siempre como "aportado por vos".
 */

export type PatientDocumentType = 'ESTUDIO' | 'EPICRISIS' | 'INFORME' | 'RECETA' | 'OTRO';

/** En el orden en que se ofrecen: el estudio primero, que es el caso común. */
export const DOCUMENT_TYPES: PatientDocumentType[] = [
  'ESTUDIO',
  'EPICRISIS',
  'INFORME',
  'RECETA',
  'OTRO',
];

export const DOCUMENT_TYPE_LABELS: Record<PatientDocumentType, string> = {
  ESTUDIO: 'Estudio',
  EPICRISIS: 'Epicrisis',
  INFORME: 'Informe',
  RECETA: 'Receta',
  OTRO: 'Otro',
};

/** Lo que devuelve el backend (`PatientDocumentView`, backend#90). */
export interface PatientDocument {
  id: string;
  type: PatientDocumentType;
  title: string;
  /** `AAAA-MM-DD`: la fecha del papel, no la de subida. */
  documentDate: string | null;
  sourceInstitution: string | null;
  mimeType: string;
  sizeBytes: number;
  /** ISO-8601. */
  uploadedAt: string;
}

/**
 * El archivo elegido con la cámara, la galería o el selector de documentos, ya
 * normalizado. Es serializable a propósito: viaja como parámetro de la
 * navegación hasta el formulario.
 */
export interface PickedFile {
  /** `file://` local: React Native lo lee del disco recién al mandar el multipart. */
  uri: string;
  name: string;
  mimeType: string;
  /** `null` si el picker no lo informa: lo valida el backend. */
  sizeBytes: number | null;
}

export interface UploadDocumentInput {
  file: PickedFile;
  type: PatientDocumentType;
  title: string;
  documentDate?: string;
  sourceInstitution?: string;
}

/** `GET /patient-documents/:id/download`: una URL firmada que vence a los 5 minutos. */
export interface DocumentDownload {
  url: string;
  expiresAt: string;
}
