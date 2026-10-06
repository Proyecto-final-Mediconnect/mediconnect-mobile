import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderApp } from '../test/render-app';

async function abrirHistoria(): Promise<void> {
  await renderApp();
  fireEvent.click(screen.getByRole('button', { name: 'Historia' }));
  await screen.findByText('Enalapril 10 mg');
}

describe('Mi historia clínica (ENG-116)', () => {
  it('lista lo más reciente primero, con tipo, fecha, profesional y contenido', async () => {
    await abrirHistoria();

    const tarjetas = screen.getAllByRole('button', {
      name: /^(Consulta|Diagnóstico|Prescripción|Estudio|Corrección):/,
    });
    expect(tarjetas[0]).toHaveTextContent('Enalapril 10 mg');
    expect(tarjetas[0]).toHaveTextContent('Firmada por Ana García');
    expect(tarjetas[0]).toHaveTextContent('PRESCRIPCIÓN');
  });

  // La historia llega entera, pero se dibuja de a tandas.
  it('dibuja por tandas: la entrada más vieja no está en la primera', async () => {
    await abrirHistoria();

    expect(screen.queryByText(/Alergia a la penicilina/)).not.toBeInTheDocument();
    expect(screen.getByText('Cargando más entradas…')).toBeInTheDocument();
  });

  it('vincula la corrección con el original en los dos sentidos', async () => {
    await abrirHistoria();

    // La corrección es más nueva, así que está en la primera tanda.
    fireEvent.click(screen.getByRole('link', { name: 'Ver el original' }));
    expect(await screen.findByRole('heading', { name: 'Estudio' })).toBeVisible();
    expect(screen.getByText(/tiene una corrección posterior/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('link', { name: 'Ver la corrección' }));
    expect(await screen.findByRole('heading', { name: 'Corrección' })).toBeVisible();
  });

  it('en la lista, la entrada corregida lo dice', async () => {
    await abrirHistoria();

    fireEvent.click(screen.getByRole('tab', { name: 'Estudios' }));

    expect(await screen.findByText('CORREGIDA')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver la corrección' })).toBeInTheDocument();
  });

  it('filtra por tipo', async () => {
    await abrirHistoria();

    fireEvent.click(screen.getByRole('tab', { name: 'Prescripciones' }));

    expect(await screen.findByText('Apixabán 5 mg')).toBeInTheDocument();
    expect(screen.queryByText('Control de presión arterial')).not.toBeInTheDocument();
  });

  it('abre una entrada completa con todos sus campos', async () => {
    await abrirHistoria();

    fireEvent.click(screen.getByRole('button', { name: 'Consulta: Control de presión arterial' }));

    const detalle = await screen.findByText(/Registro sellado/);
    expect(detalle).toBeInTheDocument();
    expect(screen.getByText('EVOLUCIÓN')).toBeInTheDocument();
    expect(screen.getByText('PLAN')).toBeInTheDocument();
  });

  it('es de solo lectura: no ofrece crear ni editar entradas', async () => {
    await abrirHistoria();

    expect(
      screen.queryByRole('button', { name: /agregar|nueva entrada|editar/i }),
    ).not.toBeInTheDocument();
  });
});
