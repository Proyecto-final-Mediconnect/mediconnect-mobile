import { fireEvent, screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { perfilDe, PROFESIONALES } from '../mocks/catalog';
import type { PublicReview } from '../features/reviews/types';
import { API_URL } from '../test/msw-server';
import { renderApp } from '../test/render-app';

const RATING = { average: 4.66, count: 12 };

function resena(id: string, parcial: Partial<PublicReview> = {}): PublicReview {
  return {
    id,
    rating: 5,
    comment: 'Me explicó todo con paciencia.',
    author: 'Julián S.',
    createdAt: '2026-10-12T15:00:00.000Z',
    response: null,
    ...parcial,
  };
}

async function abrirPerfilDeOlivares(...handlers: Parameters<typeof renderApp>): Promise<void> {
  await renderApp(...handlers);
  fireEvent.click(screen.getByRole('tab', { name: 'Reservar' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Ver el perfil de Martín Olivares' }));
  await screen.findByText('Sobre mí');
}

describe('Las reseñas en el perfil del profesional (ENG-82)', () => {
  it('muestra el promedio, las reseñas y la respuesta del profesional', async () => {
    const paginas: string[] = [];
    await abrirPerfilDeOlivares(
      http.get(`${API_URL}/professionals/:id`, ({ params }) =>
        HttpResponse.json({ ...perfilDe(String(params.id)), rating: RATING }),
      ),
      http.get(`${API_URL}/professionals/:id/reviews`, ({ request }) => {
        const page = new URL(request.url).searchParams.get('page') ?? '';
        paginas.push(page);
        return page === '1'
          ? HttpResponse.json({
              reviews: [
                resena('r1', {
                  response: {
                    content: 'Gracias, Julián. Cualquier duda, escribime.',
                    createdAt: '2026-10-13T12:00:00.000Z',
                  },
                }),
                resena('r2', { rating: 4, author: 'Lucía P.', comment: null }),
              ],
              rating: RATING,
              page: 1,
              hasMore: true,
            })
          : HttpResponse.json({
              reviews: [resena('r3', { author: 'Sergio M.', comment: 'Puntual.' })],
              rating: RATING,
              page: 2,
              hasMore: false,
            });
      }),
    );

    // Cerca del nombre y el precio, con coma.
    expect(screen.getByLabelText('4,7 de 5, 12 reseñas')).toHaveTextContent('4,7 · 12 reseñas');

    expect(await screen.findByText('12 reseñas de pacientes atendidos')).toBeInTheDocument();
    expect(screen.getByText('4,7')).toBeInTheDocument();
    expect(screen.getByText('Julián S.')).toBeInTheDocument();
    expect(screen.getByText('Me explicó todo con paciencia.')).toBeInTheDocument();
    expect(screen.getAllByText('12 oct 2026')).toHaveLength(2);
    expect(screen.getByText('RESPUESTA DEL PROFESIONAL')).toBeInTheDocument();
    expect(screen.getByText('Gracias, Julián. Cualquier duda, escribime.')).toBeInTheDocument();
    expect(screen.getByText('Lucía P.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Ver más reseñas' }));

    expect(await screen.findByText('Sergio M.')).toBeInTheDocument();
    // Las de la primera página siguen ahí, sin repetirse.
    expect(screen.getAllByText('Julián S.')).toHaveLength(1);
    expect(screen.queryByRole('button', { name: 'Ver más reseñas' })).not.toBeInTheDocument();
    expect(paginas).toEqual(['1', '2']);
  });

  it('si falla "Ver más" lo avisa y deja reintentar, sin repetir reseñas', async () => {
    let fallaLaSegunda = true;
    await abrirPerfilDeOlivares(
      http.get(`${API_URL}/professionals/:id/reviews`, ({ request }) => {
        const page = new URL(request.url).searchParams.get('page');
        if (page === '1') {
          return HttpResponse.json({
            reviews: [resena('r1'), resena('r2', { author: 'Lucía P.' })],
            rating: RATING,
            page: 1,
            hasMore: true,
          });
        }
        if (fallaLaSegunda) return HttpResponse.json({ message: 'Error' }, { status: 500 });
        // Se aprobó una nueva en el medio: la segunda página repite `r2`.
        return HttpResponse.json({
          reviews: [resena('r2', { author: 'Lucía P.' }), resena('r3', { author: 'Sergio M.' })],
          rating: RATING,
          page: 2,
          hasMore: false,
        });
      }),
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Ver más reseñas' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar más reseñas.');
    expect(screen.getByText('Lucía P.')).toBeInTheDocument();

    fallaLaSegunda = false;
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByText('Sergio M.')).toBeInTheDocument();
    expect(screen.getAllByText('Lucía P.')).toHaveLength(1);
    expect(screen.queryByText('No pudimos cargar más reseñas.')).not.toBeInTheDocument();
  });

  it('sin reseñas lo dice y explica quién puede dejar una', async () => {
    await abrirPerfilDeOlivares();

    expect(await screen.findByText('Todavía no tiene reseñas')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Solo puede dejar una reseña quien haya tenido una consulta con este profesional.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/de pacientes atendidos/)).not.toBeInTheDocument();
    expect(screen.queryByText(/· \d+ reseñas?$/)).not.toBeInTheDocument();
  });

  it('en la búsqueda, el profesional con reseñas lleva su calificación', async () => {
    await renderApp(
      http.get(`${API_URL}/catalog/professionals`, () =>
        HttpResponse.json({
          data: PROFESIONALES.map((p) =>
            p.id === 'pro-olivares' ? { ...p, rating: { average: 5, count: 1 } } : p,
          ),
          meta: { page: 1, limit: 20, total: 3, totalPages: 1, hasNextPage: false },
        }),
      ),
    );
    fireEvent.click(screen.getByRole('tab', { name: 'Reservar' }));

    const olivares = within(
      await screen.findByRole('button', { name: 'Ver el perfil de Martín Olivares' }),
    );
    expect(olivares.getByText('5,0 · 1 reseña')).toBeInTheDocument();
    const ruiz = within(screen.getByRole('button', { name: 'Ver el perfil de Carolina Ruiz' }));
    expect(ruiz.queryByText(/reseña/)).not.toBeInTheDocument();
  });
});
