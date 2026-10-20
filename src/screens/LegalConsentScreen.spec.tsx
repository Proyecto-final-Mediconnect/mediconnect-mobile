import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { RootNavigator } from '../navigation/RootNavigator';
import { API_URL, server } from '../test/msw-server';
import { servirDatosDelPaciente } from '../test/patient-api';
import { iniciarSesionGuardada, PACIENTE } from '../test/session';

const SIN_ACEPTAR = { ...PACIENTE, legalAccepted: false, legalVersion: '2026-10-13' };

async function abrirSinAceptar(): Promise<void> {
  await iniciarSesionGuardada(SIN_ACEPTAR);
  servirDatosDelPaciente();
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <RootNavigator />
    </QueryClientProvider>,
  );
  await screen.findByRole('heading', { name: 'Necesitamos tu consentimiento' });
}

// ENG-140: sin la aceptación vigente el backend responde 403 a todo, así que la
// app pide el consentimiento antes de mostrar nada.
describe('LegalConsentScreen', () => {
  it('no muestra la app hasta aceptar, y la casilla arranca sin tildar', async () => {
    await abrirSinAceptar();

    expect(screen.queryByRole('tab', { name: 'Inicio' })).not.toBeInTheDocument();
    expect(screen.getByRole('checkbox')).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByRole('button', { name: 'Aceptar y continuar' })).toBeDisabled();
  });

  it('al aceptar manda la versión vigente y entra a la app', async () => {
    let body: unknown;
    server.use(
      http.post(`${API_URL}/me/legal-acceptance`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ ...PACIENTE, legalAccepted: true, legalVersion: '2026-10-13' });
      }),
    );
    await abrirSinAceptar();

    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Aceptar y continuar' }));

    expect(await screen.findByRole('heading', { name: /^(Buen día|Buenas tardes|Buenas noches), Marina$/ })).toBeVisible();
    expect(body).toEqual({ version: '2026-10-13' });
  });

  it('si falla, lo dice y deja reintentar', async () => {
    server.use(
      http.post(`${API_URL}/me/legal-acceptance`, () =>
        HttpResponse.json({ message: 'Algo salió mal.' }, { status: 500 }),
      ),
    );
    await abrirSinAceptar();

    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Aceptar y continuar' }));

    expect(await screen.findByRole('alert')).toBeVisible();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Aceptar y continuar' })).toBeEnabled(),
    );
  });

  it('permite cerrar sesión sin aceptar', async () => {
    await abrirSinAceptar();

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));

    expect(await screen.findByRole('heading', { name: 'Ingresá a tu cuenta' })).toBeVisible();
  });
});
