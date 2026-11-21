import { act, fireEvent, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { __notifications } from '../../test-stubs/expo-notifications';
import type { Appointment } from '../features/appointments/types';
import { appointmentPushData, pushTarget } from '../infrastructure/notifications/push';
import { turnosDemo } from '../mocks/appointments';
import { API_URL } from '../test/msw-server';
import { renderApp } from '../test/render-app';

/*
 * Turno que el profesional canceló (ENG-204, ADR-018), del lado del paciente:
 * el aviso en el inicio, el push que lleva al turno, el detalle con el motivo y
 * el plazo, y el pedido del reembolso del 100 %.
 */

const ID = 'turno-a-reprogramar';

function aReprogramar(): Appointment {
  const base = turnosDemo.listar().find((t) => t.status === 'CONFIRMADO')!;
  return {
    ...base,
    id: ID,
    scheduledAt: new Date(Date.now() + 5 * 24 * 3_600_000).toISOString(),
    status: 'A_REPROGRAMAR',
    cancelledBy: 'PROFESIONAL',
    cancelledAt: new Date().toISOString(),
    cancellationReason: 'Tengo un congreso ese día.',
    reprogramDeadline: new Date(Date.now() + 48 * 3_600_000).toISOString(),
  };
}

/** El backend con el turno a reprogramar y el endpoint del reembolso. */
function backend(): {
  pedidos: string[];
  reprogramados: unknown[];
  handlers: Parameters<typeof renderApp>;
} {
  const registro = { pedidos: [] as string[], reprogramados: [] as unknown[] };
  let turno = aReprogramar();
  return Object.assign(registro, {
    handlers: [
      http.get(`${API_URL}/appointments/me`, () =>
        HttpResponse.json([turno, ...turnosDemo.listar()]),
      ),
      // ENG-203: elegir otro horario desde A_REPROGRAMAR.
      http.patch(`${API_URL}/appointments/:id/reschedule`, async ({ params, request }) => {
        const body = (await request.json()) as { date: string; startTime: string };
        registro.reprogramados.push({ id: String(params.id), ...body });
        turno = { ...turno, status: 'CONFIRMADO', date: body.date, startTime: body.startTime };
        return HttpResponse.json(turno);
      }),
      http.patch(`${API_URL}/appointments/:id/full-refund`, ({ params }) => {
        registro.pedidos.push(String(params.id));
        turno = {
          ...turno,
          status: 'CANCELADO',
          refundState: { amount: turno.price, status: 'PROCESADO' },
        };
        return HttpResponse.json({
          id: turno.id,
          status: 'CANCELADO',
          refund: { percent: 100, amount: turno.price, status: 'PROCESADO' },
        });
      }),
    ],
  });
}

async function abrirDesdeElPush(...handlers: Parameters<typeof renderApp>): Promise<void> {
  __notifications.state.status = 'denied';
  __notifications.state.canAskAgain = false;
  await renderApp(...handlers);
  act(() => __notifications.tap({ tipo: 'TURNO_CANCELADO_PROFESIONAL', appointmentId: ID }));
  await screen.findByText('Tu turno');
}

describe('Turno a reprogramar (ENG-204)', () => {
  it('el inicio avisa que hay que elegir y lleva al turno', async () => {
    const api = backend();
    await renderApp(...api.handlers);

    expect(await screen.findByText(/canceló tu turno del/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Elegir' }));
    expect(await screen.findByText(/no va a poder atenderte/)).toBeInTheDocument();
  });

  it('el push lleva al turno, con quién canceló, el motivo y el plazo', async () => {
    const api = backend();
    await abrirDesdeElPush(...api.handlers);

    expect(await screen.findByText(/no va a poder atenderte/)).toBeInTheDocument();
    expect(screen.getByText('Motivo: “Tengo un congreso ese día.”')).toBeInTheDocument();
    expect(screen.getByText(/automáticamente/)).toBeInTheDocument();
    expect(screen.getAllByText('A reprogramar').length).toBeGreaterThan(0);
    // No es un turno terminado: no se ofrece volver a reservar.
    expect(screen.queryByRole('button', { name: /Volver a reservar/ })).not.toBeInTheDocument();
  });

  it('pedir el reembolso lo confirma, lo manda y muestra qué pasó con la plata', async () => {
    const api = backend();
    await abrirDesdeElPush(...api.handlers);

    fireEvent.click(await screen.findByRole('button', { name: 'Pedir el reembolso del 100 %' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Sí, quiero el reembolso' }));

    expect(await screen.findByText(/Te devolvemos/)).toBeInTheDocument();
    expect(api.pedidos).toEqual([ID]);
    expect(await screen.findByText('Elegiste el reembolso del 100 %')).toBeInTheDocument();
  });
});

describe('Elegir otro horario desde un turno a reprogramar (ENG-203)', () => {
  it('lleva a la agenda en modo reprogramar, sin volver a pagar, y mueve el turno', async () => {
    const api = backend();
    await abrirDesdeElPush(...api.handlers);

    fireEvent.click(await screen.findByRole('button', { name: 'Elegir otro horario' }));
    await screen.findByRole('heading', { name: 'Reprogramar turno' });
    expect(
      await screen.findByText(/no volvés a pagar y no cuenta como tu reprogramación/),
    ).toBeInTheDocument();

    fireEvent.click((await screen.findAllByRole('button', { name: 'Mover a las 09:30' }))[0]!);
    expect(await screen.findByText(/no volvés a pagar nada/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Mover el turno' }));

    expect(await screen.findByText('Movimos tu turno')).toBeInTheDocument();
    expect(api.reprogramados).toEqual([expect.objectContaining({ id: ID, startTime: '09:30' })]);
  });
});

describe('qué avisos de turno se entienden (ENG-204)', () => {
  it('solo los de turno con su id', () => {
    expect(appointmentPushData({ tipo: 'REEMBOLSO_TOTAL', appointmentId: 'a' })).toEqual({
      tipo: 'REEMBOLSO_TOTAL',
      appointmentId: 'a',
    });
    expect(appointmentPushData({ tipo: 'REEMBOLSO_TOTAL' })).toBeNull();
    expect(appointmentPushData({ tipo: 'OTRO', appointmentId: 'a' })).toBeNull();
    expect(appointmentPushData(null)).toBeNull();
  });

  it('el destino distingue mensaje de turno', () => {
    expect(pushTarget({ tipo: 'TURNO_CANCELADO_PROFESIONAL', appointmentId: 'a' })).toEqual({
      kind: 'turno',
      appointmentId: 'a',
    });
    expect(
      pushTarget({ tipo: 'NUEVO_MENSAJE', conversationId: 'c', contraparteId: 'p', nombre: 'Ana' })
        ?.kind,
    ).toBe('conversacion');
    expect(pushTarget({ tipo: 'X' })).toBeNull();
  });

  it('los avisos de turno de ENG-208 también llevan al turno', () => {
    for (const tipo of [
      'PLAZO_REPROGRAMACION_POR_VENCER',
      'REEMBOLSO_ACTUALIZADO',
      'PAGO_ACREDITADO',
      'RECORDATORIO_24H',
      'RECORDATORIO_1H',
    ]) {
      expect(pushTarget({ tipo, appointmentId: 'a' })).toEqual({
        kind: 'turno',
        appointmentId: 'a',
      });
    }
  });
});
