import type { RatingSummary, ReviewStatus } from '../types';

/** Lo que entra en el comentario, igual que el backend. */
export const MAX_COMMENT = 1000;

/** Una etiqueta por estrella, las de la web: el número solo no dice mucho. */
export const RATING_LABELS = ['Mala', 'Regular', 'Buena', 'Muy buena', 'Excelente'] as const;

export function ratingLabel(value: number): string {
  return RATING_LABELS[value - 1] ?? '';
}

/** "4,7": con coma, como se escribe en castellano. */
export function formatAverage(average: number): string {
  return average.toFixed(1).replace('.', ',');
}

export function reviewsCount(count: number): string {
  return `${String(count)} ${count === 1 ? 'reseña' : 'reseñas'}`;
}

/**
 * Si hay algo que mostrar del promedio. Un profesional sin reseñas aprobadas
 * viene con `null`, y un backend anterior a backend#92 no manda el campo.
 */
export function hasRating(rating: RatingSummary | null | undefined): rating is RatingSummary {
  return !!rating && rating.count > 0;
}

/** "4,7 · 12 reseñas". */
export function ratingSummaryText(rating: RatingSummary): string {
  return `${formatAverage(rating.average)} · ${reviewsCount(rating.count)}`;
}

export const STATUS_LABELS: Record<ReviewStatus, string> = {
  PENDIENTE_MODERACION: 'En revisión',
  APROBADA: 'Publicada',
  RECHAZADA: 'No publicada',
};

export const STATUS_TONES: Record<ReviewStatus, 'warning' | 'ok' | 'danger'> = {
  PENDIENTE_MODERACION: 'warning',
  APROBADA: 'ok',
  RECHAZADA: 'danger',
};

const FECHA = new Intl.DateTimeFormat('es-AR', {
  timeZone: 'America/Argentina/Buenos_Aires',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

/**
 * "12 oct 2026", en la hora de Argentina como el resto de la app. Se arma con
 * las partes y no con `format`, que da "12 de oct de 2026": los "de" alargan una
 * línea que va al lado del autor.
 */
export function formatReviewDate(iso: string): string {
  const partes = FECHA.formatToParts(new Date(iso));
  const parte = (tipo: Intl.DateTimeFormatPartTypes): string =>
    partes.find((p) => p.type === tipo)?.value.replace('.', '') ?? '';
  return `${parte('day')} ${parte('month')} ${parte('year')}`;
}
