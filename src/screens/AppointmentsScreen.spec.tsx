import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderApp } from '../test/render-app';

/** La lista de "Mis turnos": el inicio, debajo, también nombra turnos. */
function lista(): ReturnType<typeof within> {
  return within(screen.getByTestId('lista-turnos'));
}

async function abrirTurnos(): Promise<void> {
  await renderApp();
  fireEvent.click(screen.getByRole('tab', { name: 'Turnos' }));
  await screen.findByTestId('lista-turnos');
}

describe('Mis turnos (ENG-115)', () => {
  it('lista los próximos con fecha, hora, profesional y estado', async () => {
    await abrirTurnos();

    expect(lista().getByText('Martín Olivares')).toBeInTheDocument();
    expect(lista().getByText('SIN PAGAR')).toBeInTheDocument();
    // Un cancelado de la semana que viene sigue en Próximos, con su etiqueta.
    expect(lista().getByText('CANCELADO')).toBeInTheDocument();
  });

  // El caso borde de zona horaria: en UTC ya es el día siguiente.
  it('el turno de la noche se muestra a las 22:30', async () => {
    await abrirTurnos();

    expect(lista().getByText(/· 22:30$/)).toBeInTheDocument();
  });

  it('los pasados van en su propia lista', async () => {
    await abrirTurnos();

    fireEvent.click(screen.getByRole('tab', { name: 'Pasados' }));

    expect(await lista().findByText('LIBERADO')).toBeInTheDocument();
    expect(lista().getAllByText('COMPLETADO')).toHaveLength(2);
    expect(lista().queryByText('Martín Olivares')).not.toBeInTheDocument();
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
    expect(lista().getAllByText('CANCELADO')).toHaveLength(2);
    expect(lista().queryByText('SIN PAGAR')).not.toBeInTheDocument();
  });

  it('"Mantener el turno" cierra sin cancelar', async () => {
    await abrirTurnos();

    fireEvent.click(lista().getByRole('button', { name: 'Cancelar el turno con Tomás Aliaga' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Mantener el turno' }));

    expect(
      lista().getByRole('button', { name: 'Cancelar el turno con Tomás Aliaga' }),
    ).toBeInTheDocument();
    expect(lista().getByText('SIN PAGAR')).toBeInTheDocument();
  });

  // La consulta de los datos de ejemplo empieza en 8 minutos: la sala está
  // abierta y su tarjeta ofrece entrar; las demás, no.
  it('el turno con la sala abierta ofrece entrar (ENG-131)', async () => {
    await abrirTurnos();

    expect(lista().getAllByRole('button', { name: 'Ingresar a la sala' })).toHaveLength(1);
  });
});
