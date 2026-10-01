import { describe, expect, it } from 'vitest';

import { desdeArgentina, diaArgentino, enArgentina } from './argentina-time';

describe('hora de Argentina', () => {
  // El caso borde de ENG-115: entre las 21:00 y la medianoche de Argentina ya
  // es el día siguiente en UTC. Un turno del jueves a las 22:30 no puede
  // mostrarse el viernes.
  it('un turno de las 22:30 sigue siendo del mismo día aunque en UTC ya sea el siguiente', () => {
    expect(enArgentina(new Date('2026-09-04T01:30:00.000Z'))).toEqual({
      date: '2026-09-03',
      time: '22:30',
    });
  });

  it('ida y vuelta da el mismo instante', () => {
    const instante = desdeArgentina('2026-09-03', '22:30');

    expect(instante.toISOString()).toBe('2026-09-04T01:30:00.000Z');
    expect(enArgentina(instante)).toEqual({ date: '2026-09-03', time: '22:30' });
  });

  it('el día argentino se corre sin depender de la zona del teléfono', () => {
    expect(diaArgentino(new Date('2026-09-04T01:30:00.000Z'), 1)).toBe('2026-09-04');
  });
});
