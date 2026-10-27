import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { Linking } from 'react-native';
import { describe, expect, it, vi } from 'vitest';

import { __abiertas, __control, __vueltas } from '../../test-stubs/expo-web-browser';
import { API_URL } from '../test/msw-server';
import { renderApp } from '../test/render-app';

const TURNO = 'turno-aliaga';
const CHECKOUT = 'https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=pref-1';

type Pago = { status: string; appointmentStatus: string };

/** El backend del pago: el link, y el estado que va devolviendo el GET. */
function backendDePago({
  statusAlAbrir = 'PENDIENTE',
  estado,
  pedidos,
}: {
  statusAlAbrir?: string;
  estado: Pago;
  pedidos?: { posts: number; cuerpos?: unknown[] };
}) {
  return [
    http.post(`${API_URL}/appointments/${TURNO}/payment`, async ({ request }) => {
      if (pedidos) {
        pedidos.posts += 1;
        pedidos.cuerpos?.push(await request.json());
      }
      return HttpResponse.json({
        appointmentId: TURNO,
        checkoutUrl: CHECKOUT,
        sandbox: true,
        amount: 22_000,
        currency: 'ARS',
        status: statusAlAbrir,
      });
    }),
    http.get(`${API_URL}/appointments/${TURNO}/payment`, () =>
      HttpResponse.json({ appointmentId: TURNO, ...estado }),
    ),
  ];
}

async function abrirPagoDesdeTurnos(...respuestas: Parameters<typeof renderApp>): Promise<void> {
  await renderApp(...respuestas);
  fireEvent.click(screen.getByRole('tab', { name: 'Turnos' }));
  const lista = within(await screen.findByTestId('lista-turnos'));
  fireEvent.click(lista.getByRole('button', { name: 'Pagar' }));
  await screen.findByRole('button', { name: 'Pagar con MercadoPago' });
}

