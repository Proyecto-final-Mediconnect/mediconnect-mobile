import { describe, expect, it } from 'vitest';

import type { ProfessionalCard } from '../types';
import { buildCatalogQuery, matchesSearch } from './catalog';

const OLIVARES: ProfessionalCard = {
  id: 'p1',
  firstName: 'Martín',
  lastName: 'Olivares',
  photoUrl: null,
  primarySpecialty: { id: 's1', name: 'Cardiología' },
  specialties: [{ id: 's1', name: 'Cardiología' }],
  price: 42000,
  currency: 'ARS',
};

describe('buildCatalogQuery', () => {
  it('manda cada especialidad por separado y el tope de precio', () => {
    const query = new URLSearchParams(
      buildCatalogQuery({ specialtyIds: ['s1', 's2'], maxPrice: 25000 }, 2),
    );

    expect(query.getAll('specialtyId')).toEqual(['s1', 's2']);
    expect(query.get('maxPrice')).toBe('25000');
    expect(query.get('page')).toBe('2');
  });

  it('sin filtros no manda especialidad ni precio', () => {
    const query = new URLSearchParams(buildCatalogQuery({ specialtyIds: [], maxPrice: null }, 1));

    expect(query.has('specialtyId')).toBe(false);
    expect(query.has('maxPrice')).toBe(false);
  });
});

describe('matchesSearch', () => {
  it('encuentra por nombre o especialidad, sin tildes ni mayúsculas', () => {
    expect(matchesSearch(OLIVARES, 'martin')).toBe(true);
    expect(matchesSearch(OLIVARES, 'CARDIO')).toBe(true);
    expect(matchesSearch(OLIVARES, 'derma')).toBe(false);
    expect(matchesSearch(OLIVARES, '  ')).toBe(true);
  });
});
