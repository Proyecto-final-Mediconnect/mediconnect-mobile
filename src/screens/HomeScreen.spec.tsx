import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { __abiertas } from '../../test-stubs/expo-web-browser';
import { API_URL } from '../test/msw-server';
import { renderApp } from '../test/render-app';

describe('Inicio', () => {
  it('saluda por nombre, según la hora', async () => {
    await renderApp();

    expect(
      screen.getByRole('heading', { name: /^(Buen día|Buenas tardes|Buenas noches), Marina$/ }),
    ).toBeInTheDocument();
  });

  // Los datos de ejemplo traen, después de la próxima consulta, el turno sin
  // pagar con Aliaga y el de la noche con Olivares; el cancelado no va.
  it('lista los turnos que siguen y lleva a "Mis turnos"', async () => {
    await renderApp();

    expect(await screen.findByText('DESPUÉS')).toBeInTheDocument();
    expect(screen.getAllByText('Martín Olivares').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: 'Ver todos' }));
    expect(await screen.findByRole('heading', { name: 'Mis turnos' })).toBeVisible();
  });

  it('ofrece volver a consultar con quien ya lo atendió', async () => {
    await renderApp();

    expect(
      await screen.findByRole('button', { name: 'Volver a consultar con Ana García' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Volver a consultar con Valeria Ocampo' }),
    ).toBeInTheDocument();
  });

  // Los datos de ejemplo traen una consulta a los 8 minutos: la sala abre 10
  // antes, así que el botón tiene que estar.
  it('con la consulta por empezar ofrece entrar a la sala', async () => {
    await renderApp();

    expect(await screen.findByRole('button', { name: 'Ingresar a la sala' })).toBeInTheDocument();
    expect(screen.getAllByText('Valeria Ocampo').length).toBeGreaterThan(0);
    expect(screen.getByText(/empieza pronto/)).toBeInTheDocument();
  });

  it('avisa del turno que falta pagar', async () => {
    await renderApp();

    expect(await screen.findByText(/con Tomás Aliaga todavía no está pagado/)).toBeInTheDocument();
  });

  // Cada lectura de la HC queda auditada: abrir la app no puede ser una.
  it('no muestra contenido de la historia clínica', async () => {
    await renderApp();
    await screen.findByRole('button', { name: 'Ingresar a la sala' });

    expect(screen.queryByText(/Enalapril/)).not.toBeInTheDocument();
  });

  // Sin los turnos no se sabe si hay una consulta por empezar.
  it('si no se pudieron cargar los turnos lo dice, en vez de decir que no hay', async () => {
    await renderApp(
      http.get(`${API_URL}/appointments/me`, () =>
        HttpResponse.json({ message: 'No se pudieron cargar tus turnos.' }, { status: 500 }),
      ),
    );

    expect(await screen.findByText('No se pudieron cargar tus turnos.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Probá de nuevo' })).toBeInTheDocument();
    expect(screen.queryByText('No tenés turnos próximos')).not.toBeInTheDocument();
  });

  it('"Ingresar a la sala" abre la sala de la próxima consulta (ENG-131)', async () => {
    await renderApp(
      http.post(`${API_URL}/appointments/turno-sala/video`, () =>
        HttpResponse.json({
          appointmentId: 'turno-sala',
          role: 'PACIENTE',
          roomUrl: 'https://mediconnect.daily.co/turno-sala?t=token',
          expiresAt: new Date(Date.now() + 60 * 60_000).toISOString(),
          counterpart: { firstName: 'Valeria', lastName: 'Ocampo' },
          recording: { enabled: false, mode: 'off' },
        }),
      ),
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Ingresar a la sala' }));

    await waitFor(() =>
      expect(__abiertas).toEqual(['https://mediconnect.daily.co/turno-sala?t=token']),
    );
  });
});
