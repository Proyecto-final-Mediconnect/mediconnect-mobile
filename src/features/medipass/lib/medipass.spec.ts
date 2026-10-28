import { describe, expect, it } from 'vitest';
import {
  accesosVigentes,
  cuentaRegresiva,
  estadoDeAcceso,
  emergencyUrl,
  formatCodigo,
  msHasta,
  proximaConsultaDelCodigo,
  muestraBloque,
  normalizarAlcance,
} from './medipass';
import type { MediPassAccess } from '../types';

const AHORA = new Date('2026-09-03T12:00:00.000Z');

function acceso(overrides: Partial<MediPassAccess> & { id: string }): MediPassAccess {
  return {
    consultante: 'Dra. Valeria Ocampo',
    matricula: null,
    desde: '2026-09-03T11:50:00.000Z',
    expiraEl: '2026-09-03T12:20:00.000Z',
    minutosRestantes: 20,
    ...overrides,
  };
}

describe('msHasta', () => {
  it('cuenta hasta el vencimiento que manda el backend', () => {
    expect(msHasta('2026-09-03T12:03:00.000Z', AHORA)).toBe(3 * 60_000);
  });

  it('nunca da negativo', () => {
    expect(msHasta('2026-09-03T11:59:00.000Z', AHORA)).toBe(0);
  });
});

describe('proximaConsultaDelCodigo', () => {
  it('pide el siguiente apenas vence el actual', () => {
    expect(proximaConsultaDelCodigo('2026-09-03T12:03:00.000Z', AHORA)).toBe(3 * 60_000 + 500);
  });

  it('no consulta más seguido que cada 5 segundos', () => {
    expect(proximaConsultaDelCodigo('2026-09-03T12:00:01.000Z', AHORA)).toBe(5_000);
  });

  it('con un código ya vencido espera 15 segundos en vez de entrar en bucle', () => {
    expect(proximaConsultaDelCodigo('2026-09-03T11:59:00.000Z', AHORA)).toBe(15_000);
  });

  it('con el backend fallando espera 30 segundos', () => {
    expect(proximaConsultaDelCodigo(null, AHORA)).toBe(30_000);
  });
});

describe('emergencyUrl', () => {
  it('arma la ficha de emergencia de la web, igual que la web', () => {
    expect(emergencyUrl('https://web.test', 'AB12CD34')).toBe(
      'https://web.test/medipass/emergencia?codigo=AB12CD34',
    );
  });
});

describe('formatCodigo', () => {
  it('parte el código de 8 en dos grupos de 4', () => {
    expect(formatCodigo('ab12cd34')).toBe('AB12-CD34');
  });
});

describe('estadoDeAcceso', () => {
  it('un acceso que todavía no expiró está vigente', () => {
    expect(estadoDeAcceso(acceso({ id: 'a' }), AHORA)).toEqual({
      estado: 'VIGENTE',
      msRestantes: 20 * 60_000,
    });
  });

  it('el corte es el instante exacto de expiración', () => {
    // Vencido hace un segundo ya no ve nada: mostrarlo vigente le haría creer al
    // paciente que alguien está mirando su historia cuando no.
    const vencido = acceso({ id: 'a', expiraEl: '2026-09-03T11:59:59.000Z' });

    expect(estadoDeAcceso(vencido, AHORA)).toEqual({ estado: 'VENCIDO' });
  });

  it('justo en el instante de expirar ya está vencido', () => {
    const justo = acceso({ id: 'a', expiraEl: AHORA.toISOString() });

    expect(estadoDeAcceso(justo, AHORA).estado).toBe('VENCIDO');
  });
});

describe('accesosVigentes', () => {
  it('deja afuera los vencidos', () => {
    const lista = [
      acceso({ id: 'a' }),
      acceso({ id: 'b', expiraEl: '2026-09-03T10:00:00.000Z' }),
      acceso({ id: 'c', expiraEl: '2026-09-03T12:30:00.000Z' }),
    ];

    expect(accesosVigentes(lista, AHORA).map((x) => x.id)).toEqual(['a', 'c']);
  });
});

describe('cuentaRegresiva', () => {
  it('formatea minutos y segundos', () => {
    expect(cuentaRegresiva(5 * 60_000)).toBe('05:00');
    expect(cuentaRegresiva(62_000)).toBe('01:02');
  });

  it('nunca muestra negativos', () => {
    expect(cuentaRegresiva(-5000)).toBe('00:00');
  });

  it('se corta en 59:59 en vez de agregar un campo de horas', () => {
    expect(cuentaRegresiva(3 * 60 * 60_000)).toBe('59:59');
  });
});

describe('normalizarAlcance', () => {
  it('el bloque vital no se puede apagar', () => {
    // Es la razón de ser del MediPass: sin alergias ni medicación, el pasaporte
    // no sirve para lo único que no puede fallar.
    expect(normalizarAlcance([])).toEqual(['VITAL']);
    expect(normalizarAlcance(['NOTAS'])).toEqual(['VITAL', 'NOTAS']);
  });

  it('no lo duplica si ya está', () => {
    expect(normalizarAlcance(['VITAL', 'NOTAS'])).toEqual(['VITAL', 'NOTAS']);
  });
});

describe('muestraBloque', () => {
  it('el vital se muestra aunque no esté en la lista', () => {
    expect(muestraBloque([], 'VITAL')).toBe(true);
  });

  it('los demás solo si están', () => {
    expect(muestraBloque(['CONDICIONES'], 'CONDICIONES')).toBe(true);
    expect(muestraBloque(['CONDICIONES'], 'NOTAS')).toBe(false);
  });
});
