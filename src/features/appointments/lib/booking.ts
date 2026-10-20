import { diaArgentino } from '../../../shared/lib/argentina-time';
import type { AvailabilityDay, AvailabilitySlot } from '../types';

/** Cuántos días se ofrecen para reservar desde el celular: dos semanas. */
export const BOOKING_WINDOW_DAYS = 14;

/** Desde hoy, en Argentina, hasta dentro de dos semanas. */
export function bookingRange(now: Date): { from: string; to: string } {
  return { from: diaArgentino(now), to: diaArgentino(now, BOOKING_WINDOW_DAYS - 1) };
}

/** Los horarios que se pueden reservar de un día. */
export function freeSlots(day: AvailabilityDay | undefined): AvailabilitySlot[] {
  if (!day || day.fullyBlocked) return [];
  return day.slots.filter((slot) => slot.status === 'AVAILABLE');
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
