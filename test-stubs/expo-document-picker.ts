/*
 * Stub de `expo-document-picker` para Vitest: el selector de archivos es
 * nativo. `__documentos.proximo` es lo que elige el paciente (`null`: cancela).
 */

export interface DocumentPickerAsset {
  name: string;
  size?: number;
  uri: string;
  mimeType?: string;
  lastModified: number;
}

export type DocumentPickerResult =
  { canceled: false; assets: DocumentPickerAsset[] } | { canceled: true; assets: null };

const PDF: DocumentPickerAsset = {
  name: 'Hemograma_marzo.pdf',
  size: 245_000,
  uri: 'file:///cache/DocumentPicker/Hemograma_marzo.pdf',
  mimeType: 'application/pdf',
  lastModified: 0,
};

export const __documentos = {
  proximo: PDF as DocumentPickerAsset | null,
  reiniciar(): void {
    this.proximo = PDF;
  },
};

export async function getDocumentAsync(): Promise<DocumentPickerResult> {
  return __documentos.proximo
    ? { canceled: false, assets: [__documentos.proximo] }
    : { canceled: true, assets: null };
}
