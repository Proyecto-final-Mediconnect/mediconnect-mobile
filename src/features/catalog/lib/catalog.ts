import type { CatalogFilters, ProfessionalCard } from '../types';

export const PAGE_SIZE = 20;

/**
 * Los topes de precio que se ofrecen como chips. En el celular, dos campos
 * numéricos de mínimo y máximo son incómodos; el paciente piensa en "hasta
 * cuánto puedo pagar".
 */
export const PRICE_CAPS = [15_000, 25_000, 45_000] as const;

/** La query de `GET /catalog/professionals`, igual que la arma la web. */
export function buildCatalogQuery(filters: CatalogFilters, page: number): string {
  const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
  if (filters.search.trim() !== '') params.set('search', filters.search.trim());
  for (const id of filters.specialtyIds) params.append('specialtyId', id);
  if (filters.maxPrice !== null) params.set('maxPrice', String(filters.maxPrice));
  return params.toString();
}

function normalize(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/**
 * Si el profesional coincide con lo que se escribió en el buscador: por nombre,
 * apellido o especialidad, sin tildes ni mayúsculas.
 *
 * La búsqueda la hace el backend (`search` en `GET /catalog/professionals`);
 * esta es la misma regla, para que los datos de ejemplo respondan igual.
 */
export function matchesSearch(professional: ProfessionalCard, search: string): boolean {
  const needle = normalize(search.trim());
  if (!needle) return true;
  const haystack = normalize(
    [
      professional.firstName,
      professional.lastName,
      ...professional.specialties.map((s) => s.name),
    ].join(' '),
  );
  return haystack.includes(needle);
}

export function fullName(p: { firstName: string; lastName: string }): string {
  return `${p.firstName} ${p.lastName}`.trim();
}

export function initialsOf(p: { firstName: string; lastName: string }): string {
  return `${p.firstName.charAt(0)}${p.lastName.charAt(0)}`.toUpperCase() || '·';
}

/** La especialidad que se muestra en la tarjeta: la principal o la primera. */
export function mainSpecialty(p: ProfessionalCard): string | null {
  return p.primarySpecialty?.name ?? p.specialties[0]?.name ?? null;
}
