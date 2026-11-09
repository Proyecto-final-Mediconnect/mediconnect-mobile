import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import type { MyReview } from '../features/reviews/types';
import { API_URL } from '../test/msw-server';
import { renderApp } from '../test/render-app';

/** La consulta de control con Ana García, que ya se hizo (los datos de ejemplo). */
const TURNO = 'turno-control';

function resena(parcial: Partial<MyReview> = {}): MyReview {
  return {
    id: 'res-1',
    appointmentId: TURNO,
    professionalId: 'pro-garcia',
    rating: 4,
    comment: 'Muy clara con las indicaciones.',
    status: 'PENDIENTE_MODERACION',
    moderationReason: null,
    createdAt: new Date().toISOString(),
    ...parcial,
  };
}

/** Abre el detalle del turno completado: García tiene también uno cancelado. */
async function abrirConsultaHecha(...handlers: Parameters<typeof renderApp>): Promise<void> {
  await renderApp(...handlers);
  fireEvent.click(screen.getByRole('tab', { name: 'Turnos' }));
  const lista = within(await screen.findByTestId('lista-turnos'));
  const completado = lista
    .getAllByRole('button', { name: 'Ver el turno con Ana García' })
    .find((b) => within(b).queryByText('Completado'))!;
  fireEvent.click(completado);
  await screen.findByText('Tu turno');
}

