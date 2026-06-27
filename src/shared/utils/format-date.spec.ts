import { describe, expect, it } from 'vitest';

import { formatShortDate } from './format-date';

describe('formatShortDate', () => {
  it('formats a date as dd/MM/yyyy with zero padding', () => {
    expect(formatShortDate(new Date(2026, 0, 5))).toBe('05/01/2026');
  });

  it('keeps two-digit days and months intact', () => {
    expect(formatShortDate(new Date(2026, 11, 25))).toBe('25/12/2026');
  });
});
