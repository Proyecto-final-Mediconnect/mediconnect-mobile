import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { __abiertas } from '../../../../test-stubs/expo-web-browser';
import { API_URL, server } from '../../../test/msw-server';
import { iniciarSesionGuardada } from '../../../test/session';
import { DeviceCheckButton } from './DeviceCheckButton';

const SALA = 'https://mediconnect.daily.co/prueba-0123456789ab?t=token';

async function montar(): Promise<void> {
  await iniciarSesionGuardada();
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <DeviceCheckButton />
    </QueryClientProvider>,
  );
}

/** "Probar cámara y micrófono": una sala de Daily solo para el paciente. */
describe('Probar cámara y micrófono', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('no pide ninguna sala hasta que se toca: cada una se factura', async () => {
    let pedidas = 0;
    server.use(
      http.post(`${API_URL}/video/test-room`, () => {
        pedidas += 1;
        return HttpResponse.json({ url: SALA, expiraEl: new Date().toISOString() });
      }),
    );
    await montar();

    expect(screen.getByRole('button', { name: 'Probar cámara y micrófono' })).toBeInTheDocument();
    expect(pedidas).toBe(0);

    fireEvent.click(screen.getByRole('button', { name: 'Probar cámara y micrófono' }));

    await waitFor(() => expect(__abiertas).toEqual([SALA]));
    expect(pedidas).toBe(1);
  });

  it('un toque repetido dentro del cooldown no pide otra sala', async () => {
    let pedidas = 0;
    server.use(
      http.post(`${API_URL}/video/test-room`, () => {
        pedidas += 1;
        return HttpResponse.json({ url: SALA, expiraEl: new Date().toISOString() });
      }),
    );
    let ahora = 1_000_000;
    vi.spyOn(Date, 'now').mockImplementation(() => ahora);
    await montar();
    const boton = screen.getByRole('button', { name: 'Probar cámara y micrófono' });

    fireEvent.click(boton);
    await waitFor(() => expect(__abiertas).toEqual([SALA]));
    await screen.findByText('Probar cámara y micrófono');

    ahora += 2_000;
    fireEvent.click(boton);
    await new Promise((resolver) => setTimeout(resolver, 50));
    expect(pedidas).toBe(1);

    ahora += 11_000;
    fireEvent.click(boton);
    await waitFor(() => expect(pedidas).toBe(2));
  });

  it('si el backend falla con 5xx, muestra un mensaje genérico y no su texto interno', async () => {
    server.use(
      http.post(`${API_URL}/video/test-room`, () =>
        HttpResponse.json(
          { message: 'La integración con Daily.co no está configurada en este entorno.' },
          { status: 503 },
        ),
      ),
    );
    await montar();

    fireEvent.click(screen.getByRole('button', { name: 'Probar cámara y micrófono' }));

    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent('No pudimos preparar la prueba. Intentá de nuevo.');
    expect(alerta).not.toHaveTextContent(/Daily|configurada/);
    expect(__abiertas).toEqual([]);
  });
});
