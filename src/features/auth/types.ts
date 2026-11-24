/** Roles de dominio de MediConnect, igual que en la web. La app es solo para
 *  pacientes: el profesional y el administrador (ENG-240) entran por la web. */
export type UserRole = 'PACIENTE' | 'PROFESIONAL' | 'ADMINISTRADOR';

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

/** El formulario de registro de paciente (ENG-235), igual que el de la web. */
export interface RegisterInput {
  email: string;
  password: string;
  passwordConfirmation: string;
  acceptedLegal: boolean;
}

/** Respuesta de `POST /auth/mobile/login` y `/auth/mobile/refresh`. */
export interface MobileSession {
  user: { id: string; email?: string };
  accessToken: string;
  refreshToken: string;
}

/**
 * La respuesta del login cuando la cuenta tiene activa la verificación en dos
 * pasos (ENG-88): todavía no hay sesión, solo el token para mandar con el código.
 */
export interface MobileMfaRequired {
  user: { id: string; email?: string };
  mfaRequired: true;
  mfaToken: string;
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
