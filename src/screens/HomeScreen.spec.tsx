import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { API_URL } from '../test/msw-server';
import { renderApp } from '../test/render-app';

describe('Inicio', () => {
  it('saluda por nombre', async () => {
    await renderApp();

    expect(screen.getByRole('heading', { name: 'Hola, Marina' })).toBeInTheDocument();
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
});
