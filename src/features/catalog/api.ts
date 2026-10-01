import { apiRequest } from '../../shared/lib/api-client';
import { buildCatalogQuery } from './lib/catalog';
import type {
  CatalogFilters,
  ProfessionalsPage,
  PublicProfessionalProfile,
  Specialty,
} from './types';

/** `GET /catalog/professionals`: los profesionales validados, paginados y filtrados. */
export function listProfessionals(
  filters: CatalogFilters,
  page: number,
): Promise<ProfessionalsPage> {
  return apiRequest<ProfessionalsPage>(
    `/catalog/professionals?${buildCatalogQuery(filters, page)}`,
    {
      fallbackMessage: 'No pudimos cargar los profesionales. Intentá de nuevo.',
    },
  );
}

/** `GET /specialties`: las especialidades para el filtro. */
export function listSpecialties(): Promise<Specialty[]> {
  return apiRequest<Specialty[]>('/specialties', {
    fallbackMessage: 'No pudimos cargar las especialidades.',
  });
}

/** `GET /professionals/:id`: el perfil público. */
export function fetchPublicProfile(id: string): Promise<PublicProfessionalProfile> {
  return apiRequest<PublicProfessionalProfile>(`/professionals/${encodeURIComponent(id)}`, {
    fallbackMessage: 'No pudimos cargar el perfil. Intentá de nuevo.',
  });
}
