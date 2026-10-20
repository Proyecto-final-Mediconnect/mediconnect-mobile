import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { TextField } from './TextField';

describe('TextField', () => {
  it('se encuentra por su rótulo y avisa lo que se escribe', () => {
    const onChangeText = vi.fn();
    render(<TextField label="Email" onChangeText={onChangeText} />);

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ana@mail.com' } });

    expect(onChangeText).toHaveBeenCalledWith('ana@mail.com');
  });

  it('muestra el error y marca el campo', () => {
    render(<TextField label="Email" error="Ingresá un email válido." />);

    expect(screen.getByRole('alert')).toHaveTextContent('Ingresá un email válido.');
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
  });

  it('una contraseña arranca oculta y se puede mostrar', () => {
    render(<TextField label="Contraseña" password />);
    const campo = screen.getByLabelText('Contraseña');

    expect(campo).toHaveAttribute('type', 'password');

    fireEvent.click(screen.getByRole('button', { name: 'Mostrar contraseña' }));

    expect(campo).not.toHaveAttribute('type', 'password');
    expect(screen.getByRole('button', { name: 'Ocultar contraseña' })).toBeInTheDocument();
  });
});