describe('La reseña de una consulta (ENG-80)', () => {
  it('se deja desde el detalle: el POST lleva las estrellas y el comentario', async () => {
    let guardada: MyReview | null = null;
    const enviados: unknown[] = [];
    await abrirConsultaHecha(
      http.get(`${API_URL}/reviews/me`, () => HttpResponse.json(guardada ? [guardada] : [])),
      http.post(`${API_URL}/appointments/:id/review`, async ({ params, request }) => {
        const body = (await request.json()) as { rating: number; comment?: string };
        enviados.push({ id: params.id, ...body });
        guardada = resena({ rating: body.rating, comment: body.comment ?? null });
        return HttpResponse.json(guardada, { status: 201 });
      }),
    );

    expect(
      await screen.findByText(/¿Cómo te fue con Ana García\? Tu reseña ayuda a otros pacientes/),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Dejar una reseña' }));

    expect(
      await screen.findByText(/Se publica en su perfil cuando la revise un moderador/),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: '4 estrellas, Muy buena' }));
    expect(screen.getByText('Muy buena')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Comentario (opcional)'), {
      target: { value: 'Muy clara con las indicaciones.' },
    });
    expect(screen.getByText('31/1000')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Enviar reseña' }));

    // La hoja se cierra y la tarjeta muestra la reseña, en revisión.
    expect(await screen.findByText('En revisión')).toBeInTheDocument();
    expect(enviados).toEqual([
      { id: TURNO, rating: 4, comment: 'Muy clara con las indicaciones.' },
    ]);
    expect(screen.getByText('“Muy clara con las indicaciones.”')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: '4 de 5 estrellas' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Dejar una reseña' })).not.toBeInTheDocument();
  });

  it('sin estrellas no se manda nada y pide elegirlas', async () => {
    let posts = 0;
    await abrirConsultaHecha(
      http.post(`${API_URL}/appointments/:id/review`, () => {
        posts += 1;
        return HttpResponse.json(resena(), { status: 201 });
      }),
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Dejar una reseña' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Enviar reseña' }));

    expect(await screen.findByText('Elegí de 1 a 5 estrellas.')).toBeInTheDocument();
    expect(posts).toBe(0);
  });

  it('si el backend la rechaza, el mensaje se ve en la hoja', async () => {
    await abrirConsultaHecha(
      http.post(`${API_URL}/appointments/:id/review`, () =>
        HttpResponse.json(
          { message: 'Ya dejaste una reseña para esta consulta.' },
          { status: 409 },
        ),
      ),
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Dejar una reseña' }));
    fireEvent.click(await screen.findByRole('radio', { name: '5 estrellas, Excelente' }));
    fireEvent.click(screen.getByRole('button', { name: 'Enviar reseña' }));

    expect(
      await screen.findByText('Ya dejaste una reseña para esta consulta.'),
    ).toBeInTheDocument();
  });

  it('con un 409 relee sus reseñas: la tarjeta deja de ofrecer reseñar', async () => {
    let yaLaDejo = false;
    await abrirConsultaHecha(
      http.get(`${API_URL}/reviews/me`, () => HttpResponse.json(yaLaDejo ? [resena()] : [])),
      http.post(`${API_URL}/appointments/:id/review`, () => {
        // La había dejado desde la web mientras esta pantalla estaba abierta.
        yaLaDejo = true;
        return HttpResponse.json(
          { message: 'Ya dejaste una reseña para esta consulta.' },
          { status: 409 },
        );
      }),
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Dejar una reseña' }));
    fireEvent.click(await screen.findByRole('radio', { name: '5 estrellas, Excelente' }));
    fireEvent.click(screen.getByRole('button', { name: 'Enviar reseña' }));

    expect(
      await screen.findByText('Ya dejaste una reseña para esta consulta.'),
    ).toBeInTheDocument();
    expect(await screen.findByText('En revisión')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Dejar una reseña' })).not.toBeInTheDocument();
  });

  it('si no carga sus reseñas, lo dice y deja reintentar', async () => {
    let falla = true;
    await abrirConsultaHecha(
      http.get(`${API_URL}/reviews/me`, () =>
        falla ? HttpResponse.json({ message: 'Error' }, { status: 500 }) : HttpResponse.json([]),
      ),
    );

    expect(await screen.findByText('No pudimos cargar tu reseña.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Dejar una reseña' })).not.toBeInTheDocument();

    falla = false;
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByRole('button', { name: 'Dejar una reseña' })).toBeInTheDocument();
    expect(screen.queryByText('No pudimos cargar tu reseña.')).not.toBeInTheDocument();
  });

  it('una reseña que no se publicó muestra el estado y el motivo', async () => {
    await abrirConsultaHecha(
      http.get(`${API_URL}/reviews/me`, () =>
        HttpResponse.json([
          resena({
            rating: 2,
            status: 'RECHAZADA',
            moderationReason: 'Incluye datos personales de otra persona.',
          }),
        ]),
      ),
    );

    expect(await screen.findByText('No publicada')).toBeInTheDocument();
    expect(
      screen.getByText('Motivo: Incluye datos personales de otra persona.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('img', { name: '2 de 5 estrellas' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Dejar una reseña' })).not.toBeInTheDocument();
  });

  it('un turno que todavía no pasó no ofrece reseñarlo', async () => {
    await renderApp();
    fireEvent.click(screen.getByRole('tab', { name: 'Turnos' }));
    const lista = within(await screen.findByTestId('lista-turnos'));
    fireEvent.click(lista.getAllByRole('button', { name: 'Ver el turno con Tomás Aliaga' })[0]!);

    expect(await screen.findByText('Tu turno')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('QUÉ PASÓ')).toBeInTheDocument());
    expect(screen.queryByText('TU RESEÑA')).not.toBeInTheDocument();
  });
});

describe('Probar cámara y micrófono desde el turno', () => {
  it('está en una consulta todavía no abierta (TOO_EARLY), donde no se puede entrar', async () => {
    await renderApp();
    fireEvent.click(screen.getByRole('tab', { name: 'Turnos' }));
    const lista = within(await screen.findByTestId('lista-turnos'));
    const porVenir = lista
      .getAllByRole('button', { name: 'Ver el turno con Martín Olivares' })
      .find((b) => within(b).queryByText('Confirmado'))!;
    fireEvent.click(porVenir);
    await screen.findByText('Tu turno');

    expect(screen.getByRole('button', { name: 'Probar cámara y micrófono' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ingresar a la sala' })).not.toBeInTheDocument();
  });

  it('no aparece en una consulta completada', async () => {
    await abrirConsultaHecha();

    expect(
      screen.queryByRole('button', { name: 'Probar cámara y micrófono' }),
    ).not.toBeInTheDocument();
  });
});
