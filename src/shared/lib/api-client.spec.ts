import { delay, http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';

import {
  clearSessionTokens,
  readSessionTokens,
} from '../../infrastructure/secure-store/session-tokens';
import { API_URL, server } from '../../test/msw-server';
import { TOKENS } from '../../test/session';
import { saveSessionTokens } from '../../infrastructure/secure-store/session-tokens';
import { apiRequest, ApiError, onSessionExpired } from './api-client';

/** `GET /recurso`: 200 solo con el access token indicado, 401 con cualquier otro. */
function recursoProtegido(tokenValido: string): void {
  server.use(
    http.get(`${API_URL}/recurso`, ({ request }) =>
      request.headers.get('Authorization') === `Bearer ${tokenValido}`
        ? HttpResponse.json({ ok: true })
        : HttpResponse.json({ message: 'Token inválido o expirado.' }, { status: 401 }),
    ),
  );
}

describe('apiRequest', () => {
  it('manda el access token guardado como Bearer', async () => {
    await saveSessionTokens(TOKENS);
    recursoProtegido(TOKENS.accessToken);

    await expect(apiRequest('/recurso')).resolves.toEqual({ ok: true });
  });

  it('las rutas públicas no mandan token', async () => {
    await saveSessionTokens(TOKENS);
    let authorization: string | null = 'sin leer';
    server.use(
      http.post(`${API_URL}/publica`, ({ request }) => {
        authorization = request.headers.get('Authorization');
        return HttpResponse.json({});
      }),
    );

    await apiRequest('/publica', { method: 'POST', body: {}, auth: false });

    expect(authorization).toBeNull();
  });

  it('devuelve el mensaje del backend en el error', async () => {
    server.use(
      http.post(`${API_URL}/auth/mobile/login`, () =>
        HttpResponse.json({ message: 'Email o contraseña incorrectos.' }, { status: 401 }),
      ),
    );

    await expect(
      apiRequest('/auth/mobile/login', { method: 'POST', body: {}, auth: false }),
    ).rejects.toMatchObject({ status: 401, message: 'Email o contraseña incorrectos.' });
  });

  it('sin conexión tira un error con status 0 y un mensaje para mostrar', async () => {
    server.use(http.get(`${API_URL}/publica`, () => HttpResponse.error()));

    const error = await apiRequest('/publica', { auth: false }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 0, message: expect.stringMatching(/conexión/) });
  });

  it('un 200 que no es JSON se informa como ApiError, no como un error de parseo', async () => {
    server.use(
      http.get(`${API_URL}/publica`, () => HttpResponse.html('<!DOCTYPE html><p>Waking up</p>')),
    );

    await expect(apiRequest('/publica', { auth: false })).rejects.toBeInstanceOf(ApiError);
  });

  describe('renovación de la sesión', () => {
    function refreshQueRota(): { llamadas: string[] } {
      const llamadas: string[] = [];
      server.use(
        http.post(`${API_URL}/auth/mobile/refresh`, async ({ request }) => {
          const { refreshToken } = (await request.json()) as { refreshToken: string };
          llamadas.push(refreshToken);
          await delay(20);
          return HttpResponse.json({
            user: { id: 'u' },
            accessToken: 'access-2',
            refreshToken: 'refresh-2',
          });
        }),
      );
      return { llamadas };
    }

    it('ante un 401 renueva, guarda el par nuevo y reintenta', async () => {
      await saveSessionTokens(TOKENS);
      recursoProtegido('access-2');
      const { llamadas } = refreshQueRota();

      await expect(apiRequest('/recurso')).resolves.toEqual({ ok: true });

      expect(llamadas).toEqual([TOKENS.refreshToken]);
      expect(await readSessionTokens()).toEqual({
        accessToken: 'access-2',
        refreshToken: 'refresh-2',
      });
    });

    // Supabase rota el refresh token en cada uso: dos renovaciones en paralelo
    // con el mismo token se pisarían.
    it('varios 401 a la vez disparan una sola renovación', async () => {
      await saveSessionTokens(TOKENS);
      recursoProtegido('access-2');
      const { llamadas } = refreshQueRota();

      const resultados = await Promise.all([
        apiRequest('/recurso'),
        apiRequest('/recurso'),
        apiRequest('/recurso'),
      ]);

      expect(resultados).toEqual([{ ok: true }, { ok: true }, { ok: true }]);
      expect(llamadas).toHaveLength(1);
    });

    it('si el refresh token ya no sirve, borra la sesión y avisa', async () => {
      await saveSessionTokens(TOKENS);
      recursoProtegido('access-2');
      server.use(
        http.post(`${API_URL}/auth/mobile/refresh`, () =>
          HttpResponse.json({ message: 'Sesión inválida.' }, { status: 401 }),
        ),
      );
      const vencida = vi.fn();
      const dejar = onSessionExpired(vencida);

      await expect(apiRequest('/recurso')).rejects.toMatchObject({ status: 401 });

      expect(await readSessionTokens()).toBeNull();
      expect(vencida).toHaveBeenCalledOnce();
      dejar();
    });

    // Una caída no es un token inválido: desloguear por eso obligaría a escribir
    // la contraseña cada vez que se pierde señal.
    it('si Supabase no responde, no borra la sesión', async () => {
      await saveSessionTokens(TOKENS);
      recursoProtegido('access-2');
      server.use(
        http.post(`${API_URL}/auth/mobile/refresh`, () =>
          HttpResponse.json({ message: 'No pudimos renovar tu sesión.' }, { status: 503 }),
        ),
      );
      const vencida = vi.fn();
      const dejar = onSessionExpired(vencida);

      await expect(apiRequest('/recurso')).rejects.toMatchObject({ status: 503 });

      expect(await readSessionTokens()).toEqual(TOKENS);
      expect(vencida).not.toHaveBeenCalled();
      dejar();
    });

    // Render gratis responde con una página HTML mientras despierta.
    it('tampoco la borra si el refresh responde algo que no es un par de tokens', async () => {
      await saveSessionTokens(TOKENS);
      recursoProtegido('access-2');
      server.use(
        http.post(`${API_URL}/auth/mobile/refresh`, () =>
          HttpResponse.html('<!DOCTYPE html><p>Service waking up</p>'),
        ),
      );

      await expect(apiRequest('/recurso')).rejects.toMatchObject({ status: 503 });

      expect(await readSessionTokens()).toEqual(TOKENS);
    });

    it('tampoco la borra si el refresh no llega por falta de conexión', async () => {
      await saveSessionTokens(TOKENS);
      recursoProtegido('access-2');
      server.use(http.post(`${API_URL}/auth/mobile/refresh`, () => HttpResponse.error()));

      await expect(apiRequest('/recurso')).rejects.toMatchObject({ status: 503 });

      expect(await readSessionTokens()).toEqual(TOKENS);
    });

    // Si el par nuevo se guardara igual, la sesión volvería al abrir la app.
    it('un logout durante la renovación no deja que la sesión resucite', async () => {
      await saveSessionTokens(TOKENS);
      recursoProtegido('access-2');
      server.use(
        http.post(`${API_URL}/auth/mobile/refresh`, async () => {
          await clearSessionTokens(); // el paciente toca "Cerrar sesión" justo ahora
          return HttpResponse.json({
            user: { id: 'u' },
            accessToken: 'access-2',
            refreshToken: 'refresh-2',
          });
        }),
      );

      await expect(apiRequest('/recurso')).rejects.toMatchObject({ status: 401 });

      expect(await readSessionTokens()).toBeNull();
    });

    it('sin sesión guardada, una ruta privada no llega a pedirse', async () => {
      const vencida = vi.fn();
      const dejar = onSessionExpired(vencida);

      await expect(apiRequest('/recurso')).rejects.toMatchObject({ status: 401 });

      expect(vencida).toHaveBeenCalledOnce();
      dejar();
    });
  });
});
