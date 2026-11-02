import { describe, expect, it } from 'vitest';

import { formatAverage, formatReviewDate, hasRating, ratingSummaryText } from './reviews';

describe('reseñas: formato', () => {
  it('el promedio va con coma y un decimal', () => {
    expect(formatAverage(4.66)).toBe('4,7');
    expect(formatAverage(5)).toBe('5,0');
  });

  it('el resumen dice reseña o reseñas según cuántas haya', () => {
    expect(ratingSummaryText({ average: 4.66, count: 12 })).toBe('4,7 · 12 reseñas');
    expect(ratingSummaryText({ average: 3, count: 1 })).toBe('3,0 · 1 reseña');
  });

  it('sin reseñas, o con un backend que no manda el campo, no hay calificación', () => {
    expect(hasRating(null)).toBe(false);
    expect(hasRating(undefined)).toBe(false);
    expect(hasRating({ average: 0, count: 0 })).toBe(false);
    expect(hasRating({ average: 4, count: 2 })).toBe(true);
  });

  // 01:30 en UTC todavía es el día anterior en Argentina.
  it('la fecha es la de Argentina, corta y sin "de"', () => {
    expect(formatReviewDate('2026-10-13T01:30:00.000Z')).toBe('12 oct 2026');
  });
});
