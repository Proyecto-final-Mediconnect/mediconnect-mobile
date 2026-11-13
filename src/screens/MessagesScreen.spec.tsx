import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { POLL_INTERVAL_MS } from '../features/chat/hooks/use-chat';
import { CONVERSACION_GARCIA, chatDemo } from '../mocks/chat';
import { __abiertas } from '../../test-stubs/expo-web-browser';
import { __fotos } from '../../test-stubs/expo-image-picker';
import { API_URL } from '../test/msw-server';
import { multipartFields } from '../test/multipart';
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

  it(
    'trae sola la respuesta de la profesional, sin recargar',
    async () => {
      await abrirConversacionConGarcia();

      chatDemo.recibir(CONVERSACION_GARCIA, '¿Cómo seguiste con la presión?');

      // Con relojes reales: el intervalo de la consulta periódica ya está
      // corriendo cuando llega el mensaje, así que se espera un ciclo entero.
      // Aparece en la conversación y, al refrescarse, en la vista previa de la
      // bandeja de atrás.
      await waitFor(
        () =>
          expect(screen.getAllByText('¿Cómo seguiste con la presión?').length).toBeGreaterThan(0),
        { timeout: POLL_INTERVAL_MS + 2_000 },
      );
    },
    POLL_INTERVAL_MS + 6_000,
  );

  it('al volver de segundo plano trae enseguida lo que llegó', async () => {
    await abrirConversacionConGarcia();
    chatDemo.recibir(CONVERSACION_GARCIA, 'Te mandé la receta.');

    // React Native Web arma `AppState` con la visibilidad de la página.
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect((await screen.findAllByText('Te mandé la receta.')).length).toBeGreaterThan(0);
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

describe('Archivos en el chat (ENG-102)', () => {
  it('manda un PDF con un comentario: se ve en la conversación y el campo queda limpio', async () => {
    let campos: Record<string, string> = {};
    await renderApp(
      http.post(`${API_URL}/conversations/:id/attachments`, async ({ params, request }) => {
        campos = await multipartFields(request);
        const enviado = chatDemo.enviarArchivo(
          String(params.id),
          { tipo: 'application/pdf', tamano: 245_000 },
          campos.contenido ?? '',
        );
        return HttpResponse.json(enviado, { status: 201 });
      }),
    );
    fireEvent.click(await screen.findByRole('button', { name: 'Mensajes' }));
    fireEvent.click(await screen.findByRole('button', { name: /Conversación con Ana García/ }));
    await screen.findByText('Los vi, está todo bien.');

    fireEvent.click(screen.getByRole('button', { name: 'Adjuntar una foto o un PDF' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Elegir un PDF' }));
    expect(await screen.findByText('Hemograma_marzo.pdf')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Mensaje'), { target: { value: 'El hemograma' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));

    expect(await screen.findByRole('button', { name: 'Abrir pdf (239 KB)' })).toBeInTheDocument();
    expect(screen.getByText('El hemograma')).toBeInTheDocument();
    expect(screen.queryByText('Hemograma_marzo.pdf')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Mensaje')).toHaveValue('');
    expect(campos.contenido).toBe('El hemograma');
  });

  it('un archivo que no se puede mandar avisa antes de subirlo', async () => {
    await abrirConversacionConGarcia();
    __fotos.proxima = {
      uri: 'file:///cache/foto.heic',
      width: 1,
      height: 1,
      fileName: 'foto.heic',
      mimeType: 'image/heic',
    };

    fireEvent.click(screen.getByRole('button', { name: 'Adjuntar una foto o un PDF' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Elegir de la galería' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/HEIC/);
    expect(screen.getByRole('button', { name: 'Enviar' })).toBeDisabled();
  });

  it('una foto de la profesional se ve en miniatura y al tocarla se abre', async () => {
    await renderApp();
    // Después de montar: `renderApp` arranca con el chat de ejemplo recién armado.
    const id = chatDemo.recibirFoto(CONVERSACION_GARCIA)!;
    fireEvent.click(await screen.findByRole('button', { name: 'Mensajes' }));
    fireEvent.click(await screen.findByRole('button', { name: /Conversación con Ana García/ }));

    const foto = await screen.findByRole('button', { name: 'Abrir foto (340 KB)' });
    fireEvent.click(foto);

    await waitFor(() => expect(__abiertas.at(-1)).toBe(`https://storage.test/${id}`));
  });
});
