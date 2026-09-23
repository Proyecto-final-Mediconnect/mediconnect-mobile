import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderApp } from '../test/render-app';

// ENG-113: el esqueleto navegable. Monta el navegador real —no uno mockeado—
// sobre el runner del Sprint 0, que es lo que el ADR-016 dejó verificado.
describe('RootNavigator', () => {
  it('arranca en el inicio, con esa tab marcada', async () => {
    await renderApp();

    expect(screen.getByRole('tab', { name: 'Inicio' })).toHaveAttribute('aria-selected', 'true');
  });

  it('ofrece las cuatro tabs del canvas', async () => {
    await renderApp();

    for (const tab of ['Inicio', 'Turnos', 'MediPass', 'Perfil']) {
      expect(screen.getByRole('tab', { name: tab })).toBeInTheDocument();
    }
  });

  it('navega entre las tabs', async () => {
    await renderApp();

    fireEvent.click(screen.getByRole('tab', { name: 'Turnos' }));
    expect(await screen.findByRole('heading', { name: 'Mis turnos' })).toBeVisible();
    expect(screen.getByRole('tab', { name: 'Turnos' })).toHaveAttribute('aria-selected', 'true');

    fireEvent.click(screen.getByRole('tab', { name: 'MediPass' }));
    expect(await screen.findByRole('heading', { name: 'Mi MediPass' })).toBeVisible();

    fireEvent.click(screen.getByRole('tab', { name: 'Perfil' }));
    expect(await screen.findByRole('heading', { name: 'Mi perfil' })).toBeVisible();
  });

  it('los accesos rápidos del inicio llevan a su sección', async () => {
    await renderApp();

    fireEvent.click(screen.getByRole('button', { name: 'Turnos' }));

    expect(await screen.findByRole('heading', { name: 'Mis turnos' })).toBeVisible();
    expect(screen.getByRole('tab', { name: 'Turnos' })).toHaveAttribute('aria-selected', 'true');
  });

  // La historia clínica no es una tab: se abre encima desde el inicio, y
  // "Volver" regresa a donde se estaba.
  it('abre la historia clínica desde el inicio y vuelve', async () => {
    await renderApp();

    fireEvent.click(screen.getByRole('button', { name: 'Historia' }));
    expect(await screen.findByRole('heading', { name: 'Mi historia clínica' })).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: 'Volver' }));
    expect(await screen.findByRole('heading', { name: 'Hola, Marina' })).toBeVisible();
  });
});
