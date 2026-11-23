import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { API_URL, server } from '../../test/msw-server';
import { getPublicConfig } from './public-config';
import { TEST_PUBLIC_CONFIG } from './test-public-config';

/** ENG-229 — las reglas de negocio se leen de `GET /config`, sin sesión. */
describe('getPublicConfig', () => {
  it('pide /config sin token y devuelve lo que informa el backend', async () => {
    let autorizacion: string | null = 'sin pedir';
    server.use(
      http.get(`${API_URL}/config`, ({ request }) => {
        autorizacion = request.headers.get('authorization');
        return HttpResponse.json(TEST_PUBLIC_CONFIG);
      }),
    );

    await expect(getPublicConfig()).resolves.toEqual(TEST_PUBLIC_CONFIG);
    expect(autorizacion).toBeNull();
  });

  it('si falla, tira un error con el mensaje del backend', async () => {
    server.use(
      http.get(`${API_URL}/config`, () => HttpResponse.json({ message: 'caído' }, { status: 503 })),
    );

    await expect(getPublicConfig()).rejects.toMatchObject({ status: 503, message: 'caído' });
  });
});
