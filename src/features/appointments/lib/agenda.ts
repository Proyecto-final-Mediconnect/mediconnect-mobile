import { diaArgentino } from '../../../shared/lib/argentina-time';
import type { Appointment } from '../types';
import { formatMonth, isActive, professionalName } from './appointments';

/**
 * "Mis turnos" en una sola lista: arriba los próximos vigentes, con todo el
 * detalle; abajo el resto —lo que ya pasó y lo que se canceló— agrupado por
 * mes, del más reciente al más viejo. Se baja y se ve la historia, sin pestañas.
 */

export type Period = 'todos' | 'este-mes' | 'mes-pasado' | 'ultimos-3-meses' | 'este-anio';
export type StatusFilter = 'todos' | 'confirmados' | 'sin-pagar' | 'completados' | 'cancelados';

export interface AgendaFilters {
  search: string;
  period: Period;
  status: StatusFilter;
}

export const EMPTY_AGENDA_FILTERS: AgendaFilters = { search: '', period: 'todos', status: 'todos' };

export const PERIOD_LABELS: Record<Period, string> = {
  todos: 'Cualquier fecha',
  'este-mes': 'Este mes',
  'mes-pasado': 'Mes pasado',
  'ultimos-3-meses': 'Últimos 3 meses',
  'este-anio': 'Este año',
};

export const STATUS_FILTER_LABELS: Record<StatusFilter, string> = {
  todos: 'Todos',
  confirmados: 'Confirmados',
  'sin-pagar': 'Sin pagar',
  completados: 'Completados',
  cancelados: 'Cancelados o liberados',
};

const ESTADOS: Record<Exclude<StatusFilter, 'todos'>, string[]> = {
  confirmados: ['CONFIRMADO'],
  'sin-pagar': ['RESERVADO_SIN_PAGAR'],
  completados: ['COMPLETADO', 'NO_ASISTIO'],
  cancelados: ['CANCELADO', 'LIBERADO'],
};

/** `YYYY-MM` corrido `meses` hacia atrás (negativo) o adelante. */
function mesRelativo(yearMonth: string, meses: number): string {
  const [y, m] = yearMonth.split('-').map(Number);
  const total = (y ?? 0) * 12 + ((m ?? 1) - 1) + meses;
  const mes = (total % 12) + 1;
  return `${String(Math.floor(total / 12))}-${String(mes).padStart(2, '0')}`;
}

/**
 * Si el turno cae en el período. Se compara la fecha local del turno (`date`),
 * no el instante: "este mes" es el mes del calendario argentino.
 */
export function inPeriod(appointment: Appointment, period: Period, now: Date): boolean {
  if (period === 'todos') return true;
  const hoy = diaArgentino(now);
  const mes = hoy.slice(0, 7);
  const delTurno = appointment.date.slice(0, 7);

  switch (period) {
    case 'este-mes':
      return delTurno === mes;
    case 'mes-pasado':
      return delTurno === mesRelativo(mes, -1);
    case 'ultimos-3-meses':
      return delTurno >= mesRelativo(mes, -2) && delTurno <= mes;
    case 'este-anio':
      return appointment.date.slice(0, 4) === hoy.slice(0, 4);
  }
}

function sinTildes(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

export function filterAgenda(
  appointments: Appointment[],
  filters: AgendaFilters,
  now: Date = new Date(),
): Appointment[] {
  const buscado = sinTildes(filters.search);
  return appointments.filter(
    (a) =>
      (buscado === '' || sinTildes(professionalName(a)).includes(buscado)) &&
      inPeriod(a, filters.period, now) &&
      (filters.status === 'todos' || ESTADOS[filters.status].includes(a.status)),
  );
}

export interface AgendaSection {
  key: string;
  title: string;
  /** `card`: la tarjeta completa, con acciones. `row`: una línea, en un grupo. */
  kind: 'card' | 'row';
  data: Appointment[];
}

function finDe(a: Appointment): number {
  return Date.parse(a.scheduledAt) + a.durationMinutes * 60_000;
}

/**
 * Las secciones de la lista: "Próximos" con los vigentes que todavía no
 * terminaron, del más cercano al más lejano, y después un grupo por mes con el
 * resto. Un turno cancelado de la semana que viene va a su mes y no a
 * "Próximos": no se va a realizar.
 */
export function agendaSections(
  appointments: Appointment[],
  now: Date = new Date(),
): AgendaSection[] {
  const ahora = now.getTime();
  const proximos = appointments
    .filter((a) => isActive(a) && finDe(a) > ahora)
    .sort((a, b) => Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt));
  const resto = appointments
    .filter((a) => !(isActive(a) && finDe(a) > ahora))
    .sort((a, b) => Date.parse(b.scheduledAt) - Date.parse(a.scheduledAt));

  const secciones: AgendaSection[] = [];
  if (proximos.length > 0) {
    secciones.push({ key: 'proximos', title: 'Próximos', kind: 'card', data: proximos });
  }
  for (const turno of resto) {
    const mes = turno.date.slice(0, 7);
    const ultima = secciones[secciones.length - 1];
    if (ultima?.key === mes) ultima.data.push(turno);
    else secciones.push({ key: mes, title: formatMonth(mes), kind: 'row', data: [turno] });
  }
  return secciones;
}
