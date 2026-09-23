import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { __secureStore } from '../../../test-stubs/expo-secure-store';
import { readSessionTokens } from '../../infrastructure/secure-store/session-tokens';
import { RootNavigator } from '../../navigation/RootNavigator';
import { API_URL, server } from '../../test/msw-server';
import { iniciarSesionGuardada, PACIENTE, TOKENS } from '../../test/session';
import type { SessionUser } from './types';

/*
 * La sesión de punta a punta (ENG-114): la app entera con el navegador real,
 * el secure store en memoria y la API respondida por MSW.
 */

const PROFESIONAL: SessionUser = {
  id: 'pro-1',
  email: 'medico@mediconnect.test',
  role: 'PROFESIONAL',
  firstName: 'Julián',
  lastName: 'Ríos',
};

const NUEVOS = { accessToken: 'access-login', refreshToken: 'refresh-login' };

/** `POST /auth/mobile/login` que emite `NUEVOS`, y `GET /me` que responde `user` a ese token. */
function loginQueResponde(user: SessionUser = PACIENTE): void {
  server.use(
    http.post(`${API_URL}/auth/mobile/login`, () =>
      HttpResponse.json({ user: { id: user.id, email: user.email }, ...NUEVOS }),
    ),
    http.get(`${API_URL}/me`, ({ request }) =>
      request.headers.get('Authorization') === `Bearer ${NUEVOS.accessToken}`
        ? HttpResponse.json(user)
        : HttpResponse.json({ message: 'Token inválido o expirado.' }, { status: 401 }),
    ),
  );
}

async function abrirApp(): Promise<void> {
  // Las pantallas de la app piden sus datos con TanStack Query.
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <RootNavigator />
    </QueryClientProvider>,
  );
  await waitFor(() => expect(screen.queryByLabelText(/^Abriendo/)).not.toBeInTheDocument());
}

function completarYEnviar(email: string, password: string): void {
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: email } });
  fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: password } });
  fireEvent.click(screen.getByRole('button', { name: 'Ingresar' }));
}

