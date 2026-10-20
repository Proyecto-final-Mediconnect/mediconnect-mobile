/** Roles de dominio de MediConnect (espeja `user_role` de la base). Igual que en la web. */
export type UserRole = 'PACIENTE' | 'PROFESIONAL' | 'MODERADOR';

/**
 * El usuario de la sesión, tal como lo devuelve `GET /me`. El `role` sale de
 * `profiles.role` en la base, no del JWT. Mismo tipo que `SessionUser` de la web.
 */
export interface SessionUser {
  id: string;
  email: string;
  role: UserRole;
  firstName: string | null;
  lastName: string | null;
  /**
   * Si aceptó la versión vigente de los términos, la privacidad y el
   * consentimiento de datos de salud (ENG-140). Opcional mientras haya un
   * backend sin ENG-140: sin el dato no se bloquea a nadie.
   */
  legalAccepted?: boolean;
  legalVersion?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

/** Respuesta de `POST /auth/mobile/login` y `/auth/mobile/refresh`. */
export interface MobileSession {
  user: { id: string; email?: string };
  accessToken: string;
  refreshToken: string;
}

/**
 * Nombre completo, con el email de respaldo: entre el registro y el alta de la
 * ficha el perfil todavía no tiene nombre. Mismo criterio que la web.
 */
export function displayNameOf(user: SessionUser): string {
  return user.firstName ? `${user.firstName} ${user.lastName ?? ''}`.trim() : user.email;
}

/** Iniciales para el avatar; nunca vacías, por el mismo motivo. */
export function initialsOf(user: SessionUser): string {
  const deNombre = (user.firstName?.charAt(0) ?? '') + (user.lastName?.charAt(0) ?? '');
  return (deNombre || user.email.charAt(0) || '·').toUpperCase();
}
