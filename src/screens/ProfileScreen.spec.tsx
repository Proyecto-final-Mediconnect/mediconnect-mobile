import { fireEvent, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { API_URL, server } from '../test/msw-server';
import { FICHA } from '../test/patient-api';
import { renderApp } from '../test/render-app';

async function abrirPerfil(): Promise<void> {
  await renderApp();
  fireEvent.click(screen.getByRole('tab', { name: 'Perfil' }));
}

describe('Mi perfil', () => {
  it('muestra quién tiene la sesión y los datos de su ficha', async () => {
    await abrirPerfil();

    expect(screen.getByText('Marina Sosa')).toBeInTheDocument();
    expect(screen.getByText('paciente.demo@mediconnect.test')).toBeInTheDocument();
    expect(await screen.findByText('12 de abril de 1985')).toBeInTheDocument();
    expect(screen.getByText('30.418.992')).toBeInTheDocument();
  });

  // La ficha se carga en la web; mientras tanto, la app no inventa datos.
  it('con la ficha sin completar lo dice y explica dónde cargarla', async () => {
    await renderApp();
    server.use(
      http.get(`${API_URL}/patients/me`, () =>
        HttpResponse.json({ ...FICHA, birthDate: null, dni: null, phone: null, completed: false }),
      ),
    );
    fireEvent.click(screen.getByRole('tab', { name: 'Perfil' }));

    expect(await screen.findByText(/Todavía no completaste tus datos/)).toBeInTheDocument();
    expect(screen.getAllByText('Sin cargar')).toHaveLength(3);
  });
});
