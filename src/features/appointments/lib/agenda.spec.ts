import { describe, expect, it } from 'vitest';

import type { Appointment } from '../types';
import { agendaSections, filterAgenda, inPeriod, EMPTY_AGENDA_FILTERS } from './agenda';

const AHORA = new Date('2026-10-21T15:00:00Z'); // 21/10, 12:00 en Argentina

function turno(id: string, date: string, status: string, apellido = 'García'): Appointment {
  return {
    id,
    scheduledAt: `${date}T13:00:00Z`,
    date,
    startTime: '10:00',
    durationMinutes: 30,
    price: 10_000,
    currency: 'ARS',
    status,
    professional: { id: 'p', firstName: 'Ana', lastName: apellido },
    patient: null,
  };
}

describe('agendaSections', () => {
  it('pone arriba los próximos vigentes y después un grupo por mes, del más nuevo al más viejo', () => {
    const secciones = agendaSections(
      [
        turno('viejo', '2026-08-10', 'COMPLETADO'),
        turno('prox2', '2026-10-30', 'CONFIRMADO'),
        turno('prox1', '2026-10-25', 'RESERVADO_SIN_PAGAR'),
        turno('reciente', '2026-10-02', 'COMPLETADO'),
      ],
      AHORA,
    );

    expect(secciones.map((s) => s.title)).toEqual(['Próximos', 'Octubre 2026', 'Agosto 2026']);
    expect(secciones[0]?.data.map((t) => t.id)).toEqual(['prox1', 'prox2']);
    expect(secciones[0]?.kind).toBe('card');
    expect(secciones[1]?.kind).toBe('row');
  });

  it('un cancelado de la semana que viene no va a "Próximos": va a su mes', () => {
    const secciones = agendaSections([turno('c', '2026-10-28', 'CANCELADO')], AHORA);

    expect(secciones.map((s) => s.title)).toEqual(['Octubre 2026']);
  });
});

describe('filtros', () => {
  it('"Este mes" y "Mes pasado" usan el mes del calendario', () => {
    expect(inPeriod(turno('a', '2026-10-01', 'COMPLETADO'), 'este-mes', AHORA)).toBe(true);
    expect(inPeriod(turno('a', '2026-09-30', 'COMPLETADO'), 'este-mes', AHORA)).toBe(false);
    expect(inPeriod(turno('a', '2026-09-30', 'COMPLETADO'), 'mes-pasado', AHORA)).toBe(true);
  });

  it('"Últimos 3 meses" incluye este mes y los dos anteriores, y cruza el año', () => {
    const enero = new Date('2026-01-15T15:00:00Z');
    expect(inPeriod(turno('a', '2025-11-03', 'COMPLETADO'), 'ultimos-3-meses', enero)).toBe(true);
    expect(inPeriod(turno('a', '2025-10-31', 'COMPLETADO'), 'ultimos-3-meses', enero)).toBe(false);
  });

  it('busca por profesional sin importar tildes y filtra por estado', () => {
    const lista = [
      turno('a', '2026-10-01', 'COMPLETADO', 'Muñoz'),
      turno('b', '2026-10-02', 'CANCELADO', 'Muñoz'),
      turno('c', '2026-10-03', 'LIBERADO', 'Pérez'),
    ];

    expect(
      filterAgenda(lista, { ...EMPTY_AGENDA_FILTERS, search: 'munoz' }, AHORA).map((t) => t.id),
    ).toEqual(['a', 'b']);
    expect(
      filterAgenda(lista, { ...EMPTY_AGENDA_FILTERS, status: 'cancelados' }, AHORA).map(
        (t) => t.id,
      ),
    ).toEqual(['b', 'c']);
  });
});
