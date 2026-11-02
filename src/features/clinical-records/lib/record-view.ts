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
 * Períodos para filtrar la historia por fecha: los cortos que se usan para
 * "lo último que me hicieron", y los años para buscar algo viejo ("el estudio
 * de 2024"). Un año se escribe `A2024`.
 */
export type Period = 'TODO' | 'MES' | 'SEMESTRE' | 'ANIO' | `A${string}`;

const PERIOD_LABELS: Record<string, string> = {
  TODO: 'Todas las fechas',
  MES: 'Último mes',
  SEMESTRE: 'Últimos 6 meses',
  ANIO: 'Último año',
};

const MESES_ATRAS: Record<string, number> = { MES: 1, SEMESTRE: 6, ANIO: 12 };

export function periodLabel(period: Period): string {
  return PERIOD_LABELS[period] ?? period.slice(1);
}

/** Los años con registros, del más nuevo al más viejo. */
export function yearsPresent(entries: ClinicalEntry[]): string[] {
  return [...new Set(entries.map((e) => entryDay(e).slice(0, 4)))].sort().reverse();
}

/**
 * Las entradas del período, contando en el calendario argentino: "último mes"
 * es desde el mismo día del mes pasado, no 30 días de 24 horas.
 */
export function filterByPeriod(
  entries: ClinicalEntry[],
  period: Period,
  now: Date = new Date(),
): ClinicalEntry[] {
  if (period === 'TODO') return entries;
  // `ANIO` también empieza con A: un año son cuatro dígitos.
  if (/^A\d{4}$/.test(period)) {
    const anio = period.slice(1);
    return entries.filter((e) => entryDay(e).startsWith(anio));
  }
  const meses = MESES_ATRAS[period];
  if (!meses) return entries;
  const hoy = enArgentina(now).date;
  const desde = new Date(`${hoy}T12:00:00Z`);
  desde.setUTCMonth(desde.getUTCMonth() - meses);
  const corte = desde.toISOString().slice(0, 10);
  return entries.filter((e) => entryDay(e) >= corte);
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
