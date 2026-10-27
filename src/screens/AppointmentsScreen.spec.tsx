import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { API_URL } from '../test/msw-server';
import { renderApp } from '../test/render-app';

/** La lista de "Mis turnos": el inicio, debajo, también nombra turnos. */
function lista(): ReturnType<typeof within> {
  return within(screen.getByTestId('lista-turnos'));
}

async function abrirTurnos(...handlers: Parameters<typeof renderApp>): Promise<void> {
  await renderApp(...handlers);
  fireEvent.click(screen.getByRole('tab', { name: 'Turnos' }));
  await screen.findByTestId('lista-turnos');
}

describe('Mis turnos (ENG-115)', () => {
  it('es una sola lista: arriba los próximos y, bajando, la historia', async () => {
    await abrirTurnos();

    expect(lista().getByText('PRÓXIMOS')).toBeInTheDocument();
    expect(lista().getByText('Martín Olivares')).toBeInTheDocument();
    expect(lista().getByText('Sin pagar')).toBeInTheDocument();
    // Lo que ya pasó o no se va a realizar está en la misma lista, más abajo.
    expect(lista().getByText('Cancelado')).toBeInTheDocument();
    expect(lista().getByText('Liberado')).toBeInTheDocument();
    expect(lista().getAllByText('Completado')).toHaveLength(2);
    expect(screen.queryByRole('tab', { name: 'Pasados' })).not.toBeInTheDocument();
  });

  // El caso borde de zona horaria: en UTC ya es el día siguiente.
  it('el turno de la noche se muestra a las 22:30', async () => {
    await abrirTurnos();

    expect(lista().getByText(/· 22:30 ·/)).toBeInTheDocument();
  });

  it('cancelar pide confirmación y, confirmado, el turno queda cancelado', async () => {
    await abrirTurnos();

    fireEvent.click(lista().getByRole('button', { name: 'Cancelar el turno con Tomás Aliaga' }));
    const hoja = await screen.findByRole('alert');
    expect(within(hoja).getByText(/con Tomás Aliaga/)).toBeInTheDocument();

    fireEvent.click(within(hoja).getByRole('button', { name: 'Cancelar turno' }));

    await waitFor(() =>
      expect(
        lista().queryByRole('button', { name: 'Cancelar el turno con Tomás Aliaga' }),
      ).not.toBeInTheDocument(),
    );
    // El que ya estaba cancelado y este.
    expect(lista().getAllByText('Cancelado')).toHaveLength(2);
    expect(lista().queryByText('Sin pagar')).not.toBeInTheDocument();
  });

  it('cancelar un turno pagado dice cuánto se devuelve según la política (ENG-173)', async () => {
    await abrirTurnos();

    // Pagado, dentro de 12 días: más de 24 h, la devolución total.
    fireEvent.click(lista().getByRole('button', { name: 'Cancelar el turno con Martín Olivares' }));
    const hoja = await screen.findByRole('alert');

    expect(
      await within(hoja).findByText(/te corresponde la devolución total \(\$26\.000\)/),
    ).toHaveTextContent(/Te lo devolvemos por MercadoPago/);

    // Cancelado: el backend devolvió y la app lo dice (ENG-65).
    fireEvent.click(within(hoja).getByRole('button', { name: 'Cancelar turno' }));
    expect(await screen.findByText(/Te devolvemos \$26\.000 por MercadoPago/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Entendido' }));
    await waitFor(() =>
      expect(screen.queryByText(/Te devolvemos \$26\.000/)).not.toBeInTheDocument(),
    );
  });

  it('sin la cotización de ENG-65 cuenta con la política del perfil y no promete devolución automática', async () => {
    await abrirTurnos(
      http.get(`${API_URL}/appointments/:id/cancellation-quote`, () =>
        HttpResponse.json({ message: 'Cannot GET' }, { status: 404 }),
      ),
    );

    fireEvent.click(lista().getByRole('button', { name: 'Cancelar el turno con Martín Olivares' }));
    const hoja = await screen.findByRole('alert');

    expect(
      await within(hoja).findByText(/te corresponde la devolución total \(\$26\.000\)/),
    ).toHaveTextContent(/se gestiona aparte/);
  });

  it('un error de la cotización que no es un 404 no cae en el respaldo ni promete nada falso', async () => {
    await abrirTurnos(
      http.get(`${API_URL}/appointments/:id/cancellation-quote`, () =>
        HttpResponse.json({ message: 'Boom' }, { status: 503 }),
      ),
    );

    fireEvent.click(lista().getByRole('button', { name: 'Cancelar el turno con Martín Olivares' }));
    const hoja = await screen.findByRole('alert');

    expect(await within(hoja).findByText(/No pudimos calcular la devolución/)).toBeInTheDocument();
    expect(within(hoja).queryByText(/se gestiona aparte/)).not.toBeInTheDocument();
  });

  it('mientras se calcula la devolución no se puede confirmar la cancelación', async () => {
    let responder: () => void = () => undefined;
    const cotizacion = new Promise<void>((resolver) => {
      responder = resolver;
    });
    await abrirTurnos(
      http.get(`${API_URL}/appointments/:id/cancellation-quote`, async () => {
        await cotizacion;
        return HttpResponse.json({ percent: 100, amount: 26000, status: null });
      }),
    );

    fireEvent.click(lista().getByRole('button', { name: 'Cancelar el turno con Martín Olivares' }));
    const hoja = await screen.findByRole('alert');

    expect(within(hoja).getByText(/Calculando cuánto te devolvemos/)).toBeInTheDocument();
    expect(within(hoja).getByRole('button', { name: 'Cancelar turno' })).toBeDisabled();

    responder();
    expect(await within(hoja).findByText(/la devolución total/)).toBeInTheDocument();
    expect(within(hoja).getByRole('button', { name: 'Cancelar turno' })).toBeEnabled();
  });

  it('cancelar un turno sin pagar no habla de devolución (ENG-173)', async () => {
    await abrirTurnos();

    fireEvent.click(lista().getByRole('button', { name: 'Cancelar el turno con Tomás Aliaga' }));
    const hoja = await screen.findByRole('alert');

    expect(within(hoja).getByText(/con Tomás Aliaga/)).toBeInTheDocument();
    expect(within(hoja).queryByText(/devolución/)).not.toBeInTheDocument();
  });

  it('"Mantener el turno" cierra sin cancelar', async () => {
    await abrirTurnos();

    fireEvent.click(lista().getByRole('button', { name: 'Cancelar el turno con Tomás Aliaga' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Mantener el turno' }));

    expect(
      lista().getByRole('button', { name: 'Cancelar el turno con Tomás Aliaga' }),
    ).toBeInTheDocument();
    expect(lista().getByText('Sin pagar')).toBeInTheDocument();
  });

  // La consulta de los datos de ejemplo empieza en 8 minutos: la sala está
  // abierta y su tarjeta ofrece entrar; las demás, no.
  it('el turno con la sala abierta ofrece entrar (ENG-131)', async () => {
    await abrirTurnos();

    expect(lista().getAllByRole('button', { name: 'Ingresar a la sala' })).toHaveLength(1);
  });

  it('"Nuevo turno" lleva a sacar un turno', async () => {
    await abrirTurnos();

    fireEvent.click(screen.getByRole('button', { name: 'Nuevo turno' }));

    expect(await screen.findByText('Elegí con quién atenderte.')).toBeInTheDocument();
  });

  it('busca por profesional', async () => {
    await abrirTurnos();

    fireEvent.change(screen.getByLabelText('Buscar turno por profesional'), {
      target: { value: 'olivares' },
    });

    expect(lista().getByText('Martín Olivares')).toBeInTheDocument();
    expect(lista().queryByText('Tomás Aliaga')).not.toBeInTheDocument();
  });

  it('filtra por estado y el filtro se saca con la ✕', async () => {
    await abrirTurnos();

    fireEvent.click(screen.getByRole('button', { name: 'Filtros' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Completados' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ver 2 turnos' }));

    await waitFor(() => expect(lista().queryByText('Martín Olivares')).not.toBeInTheDocument());
    expect(lista().getAllByText('Completado')).toHaveLength(2);

    fireEvent.click(screen.getByRole('button', { name: 'Sacar el filtro Completados' }));
    expect(lista().getByText('Martín Olivares')).toBeInTheDocument();
  });

  it('tocar un turno abre su detalle con lo que pasó', async () => {
    await abrirTurnos(
      http.get(`${API_URL}/appointments/:id/payment`, ({ params }) =>
        HttpResponse.json({
          appointmentId: params.id,
          status: 'SIN_INICIAR',
          appointmentStatus: 'RESERVADO_SIN_PAGAR',
        }),
      ),
    );

    // El primero es el turno sin pagar; el otro, uno liberado de hace un mes.
    fireEvent.click(lista().getAllByRole('button', { name: 'Ver el turno con Tomás Aliaga' })[0]!);

    expect(await screen.findByText('Tu turno')).toBeInTheDocument();
    expect(screen.getByText('Reservaste el turno')).toBeInTheDocument();
    expect(screen.getByText('Falta pagarlo para confirmarlo')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pagar el turno' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancelar el turno' })).toBeInTheDocument();
  });

  it('el detalle de un turno pasado ofrece volver a reservar con el profesional', async () => {
    await abrirTurnos();

    fireEvent.click(lista().getAllByRole('button', { name: 'Ver el turno con Ana García' })[0]!);

    expect(await screen.findByText('Tu turno')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Volver a reservar con Ana' })).toBeInTheDocument();
  });
});
