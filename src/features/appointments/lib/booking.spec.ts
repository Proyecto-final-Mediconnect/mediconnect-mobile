import { describe, expect, it } from 'vitest';

import type { AvailabilityDay } from '../types';
import {
  bookingRange,
  dayParts,
  esHoy,
  firstDayWithSlots,
  freeSlots,
  monthGrid,
  monthWeeks,
  monthsOf,
} from './booking';

function dia(date: string, estados: string[], fullyBlocked = false): AvailabilityDay {
  return {
    date,
    weekday: 1,
    fullyBlocked,
    slots: estados.map((status, i) => ({
      startTime: `0${9 + i}:00`.slice(-5),
      durationMinutes: 30,
      status: status as AvailabilityDay['slots'][number]['status'],
    })),
  };
}

describe('bookingRange', () => {
  // 23:30 en Argentina ya es el día siguiente en UTC: el rango arranca hoy en Argentina.
  it('arranca hoy en Argentina y abarca los 60 días del horizonte, como la web', () => {
    expect(bookingRange(new Date('2026-10-02T02:30:00Z'))).toEqual({
      from: '2026-10-01',
      to: '2026-11-29',
    });
  });
});

describe('monthGrid y monthsOf', () => {
  it('arma el mes empezando en lunes, con huecos al principio', () => {
    // El 1 de noviembre de 2026 es domingo: seis huecos antes.
    const grilla = monthGrid('2026-11');
    expect(grilla.slice(0, 7)).toEqual([null, null, null, null, null, null, '2026-11-01']);
    expect(grilla.filter(Boolean)).toHaveLength(30);
  });

  it('lista los meses que toca la disponibilidad', () => {
    const dias = ['2026-11-29', '2026-11-30', '2026-12-01'].map((date) => ({
      date,
      weekday: 1,
      fullyBlocked: false,
      slots: [],
    }));
    expect(monthsOf(dias)).toEqual(['2026-11', '2026-12']);
  });
});

describe('freeSlots y firstDayWithSlots', () => {
  it('ofrece solo los horarios libres y salta los días sin ninguno', () => {
    const lleno = dia('2026-10-01', ['BOOKED', 'PAST']);
    const bloqueado = dia('2026-10-02', ['AVAILABLE'], true);
    const conLugar = dia('2026-10-03', ['BOOKED', 'AVAILABLE', 'AVAILABLE']);

    expect(freeSlots(conLugar)).toHaveLength(2);
    expect(freeSlots(bloqueado)).toEqual([]);
    expect(firstDayWithSlots([lleno, bloqueado, conLugar])).toBe('2026-10-03');
    expect(firstDayWithSlots([lleno])).toBeNull();
  });
});

describe('dayParts', () => {
  it('arma día de la semana, número y mes', () => {
    expect(dayParts('2026-10-02')).toEqual({ weekday: 'vie', day: '2', month: 'oct' });
  });
});

describe('monthWeeks', () => {
  it('parte el mes en semanas completas de siete celdas', () => {
    // Noviembre de 2026 arranca domingo: seis huecos adelante y treinta días.
    const semanas = monthWeeks('2026-11');
    expect(semanas).toHaveLength(6);
    expect(semanas.every((s) => s.length === 7)).toBe(true);
    expect(semanas[0]).toEqual([null, null, null, null, null, null, '2026-11-01']);
    expect(semanas[5]).toEqual(['2026-11-30', null, null, null, null, null, null]);
  });

  // Septiembre de 2026 arranca martes y termina miércoles: la última semana se
  // completa con huecos al final.
  it('completa la última semana cuando el mes termina a mitad de semana', () => {
    const semanas = monthWeeks('2026-09');
    expect(semanas).toHaveLength(5);
    expect(semanas.every((s) => s.length === 7)).toBe(true);
    expect(semanas[0]).toEqual([
      null,
      '2026-09-01',
      '2026-09-02',
      '2026-09-03',
      '2026-09-04',
      '2026-09-05',
      '2026-09-06',
    ]);
    expect(semanas[4]).toEqual(['2026-09-28', '2026-09-29', '2026-09-30', null, null, null, null]);
  });
});

describe('freeSlots ordena por hora', () => {
  it('devuelve los libres en orden aunque lleguen desordenados', () => {
    const d: AvailabilityDay = {
      date: '2026-10-05',
      weekday: 1,
      fullyBlocked: false,
      slots: [
        { startTime: '14:00', durationMinutes: 30, status: 'AVAILABLE' },
        { startTime: '08:30', durationMinutes: 30, status: 'AVAILABLE' },
        { startTime: '10:00', durationMinutes: 30, status: 'BOOKED' },
      ],
    };
    expect(freeSlots(d).map((s) => s.startTime)).toEqual(['08:30', '14:00']);
  });
});

describe('esHoy', () => {
  it('compara con el día de Argentina, no con el del reloj UTC', () => {
    // 01:00 UTC del 16 es todavía el 15 a las 22:00 en Argentina (UTC-3).
    const ahora = new Date('2026-11-16T01:00:00Z');
    expect(esHoy('2026-11-15', ahora)).toBe(true);
    expect(esHoy('2026-11-16', ahora)).toBe(false);
  });

  it('pasada la medianoche el día anterior deja de ser hoy', () => {
    expect(esHoy('2026-11-15', new Date('2026-11-15T14:00:00Z'))).toBe(true);
    expect(esHoy('2026-11-15', new Date('2026-11-16T04:00:00Z'))).toBe(false);
  });
});
