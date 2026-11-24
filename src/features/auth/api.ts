import { apiRequest } from '../../shared/lib/api-client';
import { LEGAL_VERSION } from '../legal/legal';
import type {
  LoginInput,
  MobileMfaRequired,
  MobileSession,
  RegisterInput,
  SessionUser,
} from './types';

/**
 * `POST /auth/mobile/login`: la ruta de login de la app, que devuelve los tokens
 * en el body (la de la web los deja en cookies httpOnly). Credenciales
 * inválidas y email sin confirmar dan el mismo 401 genérico.
 */
export function login(input: LoginInput): Promise<MobileSession | MobileMfaRequired> {
  return apiRequest<MobileSession | MobileMfaRequired>('/auth/mobile/login', {
    method: 'POST',
    body: { email: input.email.trim(), password: input.password },
    auth: false,
    fallbackMessage: 'No se pudo iniciar sesión. Intentá de nuevo.',
  });
}

/**
 * `POST /auth/mobile/mfa/verify` (ENG-88): el segundo paso del ingreso. Cambia
 * el token del primer paso y el código de la app autenticadora por la sesión.
 */
export function verifyMfa(mfaToken: string, code: string): Promise<MobileSession> {
  return apiRequest<MobileSession>('/auth/mobile/mfa/verify', {
    method: 'POST',
    body: { mfaToken, code },
    auth: false,
    fallbackMessage: 'No pudimos verificar el código. Intentá de nuevo.',
  });
}

/**
 * `GET /me`: quién es el usuario y con qué rol. Con `token`, consulta con ese
 * access token sin tocar el guardado —se usa justo después del login, antes de
 * decidir si se guarda la sesión—.
 */
export function fetchMe(token?: string): Promise<SessionUser> {
  return apiRequest<SessionUser>('/me', {
    token,
    fallbackMessage: 'No pudimos verificar tu sesión. Intentá de nuevo.',
  });
}

/**
 * `POST /me/legal-acceptance`: deja constancia de que aceptó los textos legales
 * vigentes (ENG-140). Devuelve el usuario actualizado, con `legalAccepted: true`.
 */
export function acceptLegal(version: string): Promise<SessionUser> {
  return apiRequest<SessionUser>('/me/legal-acceptance', {
    method: 'POST',
    body: { version },
    fallbackMessage: 'No pudimos registrar tu aceptación. Intentá de nuevo.',
  });
}

/**
 * `POST /auth/register` (ENG-235): la misma ruta que el registro de la web, que
 * no deja cookies ni sesión —la cuenta queda esperando que confirme el email—.
 *
 * Responde lo mismo exista o no el email, para no revelar qué cuentas hay. Al
 * backend va la **versión** de los textos aceptados, que es lo que queda
 * registrado; el booleano de la casilla no viaja (el backend rechaza campos de
 * más).
 */
export function registerPatient(input: RegisterInput): Promise<{ message: string }> {
  return apiRequest<{ message: string }>('/auth/register', {
    method: 'POST',
    body: {
      email: input.email.trim(),
      password: input.password,
      passwordConfirmation: input.passwordConfirmation,
      acceptedLegalVersion: LEGAL_VERSION,
    },
    auth: false,
    fallbackMessage: 'No pudimos crear tu cuenta. Intentá de nuevo.',
  });
}
