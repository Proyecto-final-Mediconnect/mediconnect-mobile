import { describe, expect, it } from 'vitest';

import type { ChatMessage } from '../types';
import {
  formatDayLabel,
  formatHour,
  formatInboxTime,
  initialsOf,
  layoutMessages,
  mergeMessages,
  previewOf,
  totalUnread,
} from './chat';

/** Lógica del chat de la app (ENG-152). Las horas son de Argentina (UTC−3). */

const YO = 'yo';
const ELLA = 'ella';

function msg(
  id: string,
  autorId: string,
  enviadoEl: string,
  extra: Partial<ChatMessage> = {},
): ChatMessage {
  return {
    id,
    conversacionId: 'c1',
    autorId,
    contenido: `texto ${id}`,
    enviadoEl,
    leidoEl: null,
    ...extra,
  };
}

// Jueves 30 de octubre de 2026, 15:00 en Argentina.
const AHORA = new Date('2026-10-30T18:00:00.000Z');

describe('mergeMessages', () => {
  it('une sin repetir y ordena por fecha, con el id como desempate', () => {
    const a = msg('b', YO, '2026-10-30T12:00:00.000Z');
    const b = msg('a', YO, '2026-10-30T12:00:00.000Z');
    const c = msg('c', ELLA, '2026-10-30T11:00:00.000Z');

    expect(mergeMessages([a, c], [b, a]).map((m) => m.id)).toEqual(['c', 'a', 'b']);
  });

  it('si llega dos veces, gana la versión nueva: trae el "Leído"', () => {
    const viejo = msg('a', YO, '2026-10-30T12:00:00.000Z');
    const leido = { ...viejo, leidoEl: '2026-10-30T12:05:00.000Z' };

    expect(mergeMessages([viejo], [leido])[0]?.leidoEl).toBe(leido.leidoEl);
  });
});

describe('fechas en hora argentina, sin Intl', () => {
  it('la hora es la de Argentina aunque el instante sea de otro día en UTC', () => {
    expect(formatHour('2026-10-31T01:30:00.000Z')).toBe('22:30');
  });

  it('bandeja: hora si es de hoy, "Ayer", o día y mes', () => {
    expect(formatInboxTime('2026-10-30T13:05:00.000Z', AHORA)).toBe('10:05');
    expect(formatInboxTime('2026-10-29T20:00:00.000Z', AHORA)).toBe('Ayer');
    expect(formatInboxTime('2026-10-12T20:00:00.000Z', AHORA)).toBe('12 oct');
  });

  it('separador: Hoy, Ayer, día de la semana o fecha con año', () => {
    expect(formatDayLabel('2026-10-30T13:00:00.000Z', AHORA)).toBe('Hoy');
    expect(formatDayLabel('2026-10-29T13:00:00.000Z', AHORA)).toBe('Ayer');
    expect(formatDayLabel('2026-10-23T13:00:00.000Z', AHORA)).toBe('viernes 23 de octubre');
    expect(formatDayLabel('2025-12-31T13:00:00.000Z', AHORA)).toBe('31 de diciembre de 2025');
  });

  it('a las 23:30 de Argentina sigue siendo hoy, aunque en UTC ya sea mañana', () => {
    const noche = new Date('2026-10-31T02:30:00.000Z'); // 23:30 del 30 en Argentina
    expect(formatDayLabel('2026-10-30T13:00:00.000Z', noche)).toBe('Hoy');
  });
});

describe('layoutMessages', () => {
  it('agrupa los seguidos de la misma persona y pone el día una sola vez', () => {
    const filas = layoutMessages(
      [
        msg('1', ELLA, '2026-10-29T13:00:00.000Z'),
        msg('2', YO, '2026-10-30T13:00:00.000Z'),
        msg('3', YO, '2026-10-30T13:02:00.000Z'),
        msg('4', YO, '2026-10-30T13:20:00.000Z'),
      ],
      YO,
      AHORA,
    );

    expect(filas.map((f) => f.dayLabel)).toEqual(['Ayer', 'Hoy', null, null]);
    expect(filas.map((f) => f.mine)).toEqual([false, true, true, true]);
    // El 2 y el 3 van juntos; el 4 llega 18 minutos después y arranca otro grupo.
    expect(filas.map((f) => [f.groupStart, f.groupEnd])).toEqual([
      [true, true],
      [true, false],
      [false, true],
      [true, true],
    ]);
  });
});

describe('bandeja', () => {
  it('suma los no leídos de todas las conversaciones', () => {
    expect(totalUnread([{ noLeidos: 2 }, { noLeidos: 0 }, { noLeidos: 3 }])).toBe(5);
  });

  it('la vista previa marca lo propio y aplana los saltos de línea', () => {
    expect(previewOf(msg('1', YO, AHORA.toISOString(), { contenido: 'hola\n\nqué tal' }), YO)).toBe(
      'Vos: hola qué tal',
    );
    expect(previewOf(msg('1', ELLA, AHORA.toISOString(), { contenido: 'hola' }), YO)).toBe('hola');
    expect(previewOf(null, YO)).toBe('Todavía no hay mensajes');
  });

  it('las iniciales son la primera y la última palabra', () => {
    expect(initialsOf('Ana María García')).toBe('AG');
    expect(initialsOf('valeria')).toBe('V');
  });
});
