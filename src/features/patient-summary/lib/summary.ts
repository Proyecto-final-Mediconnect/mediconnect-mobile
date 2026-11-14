import { diaArgentino } from '../../../shared/lib/argentina-time';
import type { PatientSummary } from '../types';

/** Los períodos del resumen del inicio (ENG-198), los mismos que en la web. */
export type SummaryPeriod = '30D' | 'ANIO';

export const PERIOD_LABELS: Record<SummaryPeriod, string> = {
  '30D': 'Últimos 30 días',
  ANIO: 'Este año',
};

/** `from`/`to` de cada período, en fechas de Argentina. */
export function periodRange(
  period: SummaryPeriod,
  now: Date = new Date(),
): { from: string; to: string } {
  const hoy = diaArgentino(now);
  if (period === 'ANIO') return { from: `${hoy.slice(0, 4)}-01-01`, to: hoy };
  return { from: diaArgentino(now, -29), to: hoy };
}

/** Sin consultas, pagos ni accesos: se muestra un vacío en vez de cuatro ceros. */
export function sinActividad(s: PatientSummary): boolean {
  return (
    s.consultas.realizadas === 0 &&
    s.pagos.pagado === 0 &&
    s.pagos.reembolsado === 0 &&
    s.accesos.total === 0
  );
}

/**
 * Se paga al reservar: lo pagado incluye turnos que todavía no pasaron, así que
 * se aclara cuántos son para que cierre con "consultas realizadas".
 */
export function detallePagos({ turnos, porVenir }: PatientSummary['pagos']): string {
  const base = turnos === 1 ? 'Por 1 turno' : `Por ${turnos} turnos`;
  if (porVenir === 0) return base;
  return `${base} · ${porVenir === 1 ? '1 pendiente' : `${porVenir} pendientes`}`;
}
