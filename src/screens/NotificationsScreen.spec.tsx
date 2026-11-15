import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { avisosDemo } from '../mocks/notifications';
import { API_URL } from '../test/msw-server';
import { renderApp } from '../test/render-app';

/** La campanita de avisos en la app, la misma que la web (ENG-69). */

async function abrirAvisos(...respuestas: Parameters<typeof renderApp>): Promise<void> {
  await renderApp(...respuestas);
  fireEvent.click(await screen.findByRole('button', { name: /^Avisos/ }));
  await screen.findByRole('heading', { name: 'Avisos' });
}

describe('Avisos (ENG-69)', () => {
  it('la campanita del inicio dice cuántos avisos hay sin leer', async () => {
    await renderApp();

    expect(await screen.findByRole('button', { name: 'Avisos, 2 sin leer' })).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('sin avisos sin leer, la campanita no muestra número', async () => {
    await renderApp(
      http.get(`${API_URL}/notifications/me`, () =>
        HttpResponse.json({ unreadCount: 0, notifications: [] }),
      ),
    );

    expect(await screen.findByRole('button', { name: 'Avisos' })).toBeInTheDocument();
  });

  it('lista los avisos con su texto y cuándo llegaron, los sin leer marcados', async () => {
    await abrirAvisos();

    expect(
      screen.getByRole('button', {
        name: /^Sin leer: Abrieron tu MediPass\. Alguien que dijo ser/,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /^Sin leer: Pago acreditado\./ }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Publicamos tu reseña\./ })).toBeInTheDocument();
    expect(screen.getByText('recién')).toBeInTheDocument();
    expect(screen.getByText('hace 1 hora')).toBeInTheDocument();
  });

  it('el acceso al MediPass lleva a donde se le puede cortar, y queda leído', async () => {
    await abrirAvisos();

    fireEvent.click(screen.getByRole('button', { name: /Abrieron tu MediPass/ }));

    expect(await screen.findByText('Dra. Valeria Ocampo')).toBeInTheDocument();
    await waitFor(() => expect(avisosDemo.bandeja().unreadCount).toBe(1));
  });

  it('el aviso de un turno lleva al detalle de ese turno', async () => {
    await abrirAvisos();

    fireEvent.click(screen.getByRole('button', { name: /Pago acreditado/ }));

    expect(await screen.findByText('Tu turno')).toBeInTheDocument();
    expect(screen.getAllByText(/Martín Olivares/).length).toBeGreaterThan(0);
  });

  it('sin avisos lo dice', async () => {
    await abrirAvisos(
      http.get(`${API_URL}/notifications/me`, () =>
        HttpResponse.json({ unreadCount: 0, notifications: [] }),
      ),
    );

    expect(screen.getByText('No tenés avisos todavía')).toBeInTheDocument();
  });

  it('si falla, muestra el error y deja reintentar', async () => {
    await abrirAvisos(
      http.get(`${API_URL}/notifications/me`, () => HttpResponse.json({}, { status: 500 })),
    );

    expect(await screen.findByText('No pudimos cargar tus avisos.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
  });
});
