/* Tipos del catálogo de profesionales: los mismos que la web (ENG-49, ENG-50). */

export interface Specialty {
  id: string;
  name: string;
}

/** Un profesional en la lista de `GET /catalog/professionals`. */
export interface ProfessionalCard {
  id: string;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
  primarySpecialty: Specialty | null;
  specialties: Specialty[];
  /** `null` mientras el profesional no publicó su precio. */
  price: number | null;
  currency: string;
}

export interface Education {
  id: string;
  institution: string;
  degree: string;
  year: number | null;
}

/** `GET /professionals/:id`. */
export interface PublicProfessionalProfile {
  id: string;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
  bio: string | null;
  specialties: Specialty[];
  education: Education[];
  price: number | null;
  currency: string;
}

export interface ProfessionalsPage {
  data: ProfessionalCard[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
  };
}

/** Lo que filtra el backend, incluida la búsqueda por nombre o especialidad. */
export interface CatalogFilters {
  /** Nombre, apellido o especialidad; sin tildes ni mayúsculas. Vacío: sin búsqueda. */
  search: string;
  specialtyIds: string[];
  /** Tope de precio; `null` es cualquier precio. */
  maxPrice: number | null;
}

export const EMPTY_FILTERS: CatalogFilters = { search: '', specialtyIds: [], maxPrice: null };
