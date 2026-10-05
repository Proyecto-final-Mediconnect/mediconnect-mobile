import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { Appointment } from '../types';
import { NextAppointmentCard } from './NextAppointmentCard';

const TURNO: Appointment = {
  id: 'a1',
  scheduledAt: '2026-09-03T12:30:00.000Z',
  date: '2026-09-03',
  startTime: '09:30',
  durationMinutes: 30,
  price: 18500,
  currency: 'ARS',
  status: 'CONFIRMADO',
  professional: { id: 'p1', firstName: 'Valeria', lastName: 'Ocampo' },
  patient: { id: 'q1', firstName: 'Marina', lastName: 'Sosa' },
};

describe('NextAppointmentCard', () => {
  it('muestra cuándo, con quién y en qué estado', () => {
    render(
      <NextAppointmentCard
        appointment={TURNO}
        onJoin={vi.fn()}
        now={new Date('2026-09-01T12:00:00Z')}
      />,
    );

    expect(screen.getByText('JUE 3 · 09:30')).toBeInTheDocument();
    expect(screen.getByText('Valeria Ocampo')).toBeInTheDocument();
    expect(screen.getByText('CONFIRMADO')).toBeInTheDocument();
  });

  // Un botón gris no explica por qué no anda: antes de hora se dice cuándo abre.
  it('antes de hora dice cuándo abre la sala y no ofrece el botón', () => {
    render(
      <NextAppointmentCard
        appointment={TURNO}
        onJoin={vi.fn()}
        now={new Date('2026-09-02T10:00:00Z')}
      />,
    );

    expect(screen.getByText('La sala se abre mañana')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ingresar a la sala' })).not.toBeInTheDocument();
  });

  it('con la sala abierta ofrece entrar', () => {
    const onJoin = vi.fn();
    // Cinco minutos antes del turno: la sala abre diez antes.
    render(
      <NextAppointmentCard
        appointment={TURNO}
        onJoin={onJoin}
        now={new Date('2026-09-03T12:25:00Z')}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Ingresar a la sala' }));

    expect(onJoin).toHaveBeenCalledTimes(1);
  });

  it('sin turnos lo dice y explica dónde reservar', () => {
    render(<NextAppointmentCard appointment={null} onJoin={vi.fn()} />);

    expect(screen.getByText('No tenés turnos próximos')).toBeInTheDocument();
    expect(screen.getByText(/desde MediConnect en la web/)).toBeInTheDocument();
  });
});
