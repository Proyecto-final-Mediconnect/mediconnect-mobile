import type { ClinicalEntry } from '../types';

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
