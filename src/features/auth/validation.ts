import { LEGAL_REQUIRED_MESSAGE } from '../legal/legal';
import type { LoginInput, RegisterInput } from './types';

export type LoginErrors = Partial<Record<keyof LoginInput, string>>;
export type RegisterErrors = Partial<Record<keyof RegisterInput, string>>;

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

/**
 * Las reglas de la contraseña nueva, las mismas que el `passwordField` de la web
 * y el `RegisterPatientDto` del backend, con sus mensajes. El registro las
 * muestra a la vista y las va tildando mientras se escribe.
 */
export const PASSWORD_RULES: { texto: string; mensaje: string; cumple: (v: string) => boolean }[] =
  [
    {
      texto: 'Al menos 8 caracteres',
      mensaje: 'La contraseña debe tener al menos 8 caracteres',
      cumple: (v) => v.length >= 8,
    },
    {
      texto: 'Una mayúscula',
      mensaje: 'La contraseña debe incluir al menos una mayúscula',
      cumple: (v) => /[A-Z]/.test(v),
    },
    {
      texto: 'Un número',
      mensaje: 'La contraseña debe incluir al menos un número',
      cumple: (v) => /[0-9]/.test(v),
    },
  ];

/**
 * Valida el registro de paciente (ENG-235) con las mismas reglas y mensajes que
 * el `registerPatientSchema` de la web: un error por campo, el primero que falla.
 */
export function validateRegister(input: RegisterInput): RegisterErrors {
  const errors: RegisterErrors = {};
  if (!EMAIL.test(input.email.trim())) errors.email = 'El email no tiene un formato válido';
  const regla = PASSWORD_RULES.find((r) => !r.cumple(input.password));
  if (regla) errors.password = regla.mensaje;
  if (!input.passwordConfirmation) errors.passwordConfirmation = 'Confirmá la contraseña';
  else if (input.password !== input.passwordConfirmation)
    errors.passwordConfirmation = 'Las contraseñas no coinciden';
  if (!input.acceptedLegal) errors.acceptedLegal = LEGAL_REQUIRED_MESSAGE;
  return errors;
}
