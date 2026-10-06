import { http, HttpResponse } from 'msw';

import type { SessionUser } from '../features/auth/types';
import {
  saveSessionTokens,
  type SessionTokens,
} from '../infrastructure/secure-store/session-tokens';
import { API_URL, server } from './msw-server';

/** La paciente de los tests: la misma del canvas y de los datos de ejemplo. */
export const PACIENTE: SessionUser = {
  id: '6b1f3c1e-0d2a-4c55-9a52-1f7c1a3e9b10',
  email: 'paciente.demo@mediconnect.test',
  role: 'PACIENTE',
  firstName: 'Marina',
  lastName: 'Sosa',
};

export const TOKENS: SessionTokens = { accessToken: 'access-1', refreshToken: 'refresh-1' };

/**
 * Deja la app como la encuentra un paciente que ya había iniciado sesión: los
 * tokens en el secure store y `GET /me` respondiendo con su perfil.
 */
export async function iniciarSesionGuardada(user: SessionUser = PACIENTE): Promise<void> {
  await saveSessionTokens(TOKENS);
  server.use(http.get(`${API_URL}/me`, () => HttpResponse.json(user)));
}
