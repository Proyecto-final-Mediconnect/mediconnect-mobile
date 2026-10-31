import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderApp } from '../test/render-app';

/** ENG-136 — el paciente carga desde la app lo que ve un médico en su MediPass. */
async function abrirDatosDeEmergencia(): Promise<void> {
  await renderApp();
  fireEvent.click(screen.getByRole('tab', { name: 'Perfil' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Cargar mis datos de emergencia' }));
  await screen.findByText(/Cargá lo que te puede salvar la vida/);
}

describe('Datos de emergencia (ENG-136)', () => {
  it('el perfil avisa que el MediPass está vacío', async () => {
    await renderApp();
    fireEvent.click(screen.getByRole('tab', { name: 'Perfil' }));

    expect(await screen.findByText(/Tu MediPass está vacío/)).toBeInTheDocument();
  });

  it('guarda el grupo sanguíneo y una alergia, y el perfil los muestra', async () => {
    await abrirDatosDeEmergencia();

    fireEvent.click(screen.getByRole('button', { name: '0+' }));
    fireEvent.click(screen.getByRole('button', { name: 'Agregar alergia' }));
    fireEvent.change(screen.getByPlaceholderText('Penicilina'), {
      target: { value: 'Penicilina' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar datos de emergencia' }));

    expect(await screen.findByText('Penicilina')).toBeInTheDocument();
    expect(screen.getByText('0+')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Editar mis datos de emergencia' }),
    ).toBeInTheDocument();
  });

  it('marca el campo que falta y no guarda', async () => {
    await abrirDatosDeEmergencia();

    fireEvent.change(screen.getByPlaceholderText('Hermana'), { target: { value: 'Hermana' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar datos de emergencia' }));

    expect(await screen.findByText('Falta el nombre del contacto')).toBeInTheDocument();
    expect(screen.getByText('Falta el teléfono')).toBeInTheDocument();
  });
});