describe('sesión del paciente', () => {
  describe('ingreso', () => {
    it('sin sesión guardada, la app abre en el ingreso', async () => {
      await abrirApp();

      expect(screen.getByRole('heading', { name: 'Ingresá a MediConnect' })).toBeVisible();
      expect(screen.queryByRole('tab')).not.toBeInTheDocument();
    });

    it('con email y contraseña correctos entra a la app y guarda los tokens', async () => {
      loginQueResponde();
      await abrirApp();

      completarYEnviar('paciente.demo@mediconnect.test', 'Password1');

      expect(await screen.findByRole('heading', { name: 'Hola, Marina' })).toBeVisible();
      expect(await readSessionTokens()).toEqual(NUEVOS);
    });

    it('con credenciales inválidas muestra el mensaje genérico y no guarda nada', async () => {
      server.use(
        http.post(`${API_URL}/auth/mobile/login`, () =>
          HttpResponse.json({ message: 'Email o contraseña incorrectos.' }, { status: 401 }),
        ),
      );
      await abrirApp();

      completarYEnviar('alguien@mail.com', 'incorrecta');

      expect(await screen.findByRole('alert')).toHaveTextContent('Email o contraseña incorrectos.');
      expect(__secureStore.items.size).toBe(0);
      expect(screen.getByRole('button', { name: 'Ingresar' })).not.toBeDisabled();
    });

    // El panel profesional está en la web. La sesión de un profesional no llega
    // a guardarse en el dispositivo.
    it('a un profesional le explica que la app es para pacientes, sin guardar su sesión', async () => {
      loginQueResponde(PROFESIONAL);
      await abrirApp();

      completarYEnviar(PROFESIONAL.email, 'Password1');

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'La app de MediConnect es para pacientes. Si sos profesional, ingresá desde la web.',
      );
      expect(__secureStore.items.size).toBe(0);
      expect(screen.queryByRole('tab')).not.toBeInTheDocument();
    });

    it('valida el formulario antes de mandarlo', async () => {
      await abrirApp();

      completarYEnviar('no-es-un-email', '');

      expect(await screen.findByText('El email no tiene un formato válido')).toBeVisible();
      expect(screen.getByText('Ingresá tu contraseña')).toBeVisible();
      // Sin handler de login: si se hubiera mandado, MSW haría fallar el test.
    });

    it('sin conexión lo dice, en lugar de un error genérico', async () => {
      server.use(http.post(`${API_URL}/auth/mobile/login`, () => HttpResponse.error()));
      await abrirApp();

      completarYEnviar('paciente.demo@mediconnect.test', 'Password1');

      expect(await screen.findByRole('alert')).toHaveTextContent(/Revisá tu conexión/);
    });
  });

  describe('al volver a abrir la app', () => {
    it('con la sesión guardada entra directo, sin pedir la contraseña', async () => {
      await iniciarSesionGuardada();

      await abrirApp();

      expect(await screen.findByRole('heading', { name: 'Hola, Marina' })).toBeVisible();
      expect(screen.queryByLabelText('Contraseña')).not.toBeInTheDocument();
    });

    it('si el access token venció, lo renueva sin que el paciente lo note', async () => {
      await iniciarSesionGuardada();
      server.use(
        http.get(`${API_URL}/me`, ({ request }) =>
          request.headers.get('Authorization') === 'Bearer access-2'
            ? HttpResponse.json(PACIENTE)
            : HttpResponse.json({ message: 'Token inválido o expirado.' }, { status: 401 }),
        ),
        http.post(`${API_URL}/auth/mobile/refresh`, () =>
          HttpResponse.json({
            user: { id: PACIENTE.id },
            accessToken: 'access-2',
            refreshToken: 'refresh-2',
          }),
        ),
      );

      await abrirApp();

      expect(await screen.findByRole('heading', { name: 'Hola, Marina' })).toBeVisible();
      expect(await readSessionTokens()).toEqual({
        accessToken: 'access-2',
        refreshToken: 'refresh-2',
      });
    });

    it('si la sesión ya no se puede renovar, vuelve al ingreso y avisa por qué', async () => {
      await iniciarSesionGuardada();
      server.use(
        http.get(`${API_URL}/me`, () =>
          HttpResponse.json({ message: 'Token inválido o expirado.' }, { status: 401 }),
        ),
        http.post(`${API_URL}/auth/mobile/refresh`, () =>
          HttpResponse.json({ message: 'Sesión inválida.' }, { status: 401 }),
        ),
      );

      await abrirApp();

      expect(await screen.findByText('Tu sesión terminó. Iniciá sesión de nuevo.')).toBeVisible();
      expect(__secureStore.items.size).toBe(0);
    });

    // Sin señal no es lo mismo que sin sesión: mandarlo al login le haría
    // escribir la contraseña por un problema de conexión.
    it('sin conexión no cierra la sesión: ofrece reintentar', async () => {
      await iniciarSesionGuardada();
      server.use(http.get(`${API_URL}/me`, () => HttpResponse.error()));

      await abrirApp();

      expect(await screen.findByText(/Revisá tu conexión/)).toBeVisible();
      expect(await readSessionTokens()).toEqual(TOKENS);

      server.use(http.get(`${API_URL}/me`, () => HttpResponse.json(PACIENTE)));
      fireEvent.click(screen.getByRole('button', { name: 'Probá de nuevo' }));

      expect(await screen.findByRole('heading', { name: 'Hola, Marina' })).toBeVisible();
    });

    it('una sesión guardada que no es de un paciente se descarta', async () => {
      await iniciarSesionGuardada(PROFESIONAL);

      await abrirApp();

      expect(screen.getByRole('heading', { name: 'Ingresá a MediConnect' })).toBeVisible();
      expect(__secureStore.items.size).toBe(0);
    });
  });

  describe('cerrar sesión', () => {
    it('borra los tokens del dispositivo y vuelve al ingreso', async () => {
      await iniciarSesionGuardada();
      await abrirApp();
      await screen.findByRole('heading', { name: 'Hola, Marina' });

      fireEvent.click(screen.getByRole('tab', { name: 'Perfil' }));
      expect(await screen.findByText(PACIENTE.email)).toBeVisible();
      fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));

      expect(await screen.findByRole('heading', { name: 'Ingresá a MediConnect' })).toBeVisible();
      expect(__secureStore.items.size).toBe(0);
      expect(screen.queryByRole('tab')).not.toBeInTheDocument();
    });
  });
});
