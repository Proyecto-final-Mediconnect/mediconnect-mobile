import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { POLL_INTERVAL_MS } from '../features/chat/hooks/use-chat';
import { CONVERSACION_GARCIA, chatDemo } from '../mocks/chat';
import { API_URL } from '../test/msw-server';
import { renderApp } from '../test/render-app';

/** El chat con los profesionales desde la app (ENG-152). */

async function abrirMensajes(...respuestas: Parameters<typeof renderApp>): Promise<void> {
  await renderApp(...respuestas);
  fireEvent.click(await screen.findByRole('button', { name: 'Mensajes' }));
  await screen.findByRole('heading', { name: 'Mensajes' });
}

async function abrirConversacionConGarcia(): Promise<void> {
  await abrirMensajes();
  fireEvent.click(
    await screen.findByRole('button', { name: /Conversación con Ana García, 2 mensajes sin leer/ }),
  );
  // El primer mensaje de hoy: el último también está en la vista previa de la bandeja.
  await screen.findByText('Los vi, está todo bien.');
}

afterEach(() => {
  vi.useRealTimers();
});

describe('Mensajes (ENG-152)', () => {
  it('el inicio avisa cuántos mensajes hay sin leer', async () => {
    await renderApp();

    const acceso = await screen.findByRole('button', { name: 'Mensajes' });
    expect(await within(acceso).findByText('2 mensajes sin leer')).toBeInTheDocument();
  });

  it('la bandeja muestra la conversación y con quién se puede empezar una', async () => {
    await abrirMensajes();

    const fila = await screen.findByRole('button', {
      name: /Conversación con Ana García, 2 mensajes sin leer/,
    });
    expect(
      within(fila).getByText('Seguí con la misma dosis y nos vemos en el control.'),
    ).toBeInTheDocument();
    expect(screen.getByText('EMPEZAR UNA CONVERSACIÓN')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Escribirle a Valeria Ocampo' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Escribirle a Martín Olivares' }),
    ).toBeInTheDocument();
  });

  it('sin turnos pagos no hay con quién hablar, y lo dice', async () => {
    await abrirMensajes(
      http.get(`${API_URL}/conversations/me`, () =>
        HttpResponse.json({ conversaciones: [], disponibles: [] }),
      ),
    );

    expect(
      await screen.findByRole('heading', { name: 'Todavía no tenés mensajes' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sacar un turno' })).toBeInTheDocument();
  });

  it('si la bandeja falla, ofrece reintentar', async () => {
    await abrirMensajes(
      http.get(`${API_URL}/conversations/me`, () =>
        HttpResponse.json({ message: 'No pudimos cargar tus mensajes.' }, { status: 500 }),
      ),
    );

    expect(await screen.findByText('No pudimos cargar tus mensajes.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Probá de nuevo' })).toBeInTheDocument();
  });
});

describe('Una conversación (ENG-152)', () => {
  it('muestra los mensajes con sus días y marca leído lo que mandó la profesional', async () => {
    let marcados = 0;
    await renderApp(
      http.patch(`${API_URL}/conversations/:id/read`, ({ params }) => {
        marcados += 1;
        chatDemo.marcarLeido(String(params.id));
        return new HttpResponse(null, { status: 204 });
      }),
    );
    fireEvent.click(await screen.findByRole('button', { name: 'Mensajes' }));
    fireEvent.click(await screen.findByRole('button', { name: /Conversación con Ana García/ }));

    expect(await screen.findByText('Los vi, está todo bien.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Ayer' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Hoy' })).toBeInTheDocument();
    await waitFor(() => expect(marcados).toBe(1));
  });

  it('manda un mensaje, vacía el campo y lo muestra como enviado', async () => {
    await abrirConversacionConGarcia();
    const campo = screen.getByLabelText('Mensaje');
    const enviar = screen.getByRole('button', { name: 'Enviar' });

    expect(enviar).toBeDisabled();
    fireEvent.change(campo, { target: { value: '  Gracias, doctora  ' } });
    fireEvent.click(enviar);

    expect(await screen.findByText('Gracias, doctora')).toBeInTheDocument();
    expect(campo).toHaveValue('');
    expect(screen.getByText(/· Enviado/)).toBeInTheDocument();
  });

  it('si el envío falla, avisa y no borra lo escrito', async () => {
    await abrirConversacionConGarcia();
    const campo = screen.getByLabelText('Mensaje');

    // El handler se cambia recién acá: si no, la carga inicial también fallaría.
    const { server } = await import('../test/msw-server');
    server.use(
      http.post(`${API_URL}/conversations/:id/messages`, () =>
        HttpResponse.json({ message: 'No pudimos enviar el mensaje.' }, { status: 500 }),
      ),
    );
    fireEvent.change(campo, { target: { value: 'Una pregunta' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos enviar el mensaje.');
    expect(campo).toHaveValue('Una pregunta');
  });

  it('trae sola la respuesta de la profesional, sin recargar', async () => {
    await abrirConversacionConGarcia();
    vi.useFakeTimers({ shouldAdvanceTime: true });

    chatDemo.recibir(CONVERSACION_GARCIA, '¿Cómo seguiste con la presión?');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS + 100);
    });

    // Aparece en la conversación y, al refrescarse, en la vista previa de la bandeja de atrás.
    expect((await screen.findAllByText('¿Cómo seguiste con la presión?')).length).toBeGreaterThan(
      0,
    );
  });

  it('un chat nuevo se crea con el primer mensaje', async () => {
    await abrirMensajes();
    fireEvent.click(await screen.findByRole('button', { name: 'Escribirle a Valeria Ocampo' }));

    expect(await screen.findByText('Escribile a Valeria Ocampo')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Mensaje'), { target: { value: 'Hola doctora' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));

    await waitFor(() => expect(screen.getByText('Hola doctora')).toBeInTheDocument());
    expect(chatDemo.bandeja().conversaciones.map((c) => c.contraparte.nombre)).toContain(
      'Valeria Ocampo',
    );
  });

  it('desde un turno pago se le puede escribir a la profesional, en la conversación que ya existe', async () => {
    await renderApp();
    fireEvent.click(screen.getByRole('tab', { name: 'Turnos' }));
    const lista = within(await screen.findByTestId('lista-turnos'));
    const completado = lista
      .getAllByRole('button', { name: 'Ver el turno con Ana García' })
      .find((b) => within(b).queryByText('Completado'))!;
    fireEvent.click(completado);
    fireEvent.click(await screen.findByRole('button', { name: 'Escribirle a Ana' }));

    expect(await screen.findByText('Los vi, está todo bien.')).toBeInTheDocument();
  });
});
