import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { EmptyState, ErrorState, LoadingState } from './StatusViews';

describe('LoadingState', () => {
  it('dice que está cargando', () => {
    render(<LoadingState />);

    expect(screen.getByRole('progressbar', { name: 'Cargando…' })).toBeInTheDocument();
  });
});

describe('ErrorState', () => {
  it('muestra qué falló y ofrece reintentar', () => {
    const onRetry = vi.fn();
    render(<ErrorState message="Se cayó el servidor." onRetry={onRetry} />);

    expect(screen.getByRole('alert')).toHaveTextContent('Se cayó el servidor.');

    fireEvent.click(screen.getByRole('button', { name: 'Probá de nuevo' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  // Un 403 no se arregla reintentando: sin `onRetry` no se ofrece.
  it('sin onRetry no ofrece reintentar', () => {
    render(<ErrorState message="No tenés acceso." />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

describe('EmptyState', () => {
  it('muestra el título como encabezado y la explicación', () => {
    render(<EmptyState icon="calendar-outline" title="Sin turnos" description="Todavía no hay." />);

    expect(screen.getByRole('heading', { name: 'Sin turnos' })).toBeInTheDocument();
    expect(screen.getByText('Todavía no hay.')).toBeInTheDocument();
  });
});
