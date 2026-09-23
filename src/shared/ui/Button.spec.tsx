import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Button } from './Button';

describe('Button', () => {
  it('avisa cuando se toca', () => {
    const onPress = vi.fn();
    render(<Button label="Ingresar" onPress={onPress} />);

    fireEvent.click(screen.getByRole('button', { name: 'Ingresar' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('deshabilitado no responde', () => {
    const onPress = vi.fn();
    render(<Button label="Ingresar" onPress={onPress} disabled />);

    fireEvent.click(screen.getByRole('button', { name: 'Ingresar' }));

    expect(onPress).not.toHaveBeenCalled();
  });

  // Mientras se envía no se puede volver a tocar: un doble toque en "Ingresar"
  // manda dos requests.
  it('cargando no responde y no muestra el texto', () => {
    const onPress = vi.fn();
    render(<Button label="Ingresar" onPress={onPress} loading />);

    const boton = screen.getByRole('button', { name: 'Ingresar' });
    fireEvent.click(boton);

    expect(onPress).not.toHaveBeenCalled();
    expect(boton).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryByText('Ingresar')).not.toBeInTheDocument();
  });
});
