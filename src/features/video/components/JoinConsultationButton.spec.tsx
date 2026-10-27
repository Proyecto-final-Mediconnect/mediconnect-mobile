import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { Linking } from 'react-native';
import { describe, expect, it, vi } from 'vitest';

import { __abiertas, __control } from '../../../../test-stubs/expo-web-browser';
import { API_URL, server } from '../../../test/msw-server';
import { iniciarSesionGuardada } from '../../../test/session';
import type { VideoConsultationAccess } from '../types';
import { JoinConsultationButton } from './JoinConsultationButton';

const TURNO = '3f2b8c1a-5d4e-4f6a-9b7c-1e2d3c4b5a69';
const SALA = 'https://mediconnect.daily.co/consulta-1?t=token-del-paciente';

function acceso(overrides: Partial<VideoConsultationAccess> = {}): VideoConsultationAccess {
  return {
    appointmentId: TURNO,
    role: 'PACIENTE',
    roomUrl: SALA,
    expiresAt: '2026-10-01T22:00:00.000Z',
    counterpart: { firstName: 'Valeria', lastName: 'Ocampo' },
    recording: { enabled: false, mode: 'off' },
    ...overrides,
  };
}

function salaQueResponde(respuesta: () => Response): void {
  server.use(http.post(`${API_URL}/appointments/${TURNO}/video`, respuesta));
}

async function montar(): Promise<QueryClient> {
  await iniciarSesionGuardada();
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <JoinConsultationButton appointmentId={TURNO} />
    </QueryClientProvider>,
  );
  return queryClient;
}

describe('Ingresar a la sala (ENG-131)', () => {
  it('pide la sala del turno y la abre en el navegador', async () => {
    salaQueResponde(() => HttpResponse.json(acceso()));
    await montar();

    fireEvent.click(screen.getByRole('button', { name: 'Ingresar a la sala' }));

    await waitFor(() => expect(__abiertas).toEqual([SALA]));
  });

  it('si no hay navegador in-app, la abre con el del sistema', async () => {
    salaQueResponde(() => HttpResponse.json(acceso()));
    const sistema = vi.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    __control.fallarProxima = true;
    await montar();

    fireEvent.click(screen.getByRole('button', { name: 'Ingresar a la sala' }));

    await waitFor(() => expect(sistema).toHaveBeenCalledWith(SALA));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    sistema.mockRestore();
  });

  it('si no se puede abrir de ninguna forma, lo dice', async () => {
    salaQueResponde(() => HttpResponse.json(acceso()));
    const sistema = vi.spyOn(Linking, 'openURL').mockRejectedValue(new Error('sin navegador'));
    __control.fallarProxima = true;
    await montar();

    fireEvent.click(screen.getByRole('button', { name: 'Ingresar a la sala' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos abrir el navegador');
    sistema.mockRestore();
  });

  // El backend tiene la última palabra sobre la ventana de la sala.
  it('muestra el mensaje del backend si la sala no está abierta', async () => {
    salaQueResponde(() =>
      HttpResponse.json(
        { message: 'La sala se abre 10 minutos antes del turno.' },
        { status: 409 },
      ),
    );
    await montar();

    fireEvent.click(screen.getByRole('button', { name: 'Ingresar a la sala' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'La sala se abre 10 minutos antes del turno.',
    );
    expect(__abiertas).toEqual([]);
  });

  // El paciente no puede enterarse de la grabación adentro de la sala.
  it('si la consulta se graba, avisa y entra solo si el paciente confirma', async () => {
    salaQueResponde(() =>
      HttpResponse.json(acceso({ recording: { enabled: true, mode: 'cloud-audio-only' } })),
    );
    await montar();

    fireEvent.click(screen.getByRole('button', { name: 'Ingresar a la sala' }));

    expect(await screen.findByText(/se graba/)).toBeInTheDocument();
    expect(__abiertas).toEqual([]);

    fireEvent.click(screen.getByRole('button', { name: 'Entrar a la sala' }));
    expect(__abiertas).toEqual([SALA]);
  });

  it('"Ahora no" no entra a la sala', async () => {
    salaQueResponde(() =>
      HttpResponse.json(acceso({ recording: { enabled: true, mode: 'cloud-audio-only' } })),
    );
    await montar();

    fireEvent.click(screen.getByRole('button', { name: 'Ingresar a la sala' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Ahora no' }));

    expect(screen.getByRole('button', { name: 'Ingresar a la sala' })).toBeInTheDocument();
    expect(__abiertas).toEqual([]);
  });

  // La URL lleva un meeting token: no puede quedar en la caché de consultas.
  it('no guarda la URL de la sala en la caché', async () => {
    salaQueResponde(() => HttpResponse.json(acceso()));
    const queryClient = await montar();

    fireEvent.click(screen.getByRole('button', { name: 'Ingresar a la sala' }));
    await waitFor(() => expect(__abiertas).toEqual([SALA]));

    const cache = JSON.stringify(
      queryClient
        .getQueryCache()
        .getAll()
        .map((q) => q.state.data),
    );
    expect(cache).not.toContain('token-del-paciente');
  });
});
