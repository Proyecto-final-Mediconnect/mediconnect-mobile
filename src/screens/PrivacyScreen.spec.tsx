import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { __secureStore } from '../../test-stubs/expo-secure-store';
import { __abiertas } from '../../test-stubs/expo-web-browser';
import { API_URL } from '../test/msw-server';
import { renderApp } from '../test/render-app';

/** Privacidad y datos en la app (ENG-86): los derechos ARCO de la Ley 25.326. */

async function abrirPrivacidad(...respuestas: Parameters<typeof renderApp>): Promise<void> {
  await renderApp(...respuestas);
  fireEvent.click(screen.getByRole('tab', { name: 'Perfil' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Privacidad y datos' }));
  await screen.findByRole('heading', { name: 'Dar de baja tu cuenta' });
}

describe('Privacidad y datos (ENG-86)', () => {
  it('se llega desde el perfil y muestra los derechos', async () => {
    await abrirPrivacidad();

    expect(screen.getByRole('heading', { name: 'Descargar tus datos' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Recordatorios por email' })).toBeInTheDocument();
    expect(screen.getByText(/10 años desde la última atención/)).toBeInTheDocument();
  });

  it('la descarga se abre en la web, en la pantalla de privacidad', async () => {
    await abrirPrivacidad();

    fireEvent.click(screen.getByRole('button', { name: 'Abrir en la web' }));

    await waitFor(() => expect(__abiertas.at(-1)).toMatch(/\/privacidad$/));
  });

  it('apaga los recordatorios', async () => {
    await abrirPrivacidad();
    const interruptor = await screen.findByLabelText('Recibir recordatorios por email');
    await waitFor(() => expect(interruptor).toBeChecked());

    fireEvent.click(interruptor);

    await waitFor(() => expect(interruptor).not.toBeChecked());
  });

  it('la baja no se habilita hasta escribir la frase exacta', async () => {
    await abrirPrivacidad();
    const boton = screen.getByRole('button', { name: 'Dar de baja mi cuenta' });

    expect(boton).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/Para confirmar/), {
      target: { value: 'eliminar mi cuenta' },
    });
    expect(boton).toBeDisabled();
  });

  it('con la frase da de baja, borra la sesión del dispositivo y vuelve al ingreso', async () => {
    await abrirPrivacidad();

    fireEvent.change(screen.getByLabelText(/Para confirmar/), {
      target: { value: 'ELIMINAR MI CUENTA' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Dar de baja mi cuenta' }));

    expect(await screen.findByRole('heading', { name: 'Ingresá a tu cuenta' })).toBeVisible();
    expect(__secureStore.items.size).toBe(0);
  });

  it('si el backend no deja (turnos pendientes) lo dice y la sesión sigue', async () => {
    await abrirPrivacidad(
      http.delete(`${API_URL}/me`, () =>
        HttpResponse.json(
          { message: 'Tenés un turno pendiente. Cancelalo antes de dar de baja la cuenta.' },
          { status: 409 },
        ),
      ),
    );

    fireEvent.change(screen.getByLabelText(/Para confirmar/), {
      target: { value: 'ELIMINAR MI CUENTA' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Dar de baja mi cuenta' }));

    expect(await screen.findByText(/turno pendiente/)).toBeInTheDocument();
    expect(__secureStore.items.size).toBeGreaterThan(0);
  });
});
