import { diaArgentino } from '../../../shared/lib/argentina-time';
import { DOCUMENT_TYPE_LABELS, type PatientDocument, type UploadDocumentInput } from '../types';

/*
 * Reglas del archivo y del formulario, las mismas que aplica el backend
 * (backend#90). Se repiten acá para cortar antes: subir 10 MB por datos móviles
 * para que el servidor diga que no es plata y tiempo del paciente.
 */

export const MAX_BYTES = 10 * 1024 * 1024;
export const MAX_TEXTO = 120;

export const MENSAJE_TAMANO = 'El archivo no puede pasar los 10 MB.';

const TIPOS_ACEPTADOS = ['application/pdf', 'image/jpeg', 'image/png'];

const POR_EXTENSION: Record<string, string> = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  heic: 'image/heic',
  heif: 'image/heif',
};

const EXTENSION_DE: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
};

function extension(nombre: string): string {
  const punto = nombre.lastIndexOf('.');
  return punto < 0 ? '' : nombre.slice(punto + 1).toLowerCase();
}

/**
 * El tipo MIME del archivo. Los pickers no siempre lo informan —la cámara de
 * Android, algunos PDFs de "Archivos"—: entonces sale de la extensión. El
 * backend igual revisa la firma del archivo, así que esto es para avisar
 * temprano, no para confiar.
 */
export function mimeTypeOf(nombre: string, informado?: string | null): string {
  const limpio = informado?.toLowerCase().trim();
  if (limpio) return limpio === 'image/jpg' ? 'image/jpeg' : limpio;
  return POR_EXTENSION[extension(nombre)] ?? 'application/octet-stream';
}

/**
 * Un nombre de archivo que coincide con el tipo. La foto de la cámara llega sin
 * nombre, o con el `.heic` del original aunque el picker ya la haya pasado a
 * JPEG: el backend guarda el nombre y así no queda uno que mienta.
 */
export function fileNameFor(
  nombre: string | null | undefined,
  mimeType: string,
  ahora = new Date(),
): string {
  const ext = EXTENSION_DE[mimeType];
  const base = nombre?.trim() || `foto-${ahora.toISOString().slice(0, 10)}`;
  if (!ext) return base;
  const sinExtension = base.includes('.') ? base.slice(0, base.lastIndexOf('.')) : base;
  return `${sinExtension}.${ext}`;
}

/** Por qué no se puede subir este archivo, o `null` si se puede. */
export function fileProblem(file: { mimeType: string; sizeBytes: number | null }): string | null {
  if (file.mimeType === 'image/heic' || file.mimeType === 'image/heif') {
    return 'Esa foto está en formato HEIC y no se puede subir. Sacala desde acá con la cámara o elegí una en JPG o PNG.';
  }
  if (!TIPOS_ACEPTADOS.includes(file.mimeType)) {
    return 'Solo se pueden subir PDF, JPG o PNG.';
  }
  if (file.sizeBytes !== null && file.sizeBytes > MAX_BYTES) return MENSAJE_TAMANO;
  return null;
}

export type UploadFormErrors = Partial<
  Record<'title' | 'documentDate' | 'sourceInstitution', string>
>;

/** Una fecha de calendario real (`2025-02-30` no pasa) y que no esté en el futuro. */
function fechaValida(texto: string, hoy: Date): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) return false;
  const [y, m, d] = texto.split('-').map(Number) as [number, number, number];
  const fecha = new Date(Date.UTC(y, m - 1, d));
  if (fecha.getUTCFullYear() !== y || fecha.getUTCMonth() !== m - 1 || fecha.getUTCDate() !== d) {
    return false;
  }
  // Las cadenas `AAAA-MM-DD` se ordenan igual que las fechas.
  return texto <= diaArgentino(hoy);
}

export function validateUploadForm(
  form: Pick<UploadDocumentInput, 'title' | 'documentDate' | 'sourceInstitution'>,
  hoy = new Date(),
): UploadFormErrors {
  const errores: UploadFormErrors = {};
  const titulo = form.title.trim();
  if (!titulo) errores.title = 'Poné un nombre para reconocerlo, por ejemplo "Análisis de sangre".';
  else if (titulo.length > MAX_TEXTO) errores.title = `Hasta ${MAX_TEXTO} caracteres.`;

  const fecha = form.documentDate?.trim();
  if (fecha && !fechaValida(fecha, hoy)) {
    errores.documentDate = 'Usá el formato AAAA-MM-DD, con una fecha que ya pasó.';
  }

  if ((form.sourceInstitution?.trim().length ?? 0) > MAX_TEXTO) {
    errores.sourceInstitution = `Hasta ${MAX_TEXTO} caracteres.`;
  }
  return errores;
}

export function isPdf(mimeType: string): boolean {
  return mimeType === 'application/pdf';
}

/** `2483000` → `2,4 MB`; `81000` → `79 KB`. */
export function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
  }
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** `2025-03-12` → `12 mar 2025`. Es una fecha de calendario, sin hora ni zona. */
export function formatDocumentDate(fecha: string): string {
  const [y, m, d] = fecha.split('-').map(Number);
  return `${d} ${MESES[(m ?? 1) - 1]} ${y}`;
}

/** La línea de debajo del título: "Estudio · 12 mar 2025 · Hospital Italiano". */
export function documentSummary(doc: PatientDocument): string {
  return [
    DOCUMENT_TYPE_LABELS[doc.type] ?? doc.type,
    doc.documentDate ? formatDocumentDate(doc.documentDate) : null,
    doc.sourceInstitution,
  ]
    .filter(Boolean)
    .join(' · ');
}
