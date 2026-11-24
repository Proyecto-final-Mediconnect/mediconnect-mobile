import { describe, expect, it } from 'vitest';

import {
  maskBirthDate,
  toPersonalForm,
  toProfileInput,
  type PersonalDataForm,
} from './personal-data';

const AHORA = new Date('2026-11-24T15:00:00Z');

const VALIDO: PersonalDataForm = {
  firstName: 'Ana',
  lastName: 'García',
  birthDate: '20/05/1990',
  dni: '12.345.678',
  phone: '+54 11 5555-5555',
};

describe('toPersonalForm', () => {
  it('muestra la fecha como DD/MM/AAAA', () => {
    expect(
      toPersonalForm({
        profileId: 'p',
        firstName: 'Ana',
        lastName: 'García',
        birthDate: '1990-05-20',
        dni: '12345678',
        phone: '1155555555',
        completed: true,
      }).birthDate,
    ).toBe('20/05/1990');
  });

  it('sin ficha arranca vacío', () => {
    expect(toPersonalForm(undefined)).toEqual({
      firstName: '',
      lastName: '',
      birthDate: '',
      dni: '',
      phone: '',
    });
  });
});

describe('maskBirthDate', () => {
  it('pone las barras mientras se escribe', () => {
    expect(maskBirthDate('1')).toBe('1');
    expect(maskBirthDate('120')).toBe('12/0');
    expect(maskBirthDate('12041985')).toBe('12/04/1985');
    expect(maskBirthDate('12/04/19856')).toBe('12/04/1985');
  });
});

describe('toProfileInput', () => {
  it('manda la fecha AAAA-MM-DD, el DNI sin puntos y los nombres sin espacios de más', () => {
    expect(toProfileInput({ ...VALIDO, firstName: '  Ana   María ' }, AHORA)).toEqual({
      input: {
        firstName: 'Ana María',
        lastName: 'García',
        birthDate: '1990-05-20',
        dni: '12345678',
        phone: '+54 11 5555-5555',
      },
      errors: {},
    });
  });

  it('pide todos los campos, con los mensajes de la web', () => {
    const { input, errors } = toProfileInput(
      { firstName: ' ', lastName: '', birthDate: '', dni: '', phone: '' },
      AHORA,
    );
    expect(input).toBeNull();
    expect(errors).toEqual({
      firstName: 'El nombre es obligatorio',
      lastName: 'El apellido es obligatorio',
      birthDate: 'La fecha de nacimiento es obligatoria',
      dni: 'El DNI debe tener 7 u 8 dígitos (sin puntos ni letras)',
      phone: 'El teléfono es demasiado corto',
    });
  });

  it('rechaza una fecha que no existe, una futura y una edad imposible', () => {
    expect(toProfileInput({ ...VALIDO, birthDate: '31/02/1990' }, AHORA).errors.birthDate).toBe(
      'Ingresá una fecha válida (DD/MM/AAAA)',
    );
    expect(toProfileInput({ ...VALIDO, birthDate: '25/11/2026' }, AHORA).errors.birthDate).toBe(
      'La fecha de nacimiento no puede ser futura',
    );
    expect(toProfileInput({ ...VALIDO, birthDate: '01/01/1900' }, AHORA).errors.birthDate).toBe(
      'Revisá la fecha de nacimiento: la edad no es válida.',
    );
  });

  it('acepta haber nacido hoy en Argentina, aunque en UTC ya sea mañana', () => {
    const casiMedianoche = new Date('2026-11-25T02:00:00Z'); // 24/11, 23 h en Argentina
    expect(toProfileInput({ ...VALIDO, birthDate: '24/11/2026' }, casiMedianoche).errors).toEqual(
      {},
    );
  });

  it('valida el DNI y el teléfono como el backend', () => {
    expect(toProfileInput({ ...VALIDO, dni: 'AB123456' }, AHORA).errors.dni).toBeDefined();
    expect(toProfileInput({ ...VALIDO, dni: '1234567' }, AHORA).errors.dni).toBeUndefined();
    expect(toProfileInput({ ...VALIDO, phone: '11-abc-99' }, AHORA).errors.phone).toBe(
      'El teléfono solo puede tener números, espacios, guiones y +',
    );
  });
});
