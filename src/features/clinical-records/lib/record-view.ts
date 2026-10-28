import { formatMonth } from '../../appointments/lib/appointments';
import { enArgentina } from '../../../shared/lib/argentina-time';
import { ENTRY_TYPE_LABELS, type ClinicalEntry } from '../types';
import { authorName, readEntryFields } from './clinical-entry';

/** Lo más reciente primero (ENG-116). El backend devuelve la cadena hacia adelante. */
export function newestFirst(entries: ClinicalEntry[]): ClinicalEntry[] {
  return [...entries].sort((a, b) => b.sequenceNumber - a.sequenceNumber);
}

/**
 * Los vínculos de corrección, en los dos sentidos: qué entrada corrige cada
 * corrección y qué corrección tiene cada original.
 */
export function correctionLinks(entries: ClinicalEntry[]): {
  correctedBy: Map<string, ClinicalEntry>;
  corrects: Map<string, ClinicalEntry>;
} {
  const porId = new Map(entries.map((e) => [e.id, e]));
  const correctedBy = new Map<string, ClinicalEntry>();
  const corrects = new Map<string, ClinicalEntry>();

  for (const entry of entries) {
    if (!entry.correctsEntryId) continue;
    const original = porId.get(entry.correctsEntryId);
    if (!original) continue;
    // Si hubiera dos correcciones de la misma entrada, gana la última: es la
    // que vale.
    const previa = correctedBy.get(original.id);
    if (!previa || previa.sequenceNumber < entry.sequenceNumber)
      correctedBy.set(original.id, entry);
    corrects.set(entry.id, original);
  }

  return { correctedBy, corrects };
}

const ORDEN_TIPOS = ['CONSULTA', 'DIAGNOSTICO', 'PRESCRIPCION', 'ESTUDIO', 'CORRECCION'];

/** Los tipos que hay en la historia, en un orden fijo. Un filtro vacío no se ofrece. */
export function typesPresent(entries: ClinicalEntry[]): string[] {
  const presentes = new Set(entries.map((e) => e.entryType));
  return [
    ...ORDEN_TIPOS.filter((t) => presentes.has(t)),
    ...[...presentes].filter((t) => !ORDEN_TIPOS.includes(t)),
  ];
}

/** Minúsculas y sin tildes, para que "diagnostico" encuentre "Diagnóstico". */
function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/**
 * Busca en el contenido, el tipo y el profesional. Cada palabra tiene que
 * aparecer, en cualquier orden: "ibuprofeno garcia".
 */
export function searchEntries(entries: ClinicalEntry[], texto: string): ClinicalEntry[] {
  const palabras = normalizar(texto).split(/\s+/).filter(Boolean);
  if (palabras.length === 0) return entries;
  return entries.filter((entry) => {
    const todo = normalizar(
      [
        ENTRY_TYPE_LABELS[entry.entryType] ?? entry.entryType,
        authorName(entry),
        ...readEntryFields(entry).map((campo) => campo.value),
      ].join(' '),
    );
    return palabras.every((p) => todo.includes(p));
  });
}

/** El día del registro en el calendario argentino, `YYYY-MM-DD`. */
export function entryDay(entry: ClinicalEntry): string {
  return enArgentina(new Date(entry.createdAt)).date;
}

/**
 * Las entradas agrupadas por mes, en el orden en que llegan. La historia se lee
 * por meses, como se recuerda: "en agosto me vio la cardióloga".
 */
export function byMonth(
  entries: ClinicalEntry[],
): { key: string; title: string; data: ClinicalEntry[] }[] {
  const secciones: { key: string; title: string; data: ClinicalEntry[] }[] = [];
  for (const entry of entries) {
    const mes = entryDay(entry).slice(0, 7);
    const ultima = secciones[secciones.length - 1];
    if (ultima?.key === mes) ultima.data.push(entry);
    else secciones.push({ key: mes, title: formatMonth(mes), data: [entry] });
  }
  return secciones;
}
