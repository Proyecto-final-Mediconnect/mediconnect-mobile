import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

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

  it('si no se puede crear la sala, muestra el mensaje del backend', async () => {
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

    expect(await screen.findByRole('alert')).toHaveTextContent(/no está configurada/);
    expect(__abiertas).toEqual([]);
  });
});
