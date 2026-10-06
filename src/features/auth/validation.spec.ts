import { describe, expect, it } from 'vitest';

import { validateLogin } from './validation';

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
