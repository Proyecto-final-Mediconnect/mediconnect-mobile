import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderApp } from '../test/render-app';

describe('Mi perfil', () => {
  it('muestra los datos y avisa que son de ejemplo', async () => {
    await renderApp();
    fireEvent.click(screen.getByRole('tab', { name: 'Perfil' }));

    expect(await screen.findByText('Marina Sosa')).toBeInTheDocument();
    expect(screen.getByText('12 de abril de 1985')).toBeInTheDocument();
    expect(screen.getByText(/datos de ejemplo/)).toBeInTheDocument();
  });
});
