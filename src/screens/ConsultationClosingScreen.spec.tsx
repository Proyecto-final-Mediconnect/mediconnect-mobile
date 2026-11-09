import { act, fireEvent, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { navigationRef } from '../navigation/push-routing';
import { renderApp } from '../test/render-app';

const TURNO = '3f2b8c1a-5d4e-4f6a-9b7c-1e2d3c4b5a69';

/** ENG-190 — la pantalla que aparece al volver de la sala. */
describe('Cierre de la consulta', () => {
  async function abrirCierre(): Promise<void> {
    await renderApp();
    act(() => {
      navigationRef.navigate('CierreConsulta', {
        appointmentId: TURNO,
        professionalName: 'Valeria Ocampo',
      });
    });
    await screen.findByText('Tu consulta con Valeria Ocampo terminó');
  }

  it('pide la reseña con las estrellas y "Ahora no"', async () => {
    await abrirCierre();

    expect(await screen.findByText(/tu opinión ayuda a otros pacientes/i)).toBeInTheDocument();
    expect(screen.getByRole('radiogroup', { name: 'Calificación' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ahora no' })).toBeInTheDocument();
  });

  it('"Ahora no" lleva a "Mis turnos" sin guardar nada', async () => {
    await abrirCierre();

    fireEvent.click(await screen.findByRole('button', { name: 'Ahora no' }));

    expect(await screen.findByRole('heading', { name: 'Mis turnos' })).toBeVisible();
  });
});
