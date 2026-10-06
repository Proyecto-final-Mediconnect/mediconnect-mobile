import { apiRequest } from '../../shared/lib/api-client';
import type { LoginInput, MobileSession, SessionUser } from './types';

/**
 * `POST /auth/mobile/login`: la ruta de login de la app, que devuelve los tokens
 * en el body (la de la web los deja en cookies httpOnly). Credenciales
 * inválidas y email sin confirmar dan el mismo 401 genérico.
 */
export function login(input: LoginInput): Promise<MobileSession> {
  return apiRequest<MobileSession>('/auth/mobile/login', {
    method: 'POST',
    body: { email: input.email.trim(), password: input.password },
    auth: false,
    fallbackMessage: 'No se pudo iniciar sesión. Intentá de nuevo.',
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
