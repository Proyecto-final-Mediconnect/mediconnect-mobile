import type { Appointment } from '../types';

/**
 * Qué pasó con un turno que quedó a reprogramar, según la causa (ENG-237).
 *
 * Una consulta a la que el profesional no se conectó, o que falló, no es una
 * cancelación: decir "canceló" sería contar otra cosa. Sin causa (o con un
 * backend anterior) es la cancelación a mano de ENG-204.
 */
export function reprogramHeadline(
  appointment: Pick<Appointment, 'reprogramCause'>,
  profesional: string,
): string {
  switch (appointment.reprogramCause) {
    case 'AUSENCIA_PROFESIONAL':
      return `${profesional} no se conectó a tu consulta`;
    case 'FALLA_TECNICA':
      return 'Tu consulta no se pudo completar por una falla técnica';
    default:
      return `${profesional} no va a poder atenderte`;
  }
}

/** El paso de la historia del turno en que dejó de valer el horario. */
export function reprogramStepTitle(
  appointment: Pick<Appointment, 'reprogramCause'>,
  profesional: string,
): string {
  switch (appointment.reprogramCause) {
    case 'AUSENCIA_PROFESIONAL':
      return `${profesional} no se conectó a la consulta`;
    case 'FALLA_TECNICA':
      return `${profesional} informó una falla técnica`;
    default:
      return `${profesional} canceló el turno`;
  }
}

/** La frase del aviso al elegir el horario nuevo: qué le pasó al turno. */
export function reprogramLead(
  appointment: Pick<Appointment, 'reprogramCause'>,
  profesional: string,
  dia: string,
): string {
  switch (appointment.reprogramCause) {
    case 'AUSENCIA_PROFESIONAL':
      return `${profesional} no se conectó a tu consulta del ${dia}.`;
    case 'FALLA_TECNICA':
      return `Tu consulta del ${dia} no se pudo completar por una falla técnica.`;
    default:
      return `${profesional} canceló tu turno del ${dia}.`;
  }
}

/**
 * Si el motivo guardado le dice algo al paciente. El de la ausencia es fijo
 * ("El profesional no se conectó…") y repetiría el título.
 */
export function showsReason(appointment: Pick<Appointment, 'reprogramCause'>): boolean {
  return appointment.reprogramCause !== 'AUSENCIA_PROFESIONAL';
}
