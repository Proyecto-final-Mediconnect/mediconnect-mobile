import { describe, expect, it } from 'vitest';

import type { Appointment } from '../types';
import {
  canCancel,
  formatPrice,
  formatSentenceDay,
  formatShortDay,
  nextAppointment,
  professionalName,
  splitByTime,
  statusLabel,
  statusTone,
  whenIs,
} from './appointments';

const NOW = new Date('2026-09-02T12:00:00.000Z');

function turno(overrides: Partial<Appointment> = {}): Appointment {
  return {
    id: 'a1',
    scheduledAt: '2026-09-03T12:30:00.000Z',
    date: '2026-09-03',
    startTime: '09:30',
    durationMinutes: 30,
    price: 18500,
    currency: 'ARS',
    status: 'CONFIRMADO',
    professional: { id: 'p1', firstName: 'Valeria', lastName: 'Ocampo' },
    patient: { id: 'q1', firstName: 'Marina', lastName: 'Sosa' },
    ...overrides,
  };
}

describe('nextAppointment', () => {
  it('elige el vigente más cercano, sin importar el orden en que llegan', () => {
    const lejano = turno({ id: 'lejano', scheduledAt: '2026-09-20T12:00:00.000Z' });
    const cercano = turno({ id: 'cercano' });

    expect(nextAppointment([lejano, cercano], NOW)?.id).toBe('cercano');
  });

  // Un cancelado no es "tu próxima consulta" aunque sea el más cercano.
  it('saltea los que ya no están vigentes', () => {
    const cancelado = turno({ id: 'cancelado', status: 'CANCELADO' });
    const siguiente = turno({ id: 'siguiente', scheduledAt: '2026-09-10T12:00:00.000Z' });

    expect(nextAppointment([cancelado, siguiente], NOW)?.id).toBe('siguiente');
  });

  // Mientras dura la consulta sigue siendo la que importa: es cuando hace falta
  // el botón para entrar.
  it('incluye el que está en curso y descarta el que ya terminó', () => {
    const enCurso = turno({ id: 'en-curso', scheduledAt: '2026-09-02T11:50:00.000Z' });
    const terminado = turno({ id: 'terminado', scheduledAt: '2026-09-02T10:00:00.000Z' });

    expect(nextAppointment([terminado, enCurso], NOW)?.id).toBe('en-curso');
    expect(nextAppointment([terminado], NOW)).toBeNull();
  });
});

describe('formatShortDay', () => {
  it('arma día de la semana, número y hora', () => {
    expect(formatShortDay('2026-09-03', '09:30')).toBe('jue 3 sep · 09:30');
  });
});

describe('statusLabel y statusTone', () => {
  it('nombra y pinta cada estado', () => {
    expect(statusLabel('CONFIRMADO')).toBe('Confirmado');
    expect(statusTone('CONFIRMADO')).toBe('ok');
    expect(statusLabel('RESERVADO_SIN_PAGAR')).toBe('Sin pagar');
    expect(statusTone('RESERVADO_SIN_PAGAR')).toBe('warning');
    expect(statusTone('CANCELADO')).toBe('neutral');
  });

  it('un estado desconocido se muestra crudo en vez de romper', () => {
    expect(statusLabel('ALGO_NUEVO')).toBe('ALGO_NUEVO');
  });
});

describe('professionalName', () => {
  it('sin perfil cargado no deja la tarjeta sin nombre', () => {
    expect(professionalName(turno({ professional: null }))).toMatch(/sin nombre/i);
  });
});

describe('splitByTime', () => {
  it('separa por instante y deja lo último primero en pasados', () => {
    const viejo = turno({
      id: 'viejo',
      scheduledAt: '2026-08-01T12:00:00.000Z',
      status: 'COMPLETADO',
    });
    const reciente = turno({
      id: 'reciente',
      scheduledAt: '2026-08-20T12:00:00.000Z',
      status: 'COMPLETADO',
    });
    const futuro = turno({ id: 'futuro' });
    const canceladoFuturo = turno({
      id: 'cancelado',
      status: 'CANCELADO',
      scheduledAt: '2026-09-10T12:00:00.000Z',
    });

    const { upcoming, past } = splitByTime([viejo, canceladoFuturo, futuro, reciente], NOW);

    // El cancelado de la semana que viene sigue en Próximos, con su etiqueta.
    expect(upcoming.map((a) => a.id)).toEqual(['futuro', 'cancelado']);
    expect(past.map((a) => a.id)).toEqual(['reciente', 'viejo']);
  });
});

describe('canCancel', () => {
  it('solo un turno vigente que todavía no empezó', () => {
    expect(canCancel(turno(), NOW)).toBe(true);
    expect(canCancel(turno({ status: 'CANCELADO' }), NOW)).toBe(false);
    expect(canCancel(turno({ scheduledAt: '2026-09-02T11:50:00.000Z' }), NOW)).toBe(false);
  });
});

describe('formatPrice', () => {
  it('separa los miles con punto', () => {
    expect(formatPrice(18500)).toBe('$18.500');
    expect(formatPrice(950)).toBe('$950');
  });

  it('muestra los centavos solo si los hay', () => {
    expect(formatPrice(9250.5)).toBe('$9.250,50');
    expect(formatPrice(9250.05)).toBe('$9.250,05');
    expect(formatPrice(9250.0)).toBe('$9.250');
  });
});

describe('formatSentenceDay y whenIs', () => {
  const turno = (date: string, startTime: string, scheduledAt: string) =>
    ({ date, startTime, scheduledAt }) as Appointment;

  it('arma la fecha para una oración', () => {
    expect(formatSentenceDay('2026-09-03', '09:30')).toBe('jueves 3 de septiembre a las 09:30');
  });

  it('dice minutos, hoy, mañana o la fecha según el día de calendario en Argentina', () => {
    // 14/11 a las 23:00 en Argentina.
    const ahora = new Date('2026-11-15T02:00:00Z');
    expect(whenIs(turno('2026-11-14', '23:40', '2026-11-15T02:40:00Z'), ahora)).toBe(
      'en 40 minutos',
    );
    expect(whenIs(turno('2026-11-15', '08:00', '2026-11-15T11:00:00Z'), ahora)).toBe(
      'mañana a las 08:00',
    );
    // A 30 horas: pasado mañana, no "mañana".
    expect(whenIs(turno('2026-11-16', '05:00', '2026-11-16T08:00:00Z'), ahora)).toBe(
      'el lunes 16 de noviembre a las 05:00',
    );
    const mediodia = new Date('2026-11-14T13:00:00Z');
    expect(whenIs(turno('2026-11-14', '15:00', '2026-11-14T18:00:00Z'), mediodia)).toBe(
      'hoy a las 15:00',
    );
  });
});
