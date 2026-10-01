import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { API_URL, server } from '../test/msw-server';
import { renderApp } from '../test/render-app';

/** La lista de la búsqueda: el inicio, debajo, también nombra profesionales. */
function lista(): ReturnType<typeof within> {
  return within(screen.getByTestId('lista-profesionales'));
}

async function abrirBusqueda(): Promise<void> {
  await renderApp();
  fireEvent.click(screen.getByRole('tab', { name: 'Reservar' }));
  await screen.findByText('Martín Olivares');
}

describe('Buscar profesionales (ENG-132)', () => {
  it('es la tab central y lista nombre, especialidad y precio', async () => {
    await abrirBusqueda();

    const olivares = within(
      screen.getByRole('button', { name: 'Ver el perfil de Martín Olivares' }),
    );
    expect(olivares.getByText('Cardiología')).toBeInTheDocument();
    expect(olivares.getByText('$42.000 la consulta')).toBeInTheDocument();
    expect(lista().getByText('Valeria Ocampo')).toBeInTheDocument();
  });

  it('filtrar por especialidad se lo pide al backend', async () => {
    const pedidas: string[][] = [];
    server.events.on('request:start', ({ request }) => {
      const url = new URL(request.url);
      if (url.pathname === '/catalog/professionals') {
        pedidas.push(url.searchParams.getAll('specialtyId'));
      }
    });
    await abrirBusqueda();

    fireEvent.click(screen.getByRole('button', { name: 'Dermatología' }));

    await waitFor(() => expect(lista().queryByText('Martín Olivares')).not.toBeInTheDocument());
    expect(lista().getByText('Carolina Ruiz')).toBeInTheDocument();
    expect(pedidas).toContainEqual(['esp-derma']);
    server.events.removeAllListeners();
  });

  it('el buscador encuentra por nombre, sin tildes', async () => {
    await abrirBusqueda();

    fireEvent.change(screen.getByLabelText('Buscar profesional'), {
      target: { value: 'martin' },
    });

    expect(lista().getByText('Martín Olivares')).toBeInTheDocument();
    expect(lista().queryByText('Valeria Ocampo')).not.toBeInTheDocument();
  });

  it('sin resultados lo dice y ofrece limpiar los filtros', async () => {
    await abrirBusqueda();

    fireEvent.change(screen.getByLabelText('Buscar profesional'), {
      target: { value: 'nadie' },
    });
    expect(screen.getByText('No hay profesionales con esos filtros')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }));
    expect(lista().getByText('Martín Olivares')).toBeInTheDocument();
  });

  it('si no carga, lo dice con la opción de reintentar', async () => {
    await renderApp(
      http.get(`${API_URL}/catalog/professionals`, () =>
        HttpResponse.json({ message: 'No pudimos cargar los profesionales.' }, { status: 500 }),
      ),
    );
    fireEvent.click(screen.getByRole('tab', { name: 'Reservar' }));

    expect(await screen.findByText('No pudimos cargar los profesionales.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Probá de nuevo' })).toBeInTheDocument();
  });

  it('tocar un profesional abre su perfil', async () => {
    await abrirBusqueda();

    fireEvent.click(screen.getByRole('button', { name: 'Ver el perfil de Martín Olivares' }));

    expect(await screen.findByText('Sobre mí')).toBeInTheDocument();
    expect(screen.getByText('$42.000')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ver turnos disponibles' })).toBeInTheDocument();
  });
});
