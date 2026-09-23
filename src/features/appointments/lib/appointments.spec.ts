import { describe, expect, it } from 'vitest';

import type { Appointment } from '../types';
import {
  formatShortDay,
  nextAppointment,
  professionalName,
  statusLabel,
  statusTone,
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
    expect(formatShortDay('2026-09-03', '09:30')).toBe('jue 3 · 09:30');
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
