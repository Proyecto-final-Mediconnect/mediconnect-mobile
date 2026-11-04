import { enArgentina } from '../../../shared/lib/argentina-time';
import type { ChatAttachment, ChatMessage } from '../types';

/**
 * Lógica del chat sin pantalla: unir mensajes, agruparlos y poner fechas.
 *
 * Es la de `mediconnect-web/src/features/chat/lib`, con una diferencia: las
 * fechas se arman con `enArgentina` y no con `Intl`, porque Hermes no trae en
 * todas las versiones los datos de zonas horarias (ver `argentina-time.ts`).
 */

/**
 * Une dos listas de mensajes sin repetir ninguno, en orden cronológico.
 *
 * El historial llega de a páginas y los nuevos con cada consulta periódica: los
 * dos caminos se pisan. El `id` decide qué es el mismo mensaje y, si aparece
 * dos veces, gana la versión que llega (`incoming`), que puede traer `leidoEl`.
 */
export function mergeMessages(current: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  const byId = new Map(current.map((m) => [m.id, m]));
  for (const message of incoming) byId.set(message.id, message);
  return [...byId.values()].sort(compareMessages);
}

/** Por fecha de envío, con el `id` como desempate: el mismo orden que el backend. */
function compareMessages(a: ChatMessage, b: ChatMessage): number {
  if (a.enviadoEl !== b.enviadoEl) return a.enviadoEl < b.enviadoEl ? -1 : 1;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

/** Dos mensajes seguidos de la misma persona se agrupan si los separa menos que esto. */
const GROUP_GAP_MS = 5 * 60_000;

function dayKey(iso: string | Date): string {
  return enArgentina(typeof iso === 'string' ? new Date(iso) : iso).date;
}

function yesterdayKey(now: Date): string {
  return dayKey(new Date(now.getTime() - 86_400_000));
}

/** "Ana García" → "AG". Para el avatar: no hay fotos de perfil. */
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const letters = words.length > 1 ? [words[0]!, words[words.length - 1]!] : words;
  return letters.map((w) => w[0]!.toLocaleUpperCase('es-AR')).join('');
}

/** `HH:MM` en Argentina. */
export function formatHour(iso: string): string {
  return enArgentina(new Date(iso)).time;
}

/** Para la bandeja: la hora si es de hoy, "Ayer", o "12 oct". */
export function formatInboxTime(iso: string, now: Date = new Date()): string {
  const key = dayKey(iso);
  if (key === dayKey(now)) return formatHour(iso);
  if (key === yesterdayKey(now)) return 'Ayer';
  const [, mes, dia] = key.split('-').map(Number);
  return `${dia} ${MESES[(mes ?? 1) - 1]!.slice(0, 3)}`;
}

/** Separador de días: "Hoy", "Ayer", "jueves 23 de octubre", o con año si es de otro. */
export function formatDayLabel(iso: string, now: Date = new Date()): string {
  const key = dayKey(iso);
  if (key === dayKey(now)) return 'Hoy';
  if (key === yesterdayKey(now)) return 'Ayer';
  const [anio, mes, dia] = key.split('-').map(Number);
  const mesNombre = MESES[(mes ?? 1) - 1]!;
  if (key.slice(0, 4) !== dayKey(now).slice(0, 4)) return `${dia} de ${mesNombre} de ${anio}`;
  // El día de la semana del día argentino: a mediodía UTC no hay corrimiento posible.
  const semana = DIAS[new Date(`${key}T12:00:00Z`).getUTCDay()]!;
  return `${semana} ${dia} de ${mesNombre}`;
}

export interface MessageRow {
  message: ChatMessage;
  mine: boolean;
  /** El separador de día que va antes de este mensaje, si es el primero de su día. */
  dayLabel: string | null;
  /** Primero de un grupo: lleva más aire arriba. */
  groupStart: boolean;
  /** Último de un grupo: lleva la hora (y "Leído" si es mío). */
  groupEnd: boolean;
}

/**
 * Cómo se dibuja cada mensaje: los seguidos de la misma persona, el mismo día y
 * con menos de 5 minutos entre sí van juntos y muestran la hora una sola vez, al
 * final, como en cualquier mensajero.
 */
export function layoutMessages(
  messages: ChatMessage[],
  myId: string,
  now: Date = new Date(),
): MessageRow[] {
  const days = messages.map((m) => dayKey(m.enviadoEl));
  const times = messages.map((m) => Date.parse(m.enviadoEl));
  const sameGroup = (i: number, j: number): boolean =>
    j >= 0 &&
    j < messages.length &&
    messages[i]!.autorId === messages[j]!.autorId &&
    days[i] === days[j] &&
    Math.abs(times[i]! - times[j]!) < GROUP_GAP_MS;

  return messages.map((message, i) => ({
    message,
    mine: message.autorId === myId,
    dayLabel: i > 0 && days[i - 1] === days[i] ? null : formatDayLabel(message.enviadoEl, now),
    groupStart: !sameGroup(i, i - 1),
    groupEnd: !sameGroup(i, i + 1),
  }));
}

/** Total de mensajes sin leer de la bandeja: el número del acceso en el inicio. */
export function totalUnread(conversations: { noLeidos: number }[]): number {
  return conversations.reduce((total, c) => total + c.noLeidos, 0);
}

/** "Foto" o "PDF": cómo se nombra un archivo del chat (ENG-102). */
export function attachmentKind(attachment: Pick<ChatAttachment, 'tipo'>): string {
  return attachment.tipo.startsWith('image/') ? 'Foto' : 'PDF';
}

/**
 * El último mensaje para la bandeja: "Vos: …" si lo mandé yo. Uno que es solo
 * un archivo dice qué es: "📎 Foto".
 */
export function previewOf(message: ChatMessage | null, myId: string): string {
  if (!message) return 'Todavía no hay mensajes';
  const texto =
    message.contenido.replace(/\s+/g, ' ').trim() ||
    (message.adjunto ? `📎 ${attachmentKind(message.adjunto)}` : '');
  return message.autorId === myId ? `Vos: ${texto}` : texto;
}
