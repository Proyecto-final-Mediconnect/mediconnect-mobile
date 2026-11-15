import { diaArgentino } from '../../../shared/lib/argentina-time';
import type { AvailabilityDay, AvailabilitySlot } from '../types';

/**
 * Cuántos días se ofrecen para reservar: los mismos 60 que la web y que el
 * horizonte del backend (`BOOKING_HORIZON_DAYS`). Se piden en un solo pedido; la
 * tira muestra los más cercanos y el calendario, el resto.
 */
export const BOOKING_WINDOW_DAYS = 60;

/**
 * Si `fecha` (`YYYY-MM-DD`) es hoy en Argentina. Se compara con el día real y no
 * con la posición en el arreglo: el rango se fija al montar la pantalla y la
 * respuesta puede quedar en caché, así que pasada la medianoche el primer día
 * ya no es hoy.
 */
export function esHoy(fecha: string, ahora: Date = new Date()): boolean {
  return fecha === diaArgentino(ahora);
}

/** Desde hoy, en Argentina, hasta el final del horizonte. */
export function bookingRange(now: Date): { from: string; to: string } {
  return { from: diaArgentino(now), to: diaArgentino(now, BOOKING_WINDOW_DAYS - 1) };
}

/**
 * Los horarios que se pueden reservar de un día, ordenados por hora: el backend
 * los arma de varios bloques de agenda y nada garantiza que lleguen en orden.
 */
export function freeSlots(day: AvailabilityDay | undefined): AvailabilitySlot[] {
  if (!day || day.fullyBlocked) return [];
  return day.slots
    .filter((slot) => slot.status === 'AVAILABLE')
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
}

/** El primer día con algún horario libre, para abrir la pantalla ahí. */
export function firstDayWithSlots(days: AvailabilityDay[]): string | null {
  return days.find((day) => freeSlots(day).length > 0)?.date ?? null;
}

const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** `2026-10-02` → `{ weekday: 'vie', day: '2', month: 'oct' }`, para la tira de días. */
export function dayParts(date: string): { weekday: string; day: string; month: string } {
  const [y, m, d] = date.split('-').map(Number);
  const weekday = DIAS[new Date(Date.UTC(y ?? 0, (m ?? 1) - 1, d ?? 1)).getUTCDay()] ?? '';
  return { weekday, day: String(d), month: MESES[(m ?? 1) - 1] ?? '' };
}

/** Los meses que toca la disponibilidad, en orden: `['2026-11', '2026-12']`. */
export function monthsOf(days: AvailabilityDay[]): string[] {
  return [...new Set(days.map((d) => d.date.slice(0, 7)))];
}

/**
 * Las celdas de un mes para una grilla de siete columnas que empieza en lunes,
 * como se lee un calendario acá. Los huecos son `null`: lo que está fuera del mes
 * no se puede elegir y no hace falta pintarlo.
 */
export function monthGrid(monthKey: string): (string | null)[] {
  const [y, m] = monthKey.split('-').map(Number) as [number, number];
  const domingoEsCero = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
  const huecos = (domingoEsCero + 6) % 7;
  const largo = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return [
    ...Array.from({ length: huecos }, () => null),
    ...Array.from({ length: largo }, (_, i) => `${monthKey}-${String(i + 1).padStart(2, '0')}`),
  ];
}

/**
 * La grilla del mes partida en semanas de siete celdas, con la última completada
 * con huecos. Se pinta fila por fila y no con `flexWrap` sobre celdas de
 * `100 / 7 %`: el redondeo de ese porcentaje mandaba el domingo a la fila de
 * abajo en algunos anchos de pantalla y desalineaba todo el mes.
 */
export function monthWeeks(monthKey: string): (string | null)[][] {
  const celdas = monthGrid(monthKey);
  const semanas: (string | null)[][] = [];
  for (let i = 0; i < celdas.length; i += 7) {
    const semana = celdas.slice(i, i + 7);
    semanas.push([...semana, ...Array.from({ length: 7 - semana.length }, () => null)]);
  }
  return semanas;
}
