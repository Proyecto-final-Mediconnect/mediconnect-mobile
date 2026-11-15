import type { InAppNotification } from '../types';

const MINUTO = 60_000;
const HORA = 60 * MINUTO;
const DIA = 24 * HORA;

const RELATIVO = new Intl.RelativeTimeFormat('es-AR', { numeric: 'auto' });
const FECHA = new Intl.DateTimeFormat('es-AR', {
  timeZone: 'America/Argentina/Buenos_Aires',
  day: 'numeric',
  month: 'short',
});

/**
 * Cuándo llegó un aviso, como en la campanita de la web: "recién", "hace 5
 * minutos", "ayer"… y la fecha corta después de una semana.
 */
export function relativeTime(ahora: Date, iso: string): string {
  const entonces = new Date(iso);
  const diff = ahora.getTime() - entonces.getTime();
  if (Number.isNaN(diff)) return '';

  if (diff < MINUTO) return 'recién';
  if (diff < HORA) return RELATIVO.format(-Math.floor(diff / MINUTO), 'minute');
  if (diff < DIA) return RELATIVO.format(-Math.floor(diff / HORA), 'hour');
  if (diff < 7 * DIA) return RELATIVO.format(-Math.floor(diff / DIA), 'day');
  return FECHA.format(entonces);
}

/** A dónde lleva tocar un aviso. */
export type NotificationTarget =
  | { kind: 'conversacion'; conversationId: string }
  | { kind: 'medipass' }
  | { kind: 'turno'; appointmentId: string }
  | null;

/**
 * Cada aviso lleva a donde se resuelve lo que dice: el mensaje a su chat, el
 * acceso al MediPass a donde se ve quién mira y se le corta (ENG-177), y el
 * resto de los avisos de un turno al detalle de ese turno. Sin destino, tocarlo
 * solo lo marca como leído.
 */
export function targetOf(n: InAppNotification): NotificationTarget {
  if (n.conversationId) return { kind: 'conversacion', conversationId: n.conversationId };
  if (n.type === 'MEDIPASS_ACCESO') return { kind: 'medipass' };
  if (n.appointmentId) return { kind: 'turno', appointmentId: n.appointmentId };
  return null;
}

/** El número del globito: hasta 9, después "9+". */
export function badgeText(unread: number): string {
  return unread > 9 ? '9+' : String(unread);
}
