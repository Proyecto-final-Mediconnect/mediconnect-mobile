import type { LoginInput } from './types';

export type LoginErrors = Partial<Record<keyof LoginInput, string>>;

// Un chequeo de forma, no de dominio: el backend valida de nuevo con
// `class-validator`. Lo mismo que el `z.email()` de la web a efectos de un
// login.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Valida el formulario de ingreso antes de mandarlo, con los mismos mensajes
 * que el `loginSchema` de la web y el `LoginDto` del backend. La contraseña
 * solo tiene que estar: las reglas de fuerza son del registro, y aplicarlas
 * acá le diría a alguien que su contraseña vieja "no es válida".
 */
export function validateLogin(input: LoginInput): LoginErrors {
  const errors: LoginErrors = {};
  if (!EMAIL.test(input.email.trim())) errors.email = 'El email no tiene un formato válido';
  if (!input.password) errors.password = 'Ingresá tu contraseña';
  return errors;
}
