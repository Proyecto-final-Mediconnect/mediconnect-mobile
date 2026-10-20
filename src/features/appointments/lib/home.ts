import { enArgentina } from '../../../shared/lib/argentina-time';
import type { Appointment, AppointmentParty } from '../types';
import { isActive, splitByTime } from './appointments';

/** "Buen día" hasta el mediodía, "Buenas tardes" hasta las 20 y después "Buenas noches", en Argentina. */
export function greeting(now: Date): string {
  const hora = Number(enArgentina(now).time.slice(0, 2));
  if (hora >= 5 && hora < 12) return 'Buen día';
  if (hora >= 12 && hora < 20) return 'Buenas tardes';
  return 'Buenas noches';
}

/**
 * Los turnos que vienen después de la próxima consulta, que ya tiene su
 * tarjeta: solo los vigentes, del más cercano al más lejano.
 */
export function laterAppointments(
  appointments: Appointment[],
  next: Appointment | null,
  now: Date,
  limit = 3,
): Appointment[] {
  return splitByTime(appointments, now)
    .upcoming.filter((t) => isActive(t) && t.id !== next?.id)
    .slice(0, limit);
}

/**
 * Profesionales con los que el paciente ya se atendió, del más reciente al más
 * viejo y sin repetir: para volver a consultar sin buscarlos de nuevo.
 */
export function pastProfessionals(
  appointments: Appointment[],
  now: Date,
  limit = 4,
): AppointmentParty[] {
  const vistos = new Map<string, AppointmentParty>();
  for (const turno of splitByTime(appointments, now).past) {
    if (turno.status === 'COMPLETADO' && turno.professional && !vistos.has(turno.professional.id)) {
      vistos.set(turno.professional.id, turno.professional);
    }
  }
  return [...vistos.values()].slice(0, limit);
}
