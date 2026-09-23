import type { Appointment, AppointmentParty } from '../features/appointments/types';
import { desdeArgentina, diaArgentino, enArgentina } from '../shared/lib/argentina-time';
import { PACIENTE_DEMO } from './patient';

/**
 * Turnos de ejemplo, armados relativos a cuándo se abre la app para que la demo
 * no envejezca: siempre hay una consulta a punto de empezar, otras por venir y
 * un historial.
 *
 * Cubren los estados que la pantalla tiene que resolver: sala abierta,
 * confirmado, sin pagar, cancelado, completado y liberado. Y un turno a las
 * 22:30, que es el caso borde de zona horaria de ENG-115.
 */

const OCAMPO: AppointmentParty = { id: 'pro-ocampo', firstName: 'Valeria', lastName: 'Ocampo' };
const ALIAGA: AppointmentParty = { id: 'pro-aliaga', firstName: 'Tomás', lastName: 'Aliaga' };
const GARCIA: AppointmentParty = { id: 'pro-garcia', firstName: 'Ana', lastName: 'García' };
const OLIVARES: AppointmentParty = {
  id: 'pro-olivares',
  firstName: 'Martín',
  lastName: 'Olivares',
};

const PACIENTE: AppointmentParty = {
  id: PACIENTE_DEMO.id,
  firstName: PACIENTE_DEMO.firstName,
  lastName: PACIENTE_DEMO.lastName,
};

function turno(
  id: string,
  instante: Date,
  professional: AppointmentParty,
  status: string,
  price = 18_500,
): Appointment {
  const { date, time } = enArgentina(instante);
  return {
    id,
    scheduledAt: instante.toISOString(),
    date,
    startTime: time,
    durationMinutes: 30,
    price,
    currency: 'ARS',
    status,
    professional,
    patient: PACIENTE,
  };
}

/** Un día relativo a hoy, a una hora fija de Argentina. */
function el(ahora: Date, dias: number, hora: string): Date {
  return desdeArgentina(diaArgentino(ahora, dias), hora);
}

export function crearTurnosDemo(ahora: Date = new Date()): Appointment[] {
  // Redondeado al minuto: una consulta que empieza "en 8 minutos y 23 segundos"
  // no existe; los turnos se dan a horario.
  const enOchoMinutos = new Date(Math.ceil((ahora.getTime() + 8 * 60_000) / 60_000) * 60_000);

  return [
    turno('turno-sala', enOchoMinutos, OCAMPO, 'CONFIRMADO'),
    turno('turno-aliaga', el(ahora, 3, '16:00'), ALIAGA, 'RESERVADO_SIN_PAGAR', 22_000),
    turno('turno-cancelado', el(ahora, 6, '10:30'), GARCIA, 'CANCELADO'),
    turno('turno-noche', el(ahora, 12, '22:30'), OLIVARES, 'CONFIRMADO', 26_000),
    turno('turno-control', el(ahora, -14, '09:00'), GARCIA, 'COMPLETADO'),
    turno('turno-liberado', el(ahora, -32, '18:00'), ALIAGA, 'LIBERADO', 22_000),
    turno('turno-primera', el(ahora, -60, '11:30'), OCAMPO, 'COMPLETADO', 26_000),
  ].sort((a, b) => Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt));
}

let turnos = crearTurnosDemo();

export const turnosDemo = {
  listar: (): Appointment[] => turnos.map((t) => ({ ...t })),
  cancelar(id: string): Appointment {
    const actual = turnos.find((t) => t.id === id);
    if (!actual) throw new Error('No encontramos ese turno.');
    const cancelado = { ...actual, status: 'CANCELADO' };
    turnos = turnos.map((t) => (t.id === id ? cancelado : t));
    return cancelado;
  },
  /** Para los tests: vuelve al estado inicial. */
  reiniciar(ahora?: Date): void {
    turnos = crearTurnosDemo(ahora);
  },
};
