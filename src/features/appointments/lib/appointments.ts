import type { Appointment } from '../types';

/**
 * Reglas de los turnos del paciente, portadas de `mediconnect-web`
 * (`lib/myAppointments.ts`). Lógica pura, para testearla sin montar pantallas.
 */

/** Estados que ocupan el horario. Espeja `ACTIVE_STATUSES` del backend. */
const ACTIVE_STATUSES = ['RESERVADO_SIN_PAGAR', 'CONFIRMADO'];

/**
 * Nombre visible de cada estado. Son los de la web acortados para que entren en
 * un chip: "Reservado (sin pagar)" pasa a "Sin pagar", que es lo que el paciente
 * tiene que saber. Un estado desconocido se muestra crudo en vez de romper.
 */
const STATUS_LABELS: Record<string, string> = {
  RESERVADO_SIN_PAGAR: 'Sin pagar',
  CONFIRMADO: 'Confirmado',
  CANCELADO: 'Cancelado',
  COMPLETADO: 'Completado',
  NO_ASISTIO: 'No asistió',
  LIBERADO: 'Liberado',
};

export function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

/**
 * Cómo se pinta cada estado: `ok` en teal, `warning` en el naranja del canvas
 * ("A confirmar"), `neutral` en gris para lo que ya no está vigente.
 */
export function statusTone(status: string): 'ok' | 'warning' | 'neutral' {
  if (status === 'CONFIRMADO') return 'ok';
  if (status === 'RESERVADO_SIN_PAGAR') return 'warning';
  return 'neutral';
}

export function isActive(appointment: Appointment): boolean {
  return ACTIVE_STATUSES.includes(appointment.status);
}

/**
 * El turno que va en la tarjeta del inicio: el próximo vigente.
 *
 * Un turno cancelado no es "tu próxima consulta" aunque sea el más cercano. Uno
 * que está en curso sí: sigue siendo el que importa hasta que termina, y es
 * justo cuando hace falta el botón para entrar a la sala.
 */
export function nextAppointment(
  appointments: Appointment[],
  now: Date = new Date(),
): Appointment | null {
  const vigentes = appointments
    .filter((a) => isActive(a) && finDe(a) > now.getTime())
    .sort((a, b) => Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt));

  return vigentes[0] ?? null;
}

function finDe(appointment: Appointment): number {
  return Date.parse(appointment.scheduledAt) + appointment.durationMinutes * 60_000;
}

const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

/**
 * `2026-09-03` + `09:30` → `jue 3 · 09:30`.
 *
 * Sale de `date`/`startTime`, que ya son la hora local del turno, y el día de la
 * semana se calcula en UTC sobre esa fecha: calcularlo con la zona del teléfono
 * podría correrlo un día para quien viaja.
 */
export function formatShortDay(date: string, startTime: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const dia = DIAS[new Date(Date.UTC(y ?? 0, (m ?? 1) - 1, d ?? 1)).getUTCDay()];
  return `${dia} ${d} · ${startTime}`;
}

export function professionalName(appointment: Appointment): string {
  const p = appointment.professional;
  // Es una consulta médica: perder el nombre es mejor que perder el turno.
  return p ? `${p.firstName} ${p.lastName}` : 'Profesional sin nombre cargado';
}
