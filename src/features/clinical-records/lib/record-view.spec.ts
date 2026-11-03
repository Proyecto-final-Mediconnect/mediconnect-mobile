import { describe, expect, it } from 'vitest';

import { crearHistoriaDemo } from '../../../mocks/clinical-record';
import {
  correctionLinks,
  filterByPeriod,
  newestFirst,
  periodLabel,
  typesPresent,
  searchEntries,
  searchIndex,
  yearsPresent,
  type Period,
} from './record-view';

const HISTORIA = crearHistoriaDemo(new Date('2026-09-23T12:00:00.000Z'));

describe('record-view', () => {
  it('lo más reciente primero', () => {
    const ordenadas = newestFirst(HISTORIA);
    expect(ordenadas[0]?.sequenceNumber).toBe(HISTORIA.length);
    expect(ordenadas.at(-1)?.sequenceNumber).toBe(1);
  });

  it('vincula la corrección con su original en los dos sentidos', () => {
    const { correctedBy, corrects } = correctionLinks(HISTORIA);

    expect(correctedBy.get('hc-holter')?.id).toBe('hc-holter-correccion');
    expect(corrects.get('hc-holter-correccion')?.id).toBe('hc-holter');
  });

  it('ofrece solo los tipos que hay, en orden fijo', () => {
    expect(typesPresent(HISTORIA)).toEqual([
      'CONSULTA',
      'DIAGNOSTICO',
      'PRESCRIPCION',
      'ESTUDIO',
      'CORRECCION',
    ]);
  });
});

describe('searchEntries', () => {
  it('sin texto devuelve todo', () => {
    expect(searchEntries([], '')).toEqual([]);
    expect(searchEntries(HISTORIA, '   ')).toBe(HISTORIA);
  });

  it('ignora tildes y mayúsculas, y pide todas las palabras en cualquier orden', () => {
    const ids = (texto: string) => searchEntries(HISTORIA, texto).map((e) => e.id);

    const conHolter = ['hc-palpitaciones', 'hc-holter', 'hc-holter-correccion'];
    expect(ids('HOLTER fibrilacion')).toEqual(conHolter);
    expect(ids('fibrilación HOLTER')).toEqual(conHolter);
    expect(ids('holter paroxistica 42 minutos')).toEqual(['hc-holter', 'hc-holter-correccion']);
    expect(ids('holter penicilina')).toEqual([]);
  });

  it('usa el índice armado una vez por historia', () => {
    const indice = searchIndex(HISTORIA);

    expect(searchEntries(HISTORIA, 'holter', indice)).toEqual(searchEntries(HISTORIA, 'holter'));
  });
});

describe('filterByPeriod', () => {
  const AHORA = new Date('2026-09-23T12:00:00.000Z');
  const conFecha = (id: string, createdAt: string) => ({ ...HISTORIA[0]!, id, createdAt });
  const ENTRADAS = [
    conFecha('ayer', '2026-09-22T15:00:00.000Z'),
    conFecha('hace-3-meses', '2026-06-10T15:00:00.000Z'),
    conFecha('hace-10-meses', '2025-11-30T15:00:00.000Z'),
    conFecha('hace-2-anios', '2024-03-05T15:00:00.000Z'),
  ];
  const ids = (period: Period) => filterByPeriod(ENTRADAS, period, AHORA).map((e) => e.id);

  it('"todas las fechas" no filtra', () => {
    expect(ids('TODO')).toHaveLength(4);
  });

  it('los períodos cortos cuentan hacia atrás desde hoy', () => {
    expect(ids('MES')).toEqual(['ayer']);
    expect(ids('SEMESTRE')).toEqual(['ayer', 'hace-3-meses']);
    expect(ids('ANIO')).toEqual(['ayer', 'hace-3-meses', 'hace-10-meses']);
  });

  // Fin de mes: el mes destino es más corto y el corte va a su último día, no
  // al desborde que hace JS (31/03 menos un mes daría el 3/03).
  it.each([
    ['2026-03-31', 'MES', '2026-02-28'],
    ['2026-08-31', 'SEMESTRE', '2026-02-28'],
    ['2028-02-29', 'ANIO', '2027-02-28'],
    ['2028-03-31', 'MES', '2028-02-29'],
  ] as const)('desde el %s, "%s" incluye desde el %s', (hoy, period, corte) => {
    const ahora = new Date(`${hoy}T15:00:00.000Z`);
    const diaAntes = new Date(`${corte}T15:00:00.000Z`);
    diaAntes.setUTCDate(diaAntes.getUTCDate() - 1);
    const entradas = [
      conFecha('corte', `${corte}T15:00:00.000Z`),
      conFecha('antes', diaAntes.toISOString()),
    ];

    expect(filterByPeriod(entradas, period, ahora).map((e) => e.id)).toEqual(['corte']);
  });

  it('un año deja solo los registros de ese año', () => {
    expect(ids('A2024')).toEqual(['hace-2-anios']);
    expect(periodLabel('A2024')).toBe('2024');
    expect(periodLabel('SEMESTRE')).toBe('Últimos 6 meses');
  });

  it('ofrece los años que tienen registros, del más nuevo al más viejo', () => {
    expect(yearsPresent(ENTRADAS)).toEqual(['2026', '2025', '2024']);
  });
});
