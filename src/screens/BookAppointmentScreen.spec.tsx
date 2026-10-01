import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { API_URL, server } from '../test/msw-server';
import { renderApp } from '../test/render-app';

async function abrirReserva(...respuestas: Parameters<typeof renderApp>): Promise<void> {
  await renderApp(...respuestas);
  fireEvent.click(screen.getByRole('button', { name: 'Sacar un turno' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Ver el perfil de Martín Olivares' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Ver turnos disponibles' }));
  await screen.findByText('HORARIOS LIBRES');
}

describe('Reservar un turno (ENG-133)', () => {
  // Hoy no tiene lugar: abre en el primer día que sí, y ofrece solo los libres.
  it('muestra los horarios libres del primer día con lugar', async () => {
    await abrirReserva();

    expect(screen.getByRole('button', { name: 'Reservar a las 09:30' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reservar a las 10:00' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reservar a las 09:00' })).not.toBeInTheDocument();
  });

  it('confirmado, el turno queda reservado sin pagar y aparece en "Mis turnos"', async () => {
    await abrirReserva();

    fireEvent.click(screen.getByRole('button', { name: 'Reservar a las 10:00' }));
    expect(await screen.findByText('¿Reservar el turno?')).toBeInTheDocument();
    expect(screen.getAllByText(/15 minutos/).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: 'Reservar turno' }));

    expect(await screen.findByText('¡Listo, reservaste tu turno!')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Ver mis turnos' }));
    await waitFor(() => expect(screen.getAllByText('SIN PAGAR')).toHaveLength(2));
  });

  // Dos personas eligiendo el mismo horario: gana una y la otra se entera.
  it('si el horario se ocupó, muestra el mensaje del backend y vuelve a pedir los horarios', async () => {
    let pedidos = 0;
    server.events.on('request:start', ({ request }) => {
      if (request.url.includes('/availability')) pedidos += 1;
    });
    await abrirReserva(
      http.post(`${API_URL}/appointments`, () =>
        HttpResponse.json(
          { message: 'Ese turno lo acaba de reservar otra persona. Elegí otro horario.' },
          { status: 409 },
        ),
      ),
    );
    const antes = pedidos;

    fireEvent.click(screen.getByRole('button', { name: 'Reservar a las 10:00' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Reservar turno' }));

    expect(
      await screen.findByText('Ese turno lo acaba de reservar otra persona. Elegí otro horario.'),
    ).toBeInTheDocument();
    await waitFor(() => expect(pedidos).toBeGreaterThan(antes));
    expect(screen.queryByText('¡Listo, reservaste tu turno!')).not.toBeInTheDocument();
    server.events.removeAllListeners();
  });

  it('un doble toque no reserva dos veces', async () => {
    let reservas = 0;
    await abrirReserva(
      http.post(`${API_URL}/appointments`, async () => {
        reservas += 1;
        await new Promise((r) => setTimeout(r, 50));
        return HttpResponse.json({ message: 'Ya está.' }, { status: 409 });
      }),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Reservar a las 10:00' }));
    const confirmar = await screen.findByRole('button', { name: 'Reservar turno' });
    fireEvent.click(confirmar);
    fireEvent.click(confirmar);

    await screen.findByText('Ya está.');
    expect(reservas).toBe(1);
  });
});
