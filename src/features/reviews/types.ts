/* Tipos de las reseñas (ENG-80, ENG-82): los mismos que la web y que backend#92. */

export type ReviewStatus = 'PENDIENTE_MODERACION' | 'APROBADA' | 'RECHAZADA';

/** Una reseña del paciente de la sesión, en `GET /reviews/me`. */
export interface MyReview {
  id: string;
  appointmentId: string;
  professionalId: string;
  /** De 1 a 5. */
  rating: number;
  comment: string | null;
  status: ReviewStatus;
  /** Por qué no se publicó; solo si está `RECHAZADA`. */
  moderationReason: string | null;
  createdAt: string;
}

/** `POST /appointments/:appointmentId/review`. */
export interface NewReview {
  rating: number;
  comment?: string;
}

/** El promedio del profesional. `null` mientras no tiene reseñas aprobadas. */
export interface RatingSummary {
  average: number;
  count: number;
}

/** Una reseña aprobada, como la ve cualquiera en el perfil público. */
export interface PublicReview {
  id: string;
  rating: number;
  comment: string | null;
  /** Nombre e inicial del apellido ("Julián S."): el backend no manda más. */
  author: string;
  createdAt: string;
  response: { content: string; createdAt: string } | null;
}

/** `GET /professionals/:id/reviews?page=N`, de a 10. */
export interface ProfessionalReviewsPage {
  reviews: PublicReview[];
  rating: RatingSummary | null;
  page: number;
  hasMore: boolean;
}
