import { describe, expect, it } from 'vitest';

import { crearHistoriaDemo } from '../../../mocks/clinical-record';
import {
  correctionLinks,
  filterByPeriod,
  newestFirst,
  periodLabel,
  typesPresent,
  searchEntries,
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

  it('un año deja solo los registros de ese año', () => {
    expect(ids('A2024')).toEqual(['hace-2-anios']);
    expect(periodLabel('A2024')).toBe('2024');
    expect(periodLabel('SEMESTRE')).toBe('Últimos 6 meses');
  });

  it('ofrece los años que tienen registros, del más nuevo al más viejo', () => {
    expect(yearsPresent(ENTRADAS)).toEqual(['2026', '2025', '2024']);
  });
});
