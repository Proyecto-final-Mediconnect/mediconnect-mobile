import { describe, expect, it } from 'vitest';

import type { Appointment } from '../types';
import { greeting, laterAppointments, pastProfessionals } from './home';

const NOW = new Date('2026-10-01T15:00:00.000Z');

function turno(id: string, scheduledAt: string, status: string, pro = 'p1'): Appointment {
  return {
    id,
    scheduledAt,
    date: scheduledAt.slice(0, 10),
    startTime: '10:00',
    durationMinutes: 30,
    price: 18000,
    currency: 'ARS',
    status,
    professional: { id: pro, firstName: pro, lastName: 'X' },
    patient: null,
  };
}

describe('greeting', () => {
  // Las horas son de Argentina, no del dispositivo ni UTC.
  it('saluda según la hora de Argentina', () => {
    expect(greeting(new Date('2026-10-01T12:00:00Z'))).toBe('Buen día'); // 09:00
    expect(greeting(new Date('2026-10-01T18:00:00Z'))).toBe('Buenas tardes'); // 15:00
    expect(greeting(new Date('2026-10-02T01:00:00Z'))).toBe('Buenas noches'); // 22:00
  });
});

describe('laterAppointments', () => {
  it('lista los vigentes que siguen a la próxima consulta', () => {
    const proxima = turno('a', '2026-10-02T13:00:00Z', 'CONFIRMADO');
    const cancelado = turno('b', '2026-10-03T13:00:00Z', 'CANCELADO');
    const despues = turno('c', '2026-10-04T13:00:00Z', 'RESERVADO_SIN_PAGAR');
    const pasado = turno('d', '2026-09-20T13:00:00Z', 'COMPLETADO');

    expect(
      laterAppointments([despues, pasado, cancelado, proxima], proxima, NOW).map((t) => t.id),
    ).toEqual(['c']);
  });
});

describe('pastProfessionals', () => {
  it('trae a quienes atendieron al paciente, sin repetir y el más reciente primero', () => {
    const viejo = turno('a', '2026-08-01T13:00:00Z', 'COMPLETADO', 'garcia');
    const reciente = turno('b', '2026-09-20T13:00:00Z', 'COMPLETADO', 'olivares');
    const otraVez = turno('c', '2026-09-25T13:00:00Z', 'COMPLETADO', 'garcia');
    const cancelado = turno('d', '2026-09-26T13:00:00Z', 'CANCELADO', 'ruiz');

    expect(pastProfessionals([viejo, reciente, otraVez, cancelado], NOW).map((p) => p.id)).toEqual([
      'garcia',
      'olivares',
    ]);
  });
});
