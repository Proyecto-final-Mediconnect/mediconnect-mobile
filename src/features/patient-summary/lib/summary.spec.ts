import { describe, expect, it } from 'vitest';

import { detallePagos, periodRange, sinActividad } from './summary';
import type { PatientSummary } from '../types';

const VACIO: PatientSummary = {
  from: '2026-10-16',
  to: '2026-11-14',
  currency: 'ARS',
  consultas: { realizadas: 0, profesionales: 0 },
  pagos: { pagado: 0, reembolsado: 0, neto: 0, turnos: 0, porVenir: 0 },
  accesos: { medipass: 0, historiaClinica: 0, total: 0 },
};

describe('periodRange', () => {
  // 01:00 UTC del 15 es todavía el 14 en Argentina.
  const NOW = new Date('2026-11-15T01:00:00.000Z');

  it('los últimos 30 días cuentan hoy, en fecha de Argentina', () => {
    expect(periodRange('30D', NOW)).toEqual({ from: '2026-10-16', to: '2026-11-14' });
  });

  it('este año arranca el 1 de enero', () => {
    expect(periodRange('ANIO', NOW)).toEqual({ from: '2026-01-01', to: '2026-11-14' });
  });
});

describe('detallePagos', () => {
  it('aclara cuántos turnos pagados todavía no pasaron', () => {
    expect(detallePagos({ ...VACIO.pagos, turnos: 12, porVenir: 7 })).toBe(
      'Por 12 turnos · 7 pendientes',
    );
    expect(detallePagos({ ...VACIO.pagos, turnos: 1, porVenir: 1 })).toBe(
      'Por 1 turno · 1 pendiente',
    );
  });

  it('sin turnos por venir no menciona pendientes', () => {
    expect(detallePagos({ ...VACIO.pagos, turnos: 3 })).toBe('Por 3 turnos');
  });
});

describe('sinActividad', () => {
  it('es verdadero solo con todo en cero', () => {
    expect(sinActividad(VACIO)).toBe(true);
    expect(sinActividad({ ...VACIO, accesos: { medipass: 1, historiaClinica: 0, total: 1 } })).toBe(
      false,
    );
  });
});
