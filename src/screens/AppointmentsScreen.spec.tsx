import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderApp } from '../test/render-app';

async function abrirTurnos(): Promise<void> {
  await renderApp();
  fireEvent.click(screen.getByRole('tab', { name: 'Turnos' }));
  await screen.findByText('Tomás Aliaga');
}

describe('Mis turnos (ENG-115)', () => {
  it('lista los próximos con fecha, hora, profesional y estado', async () => {
    await abrirTurnos();

    expect(screen.getByText('Martín Olivares')).toBeInTheDocument();
    expect(screen.getByText('SIN PAGAR')).toBeInTheDocument();
    // Un cancelado de la semana que viene sigue en Próximos, con su etiqueta.
    expect(screen.getByText('CANCELADO')).toBeInTheDocument();
  });

  // El caso borde de zona horaria: en UTC ya es el día siguiente.
  it('el turno de la noche se muestra a las 22:30', async () => {
    await abrirTurnos();

    expect(screen.getByText(/· 22:30$/)).toBeInTheDocument();
  });

  it('los pasados van en su propia lista', async () => {
    await abrirTurnos();

    fireEvent.click(screen.getByRole('tab', { name: 'Pasados' }));

    expect(await screen.findByText('LIBERADO')).toBeInTheDocument();
    expect(screen.getAllByText('COMPLETADO')).toHaveLength(2);
    expect(screen.queryByText('Martín Olivares')).not.toBeInTheDocument();
  });

  it('cancelar pide confirmación y, confirmado, el turno queda cancelado', async () => {
    await abrirTurnos();

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar el turno con Tomás Aliaga' }));
    const hoja = await screen.findByRole('alert');
    expect(within(hoja).getByText(/con Tomás Aliaga/)).toBeInTheDocument();

    fireEvent.click(within(hoja).getByRole('button', { name: 'Cancelar turno' }));

    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: 'Cancelar el turno con Tomás Aliaga' }),
      ).not.toBeInTheDocument(),
    );
    // El que ya estaba cancelado y este.
    expect(screen.getAllByText('CANCELADO')).toHaveLength(2);
    expect(screen.queryByText('SIN PAGAR')).not.toBeInTheDocument();
  });

  it('"Mantener el turno" cierra sin cancelar', async () => {
    await abrirTurnos();

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar el turno con Tomás Aliaga' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Mantener el turno' }));

    expect(
      screen.getByRole('button', { name: 'Cancelar el turno con Tomás Aliaga' }),
    ).toBeInTheDocument();
    expect(screen.getByText('SIN PAGAR')).toBeInTheDocument();
  });
});
