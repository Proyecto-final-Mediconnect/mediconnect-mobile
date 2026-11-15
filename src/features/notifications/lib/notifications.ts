import type { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

import type { InAppNotification } from '../types';

const MINUTO = 60_000;
const HORA = 60 * MINUTO;
const DIA = 24 * HORA;

const FECHA = new Intl.DateTimeFormat('es-AR', {
  timeZone: 'America/Argentina/Buenos_Aires',
  day: 'numeric',
  month: 'short',
});

/** "hace 1 minuto", "hace 5 minutos". */
function hace(n: number, singular: string, plural: string): string {
  return `hace ${n} ${n === 1 ? singular : plural}`;
}

/**
 * Cuándo llegó un aviso, como en la campanita de la web: "recién", "hace 5
 * minutos", "ayer"… y la fecha corta después de una semana.
 *
 * Armado a mano y no con `Intl.RelativeTimeFormat`: Hermes, el motor de la app,
 * no lo trae, y construirlo rompe la app al cargar.
 */
export function relativeTime(ahora: Date, iso: string): string {
  const entonces = new Date(iso);
  const diff = ahora.getTime() - entonces.getTime();
  if (Number.isNaN(diff)) return '';

  if (diff < MINUTO) return 'recién';
  if (diff < HORA) return hace(Math.floor(diff / MINUTO), 'minuto', 'minutos');
  if (diff < DIA) return hace(Math.floor(diff / HORA), 'hora', 'horas');
  const dias = Math.floor(diff / DIA);
  if (dias === 1) return 'ayer';
  if (dias === 2) return 'anteayer';
  if (dias < 7) return hace(dias, 'día', 'días');
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

type IconName = ComponentProps<typeof Ionicons>['name'];

const ICONOS: Record<string, IconName> = {
  MEDIPASS_ACCESO: 'qr-code-outline',
  NUEVO_MENSAJE: 'chatbubble-outline',
  PAGO_ACREDITADO: 'card-outline',
  PAGO_CONFIRMADO: 'card-outline',
  TURNO_RESERVADO: 'calendar-outline',
  TURNO_REPROGRAMADO: 'calendar-outline',
  TURNO_CANCELADO: 'close-circle-outline',
  RECORDATORIO_24H: 'time-outline',
  RECORDATORIO_1H: 'time-outline',
  // Ya no se generan (no hay moderación), pero quedan los viejos en la bandeja.
  RESENA_MODERADA: 'star-outline',
};

/** El ícono de cada tipo de aviso, para reconocerlo sin leerlo. */
export function iconOf(type: string): IconName {
  return ICONOS[type] ?? 'notifications-outline';
}

/** El número del globito: hasta 9, después "9+". */
export function badgeText(unread: number): string {
  return unread > 9 ? '9+' : String(unread);
}
