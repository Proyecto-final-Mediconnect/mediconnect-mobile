import { describe, expect, it } from 'vitest';

import { crearHistoriaDemo } from '../../../mocks/clinical-record';
import { correctionLinks, newestFirst, typesPresent } from './record-view';

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
