import { fireEvent, screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { API_URL } from '../test/msw-server';
import { renderApp } from '../test/render-app';

/** Reprogramar un turno desde la app (ENG-66), como en la web. */

/** Abre el detalle del turno con Olivares: pagado y dentro de doce días. */
async function abrirTurnoConOlivares(...respuestas: Parameters<typeof renderApp>): Promise<void> {
  await renderApp(...respuestas);
  fireEvent.click(screen.getByRole('tab', { name: 'Turnos' }));
  const lista = within(await screen.findByTestId('lista-turnos'));
  fireEvent.click(lista.getByRole('button', { name: 'Ver el turno con Martín Olivares' }));
  await screen.findByText('Tu turno');
}

async function irAReprogramar(...respuestas: Parameters<typeof renderApp>): Promise<void> {
  await abrirTurnoConOlivares(...respuestas);
  fireEvent.click(await screen.findByRole('button', { name: 'Reprogramar' }));
  await screen.findByRole('heading', { name: 'Reprogramar turno' });
}

describe('Reprogramar un turno (ENG-66)', () => {
  it('el detalle de un turno futuro ofrece reprogramarlo', async () => {
    await abrirTurnoConOlivares();

    expect(await screen.findByRole('button', { name: 'Reprogramar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancelar el turno' })).toBeInTheDocument();
  });

  it('muestra el horario actual y que es una sola vez', async () => {
    await irAReprogramar();

    expect(
      await screen.findByText(
        /^Tu turno ahora: el .+ Un turno se puede reprogramar una sola vez\.$/,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('Ya está pagado: moverlo no cuesta nada.')).toBeInTheDocument();
  });

  it('mueve el turno al horario elegido, con el mismo pago', async () => {
    await irAReprogramar();

    fireEvent.click((await screen.findAllByRole('button', { name: 'Mover a las 09:30' }))[0]!);
    expect(await screen.findByText('¿Mover el turno?')).toBeInTheDocument();
    expect(screen.getByText(/Es el mismo turno, con el mismo pago\./)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Mover el turno' }));

    expect(await screen.findByText('Movimos tu turno')).toBeInTheDocument();
    expect(
      screen.getByText(/09:30\. El pago queda como estaba: no se vuelve a cobrar\./),
    ).toBeInTheDocument();
  });

  it('después de moverlo, el turno lo cuenta y ya no ofrece reprogramar', async () => {
    await irAReprogramar();
    fireEvent.click((await screen.findAllByRole('button', { name: 'Mover a las 09:30' }))[0]!);
    fireEvent.click(await screen.findByRole('button', { name: 'Mover el turno' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Ver el turno' }));

    expect(await screen.findByText('Lo reprogramaste')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reprogramar' })).not.toBeInTheDocument();
  });

  it('si el backend lo rechaza, muestra el motivo', async () => {
    await irAReprogramar(
      http.patch(`${API_URL}/appointments/:id/reschedule`, () =>
        HttpResponse.json(
          { message: 'Ese horario ya no está disponible. Elegí otro.' },
          { status: 409 },
        ),
      ),
    );

    fireEvent.click((await screen.findAllByRole('button', { name: 'Mover a las 09:30' }))[0]!);
    fireEvent.click(await screen.findByRole('button', { name: 'Mover el turno' }));

    expect(
      await screen.findByText('Ese horario ya no está disponible. Elegí otro.'),
    ).toBeInTheDocument();
  });
});
