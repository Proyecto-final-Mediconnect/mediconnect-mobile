import { describe, expect, it } from 'vitest';

import type { AvailabilityDay } from '../types';
import { bookingRange, dayParts, firstDayWithSlots, freeSlots } from './booking';

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
  it('arranca hoy en Argentina y abarca dos semanas', () => {
    expect(bookingRange(new Date('2026-10-02T02:30:00Z'))).toEqual({
      from: '2026-10-01',
      to: '2026-10-14',
    });
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
