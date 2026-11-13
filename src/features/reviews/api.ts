import { apiRequest } from '../../shared/lib/api-client';
import type { MyReview, NewReview, PendingReview, ProfessionalReviewsPage } from './types';

/* API de reseñas: los mismos endpoints que usa la web (backend#92). */

/** `GET /reviews/me`: las reseñas que dejó el paciente, en cualquier estado. */
export function fetchMyReviews(): Promise<MyReview[]> {
  return apiRequest<MyReview[]>('/reviews/me', {
    fallbackMessage: 'No pudimos cargar tus reseñas.',
  });
}

/**
 * `POST /appointments/:appointmentId/review`. El comentario vacío no se manda:
 * el backend lo guardaría como `""` y la reseña mostraría unas comillas vacías.
 */
export function createReview(appointmentId: string, review: NewReview): Promise<MyReview> {
  const comment = review.comment?.trim();
  return apiRequest<MyReview>(`/appointments/${encodeURIComponent(appointmentId)}/review`, {
    method: 'POST',
    body: comment ? { rating: review.rating, comment } : { rating: review.rating },
    fallbackMessage: 'No pudimos enviar la reseña. Intentá de nuevo.',
  });
}

/** `GET /professionals/:id/reviews?page=N`: las aprobadas, de a 10. */
export function fetchProfessionalReviews(
  professionalId: string,
  page: number,
): Promise<ProfessionalReviewsPage> {
  return apiRequest<ProfessionalReviewsPage>(
    `/professionals/${encodeURIComponent(professionalId)}/reviews?page=${String(page)}`,
    { fallbackMessage: 'No pudimos cargar las reseñas.' },
  );
}

/** `GET /reviews/pending`: los turnos que falta reseñar (ENG-190). */
export function fetchPendingReviews(): Promise<PendingReview[]> {
  return apiRequest<PendingReview[]>('/reviews/pending', {
    fallbackMessage: 'No pudimos cargar tus consultas para calificar.',
  });
}

/** `POST /reviews/pending/:appointmentId/dismiss`: no se vuelve a pedir. */
export function dismissPendingReview(appointmentId: string): Promise<void> {
  return apiRequest<void>(`/reviews/pending/${encodeURIComponent(appointmentId)}/dismiss`, {
    method: 'POST',
    fallbackMessage: 'No pudimos ocultar el pedido.',
  });
}