describe('Volver a la app después de pagar (ENG-172)', () => {
  it('pide el link para la app y abre el checkout esperando volver a mediconnect://pago', async () => {
    __vueltas.length = 0;
    const pedidos = { posts: 0, cuerpos: [] as unknown[] };
    await abrirPagoDesdeTurnos(
      ...backendDePago({
        estado: { status: 'APROBADO', appointmentStatus: 'CONFIRMADO' },
        pedidos,
      }),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Pagar con MercadoPago' }));

    // Lo que confirma es el backend, no el link de vuelta.
    expect(await screen.findByText('¡Listo, tu turno está confirmado!')).toBeVisible();
    expect(pedidos.cuerpos).toEqual([{ origen: 'app' }]);
    expect(__vueltas).toEqual(['mediconnect://pago']);
  });
});

describe('Pagar el turno desde la app (ENG-168)', () => {
  it('abre el checkout de MercadoPago y, al volver, muestra el turno confirmado', async () => {
    __abiertas.length = 0;
    await abrirPagoDesdeTurnos(
      ...backendDePago({ estado: { status: 'APROBADO', appointmentStatus: 'CONFIRMADO' } }),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Pagar con MercadoPago' }));

    expect(await screen.findByText('¡Listo, tu turno está confirmado!')).toBeVisible();
    expect(__abiertas).toContain(CHECKOUT);
  });

  it('si MercadoPago rechaza, lo dice y ofrece reintentar', async () => {
    await abrirPagoDesdeTurnos(
      ...backendDePago({
        estado: { status: 'RECHAZADO', appointmentStatus: 'RESERVADO_SIN_PAGAR' },
      }),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Pagar con MercadoPago' }));

    expect(await screen.findByText('MercadoPago rechazó el pago')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Reintentar el pago' })).toBeVisible();
  });

  // Rechazado, reintenta y vuelve antes del webhook del intento nuevo: el
  // RECHAZADO que se lee es el viejo y no se puede mostrar como resultado.
  it('un rechazo que ya estaba antes de abrir el checkout no se muestra: sigue esperando', async () => {
    await abrirPagoDesdeTurnos(
      ...backendDePago({
        statusAlAbrir: 'RECHAZADO',
        estado: { status: 'RECHAZADO', appointmentStatus: 'RESERVADO_SIN_PAGAR' },
      }),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Pagar con MercadoPago' }));

    expect(await screen.findByText('Consultando el estado de tu pago…')).toBeVisible();
    expect(screen.queryByText('MercadoPago rechazó el pago')).not.toBeInTheDocument();
  });

  it('si el turno se liberó, lo explica en vez de quedarse esperando', async () => {
    await abrirPagoDesdeTurnos(
      ...backendDePago({ estado: { status: 'PENDIENTE', appointmentStatus: 'LIBERADO' } }),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Pagar con MercadoPago' }));

    expect(await screen.findByText('El turno ya no está reservado')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Reservar otro turno' })).toBeVisible();
  });

  it('no abre una URL de pago que no es de MercadoPago', async () => {
    const sistema = vi.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    await abrirPagoDesdeTurnos(
      http.post(`${API_URL}/appointments/${TURNO}/payment`, () =>
        HttpResponse.json({
          appointmentId: TURNO,
          checkoutUrl: 'intent://pagar#Intent;end',
          sandbox: true,
          amount: 22_000,
          currency: 'ARS',
          status: 'PENDIENTE',
        }),
      ),
      ...backendDePago({
        estado: { status: 'PENDIENTE', appointmentStatus: 'RESERVADO_SIN_PAGAR' },
      }),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Pagar con MercadoPago' }));

    expect(await screen.findByText('No pudimos abrir MercadoPago. Probá de nuevo.')).toBeVisible();
    expect(sistema).not.toHaveBeenCalled();
    sistema.mockRestore();
  });

  it('dos toques seguidos piden un solo link de pago', async () => {
    const pedidos = { posts: 0 };
    await abrirPagoDesdeTurnos(
      ...backendDePago({
        estado: { status: 'APROBADO', appointmentStatus: 'CONFIRMADO' },
        pedidos,
      }),
    );

    const pagar = screen.getByRole('button', { name: 'Pagar con MercadoPago' });
    fireEvent.click(pagar);
    fireEvent.click(pagar);

    await screen.findByText('¡Listo, tu turno está confirmado!');
    expect(pedidos.posts).toBe(1);
  });

  it('si el paciente cierra el navegador sin pagar, pasa a consultar el estado', async () => {
    __control.resultadoProximo = 'dismiss';
    await abrirPagoDesdeTurnos(
      ...backendDePago({
        estado: { status: 'PENDIENTE', appointmentStatus: 'RESERVADO_SIN_PAGAR' },
      }),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Pagar con MercadoPago' }));

    expect(await screen.findByText('Consultando el estado de tu pago…')).toBeVisible();
  });

  it('si ya había otra sesión abierta, no da el pago por vuelto', async () => {
    __control.resultadoProximo = 'locked';
    await abrirPagoDesdeTurnos(
      ...backendDePago({
        estado: { status: 'PENDIENTE', appointmentStatus: 'RESERVADO_SIN_PAGAR' },
      }),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Pagar con MercadoPago' }));

    expect(await screen.findByText('Completá el pago en MercadoPago')).toBeVisible();
    expect(screen.queryByText('Consultando el estado de tu pago…')).not.toBeInTheDocument();
  });

  it('si no se puede abrir MercadoPago, lo dice', async () => {
    const sistema = vi.spyOn(Linking, 'openURL').mockRejectedValue(new Error('sin navegador'));
    __control.fallarProxima = true;
    await abrirPagoDesdeTurnos(
      ...backendDePago({
        estado: { status: 'PENDIENTE', appointmentStatus: 'RESERVADO_SIN_PAGAR' },
      }),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Pagar con MercadoPago' }));

    expect(await screen.findByText('No pudimos abrir MercadoPago. Probá de nuevo.')).toBeVisible();
    sistema.mockRestore();
  });

  it('el aviso de pago pendiente del inicio lleva a pagar', async () => {
    await renderApp(
      ...backendDePago({
        estado: { status: 'PENDIENTE', appointmentStatus: 'RESERVADO_SIN_PAGAR' },
      }),
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Pagar' }));

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Pagar con MercadoPago' })).toBeVisible(),
    );
  });
});
