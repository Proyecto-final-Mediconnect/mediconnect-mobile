import { describe, expect, it } from 'vitest';

import { validateLogin, validateRegister } from './validation';

describe('validateLogin', () => {
  it('acepta un email y una contraseña', () => {
    expect(validateLogin({ email: 'ana@mail.com', password: 'x' })).toEqual({});
  });

  it('ignora los espacios alrededor del email, que suma el autocompletado', () => {
    expect(validateLogin({ email: '  ana@mail.com ', password: 'x' })).toEqual({});
  });

  it('pide un email con formato válido y la contraseña, con los mensajes de la web', () => {
    expect(validateLogin({ email: 'ana', password: '' })).toEqual({
      email: 'El email no tiene un formato válido',
      password: 'Ingresá tu contraseña',
    });
  });

  // Las reglas de fuerza son del registro: acá rechazarían una contraseña vieja
  // que sigue siendo la correcta.
  it('no aplica reglas de fuerza a la contraseña', () => {
    expect(validateLogin({ email: 'ana@mail.com', password: '1' })).toEqual({});
  });
});

describe('validateRegister', () => {
  const valido = {
    email: 'ana@mail.com',
    password: 'Clave2026',
    passwordConfirmation: 'Clave2026',
    acceptedLegal: true,
  };

  it('acepta un registro completo', () => {
    expect(validateRegister(valido)).toEqual({});
  });

  it('dice la primera regla de la contraseña que falta, con el mensaje de la web', () => {
    expect(
      validateRegister({ ...valido, password: 'clave', passwordConfirmation: 'clave' }),
    ).toEqual({ password: 'La contraseña debe tener al menos 8 caracteres' });
    expect(
      validateRegister({ ...valido, password: 'clave2026', passwordConfirmation: 'clave2026' }),
    ).toEqual({ password: 'La contraseña debe incluir al menos una mayúscula' });
    expect(
      validateRegister({ ...valido, password: 'ClaveClave', passwordConfirmation: 'ClaveClave' }),
    ).toEqual({ password: 'La contraseña debe incluir al menos un número' });
  });

  it('pide confirmar la contraseña y que coincida', () => {
    expect(validateRegister({ ...valido, passwordConfirmation: '' })).toEqual({
      passwordConfirmation: 'Confirmá la contraseña',
    });
    expect(validateRegister({ ...valido, passwordConfirmation: 'Clave2027' })).toEqual({
      passwordConfirmation: 'Las contraseñas no coinciden',
    });
  });

  it('exige aceptar los textos legales', () => {
    expect(validateRegister({ ...valido, acceptedLegal: false }).acceptedLegal).toMatch(
      /^Para usar MediConnect tenés que aceptar/,
    );
  });
});
