import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Greeting } from './Greeting';

// Ejemplo de test de componente con React Testing Library (Sprint 0 §3.4.10).
describe('Greeting', () => {
  it('renders the provided name', () => {
    render(<Greeting name="Ana" />);
    expect(screen.getByText('Hola, Ana')).toBeInTheDocument();
  });
});
