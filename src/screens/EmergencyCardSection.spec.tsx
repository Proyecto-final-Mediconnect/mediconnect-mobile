import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { API_URL } from '../test/msw-server';
import { TARJETA_DEMO } from '../test/patient-api';
import { renderApp } from '../test/render-app';

/**
 * La tarjeta de emergencia en la app (ENG-176): generarla, guardarla,
 * regenerarla y desactivarla desde la pantalla del MediPass.
 */

async function abrirMediPass(...respuestas: Parameters<typeof renderApp>): Promise<void> {
  await renderApp(...respuestas);
  fireEvent.click(screen.getByRole('tab', { name: 'MediPass' }));
  await screen.findByText('Tarjeta de emergencia');
}

function pasarA(estado: 'hidden' | 'visible'): void {
  act(() => {
    Object.defineProperty(document, 'visibilityState', { value: estado, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
}

/** El QR de la tarjeta (el otro es el del código rotativo). */
function qrDeLaTarjeta(): HTMLElement | undefined {
  return screen.queryAllByTestId('qr-value').find((qr) => qr.textContent?.includes('#tarjeta='));
}

describe('Tarjeta de emergencia (ENG-176)', () => {
  it('sin tarjeta, ofrece generarla', async () => {
    await abrirMediPass();

    expect(await screen.findByRole('button', { name: 'Generar mi tarjeta' })).toBeInTheDocument();
    expect(screen.getByText(/aunque no puedas mostrar el código/)).toBeInTheDocument();
  });

  it('al generarla muestra el QR con el token en el fragmento, y el aviso de guardarla', async () => {
    await abrirMediPass();

    fireEvent.click(await screen.findByRole('button', { name: 'Generar mi tarjeta' }));

    await waitFor(() => expect(qrDeLaTarjeta()).toBeDefined());
    expect(qrDeLaTarjeta()).toHaveTextContent(
      new RegExp(`/medipass/emergencia#tarjeta=${TARJETA_DEMO}$`),
    );
    expect(screen.getByText('EMERGENCIA MÉDICA')).toBeInTheDocument();
    expect(screen.getByText(/No la vamos a volver a mostrar/)).toBeInTheDocument();
  });

  it('después de "Listo", el QR no se vuelve a ver y queda que hay una activa', async () => {
    await abrirMediPass();

    fireEvent.click(await screen.findByRole('button', { name: 'Generar mi tarjeta' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Listo, ya la guardé' }));

    expect(await screen.findByText(/Tenés una tarjeta activa/)).toBeInTheDocument();
    expect(qrDeLaTarjeta()).toBeUndefined();
  });

  // Como el código: un teléfono sobre una mesa no puede seguir mostrando la tarjeta.
  it('si la app pasa a segundo plano, el QR de la tarjeta se descarta', async () => {
    await abrirMediPass();

    fireEvent.click(await screen.findByRole('button', { name: 'Generar mi tarjeta' }));
    await waitFor(() => expect(qrDeLaTarjeta()).toBeDefined());

    pasarA('hidden');
    await waitFor(() => expect(qrDeLaTarjeta()).toBeUndefined());
    pasarA('visible');
  });

  it('regenerar pide confirmación y muestra la nueva', async () => {
    await abrirMediPass();
    fireEvent.click(await screen.findByRole('button', { name: 'Generar mi tarjeta' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Listo, ya la guardé' }));

    fireEvent.click(await screen.findByRole('button', { name: 'Generar una nueva' }));
    const hoja = await screen.findByRole('dialog');
    expect(within(hoja).getByText(/deja de funcionar en este momento/)).toBeInTheDocument();
    fireEvent.click(within(hoja).getByRole('button', { name: 'Generar una nueva' }));

    await waitFor(() => expect(qrDeLaTarjeta()).toBeDefined());
  });

  it('desactivar pide confirmación y vuelve a ofrecer generarla', async () => {
    await abrirMediPass();
    fireEvent.click(await screen.findByRole('button', { name: 'Generar mi tarjeta' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Listo, ya la guardé' }));

    fireEvent.click(await screen.findByRole('button', { name: 'Desactivar' }));
    const hoja = await screen.findByRole('dialog');
    fireEvent.click(within(hoja).getByRole('button', { name: 'Desactivar' }));

    expect(await screen.findByRole('button', { name: 'Generar mi tarjeta' })).toBeInTheDocument();
  });

  it('si falla la generación lo dice y no muestra ninguna tarjeta', async () => {
    await abrirMediPass(
      http.post(`${API_URL}/medipass/me/emergency-card`, () =>
        HttpResponse.json({ message: 'Se cayó todo' }, { status: 500 }),
      ),
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Generar mi tarjeta' }));

    expect(await screen.findByText('Se cayó todo')).toBeInTheDocument();
    expect(qrDeLaTarjeta()).toBeUndefined();
  });

  it('un acceso abierto con la tarjeta lo dice en "Accediendo ahora"', async () => {
    await abrirMediPass(
      http.get(`${API_URL}/medipass/me/accesses`, () =>
        HttpResponse.json([
          {
            id: '11111111-1111-4111-8111-111111111111',
            consultante: 'Dr. Pablo Rivas',
            matricula: null,
            desde: new Date().toISOString(),
            expiraEl: new Date(Date.now() + 20 * 60_000).toISOString(),
            minutosRestantes: 20,
            origen: 'TARJETA',
          },
        ]),
      ),
    );

    expect(await screen.findByText('Entró con tu tarjeta')).toBeInTheDocument();
  });
});
