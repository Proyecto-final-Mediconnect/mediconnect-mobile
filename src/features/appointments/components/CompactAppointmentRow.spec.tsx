import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { Appointment } from '../types';
import { CompactAppointmentRow } from './CompactAppointmentRow';

const CANCELADO: Appointment = {
  id: 'a1',
  scheduledAt: '2026-09-03T12:30:00.000Z',
  date: '2026-09-03',
  startTime: '09:30',
  durationMinutes: 30,
  price: 18500,
  currency: 'ARS',
  status: 'CANCELADO',
  professional: { id: 'p1', firstName: 'Valeria', lastName: 'Ocampo' },
  patient: { id: 'q1', firstName: 'Marina', lastName: 'Sosa' },
};

/** ENG-174: lo que se devolvió de un turno caído se ve en la fila, sin abrirlo. */
describe('CompactAppointmentRow', () => {
  it('un cancelado muestra en qué quedó su reembolso', () => {
    render(
      <CompactAppointmentRow
        appointment={{ ...CANCELADO, refundState: { amount: 9250, status: 'PROCESADO' } }}
        muted
      />,
    );

    expect(screen.getByText('Te devolvimos $9.250')).toBeTruthy();
  });

  it('sin reembolso no dice nada', () => {
    render(<CompactAppointmentRow appointment={{ ...CANCELADO, refundState: null }} muted />);

    expect(screen.queryByText(/devolvimos|reembolso/i)).toBeNull();
  });
});
