import { describe, expect, it } from 'vitest';

import type { AvailabilityDay } from '../types';
import {
  bookingRange,
  dayParts,
  firstDayWithSlots,
  freeSlots,
  monthGrid,
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
