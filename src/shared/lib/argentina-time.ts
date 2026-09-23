/**
 * Hora de Argentina (`America/Argentina/Buenos_Aires`), sin depender de la zona
 * del teléfono (ENG-115).
 *
 * Argentina está en UTC−3 todo el año —no tiene horario de verano desde 2009—,
 * así que alcanza con restar tres horas al instante. Se hace a mano y no con
 * `Intl` porque Hermes, el motor de React Native, no trae en todas las
 * versiones los datos de zonas horarias, y un turno mostrado en la hora de otro
 * país es un paciente que llega tarde.
 */
const OFFSET_MS = -3 * 60 * 60_000;

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** Un instante → fecha y hora en Argentina: `YYYY-MM-DD` y `HH:MM`. */
export function enArgentina(instante: Date): { date: string; time: string } {
  const local = new Date(instante.getTime() + OFFSET_MS);
  return {
    date: `${local.getUTCFullYear()}-${pad(local.getUTCMonth() + 1)}-${pad(local.getUTCDate())}`,
    time: `${pad(local.getUTCHours())}:${pad(local.getUTCMinutes())}`,
  };
}

/** Fecha y hora de Argentina → el instante. La inversa de `enArgentina`. */
export function desdeArgentina(date: string, time: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  return new Date(Date.UTC(y ?? 0, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0) - OFFSET_MS);
}

/** El día en Argentina de un instante, corrido `dias` días: `YYYY-MM-DD`. */
export function diaArgentino(instante: Date, dias = 0): string {
  return enArgentina(new Date(instante.getTime() + dias * 86_400_000)).date;
}
