/**
 * Tipos del MediPass (EP-05): el contrato de la API, el mismo que consume la
 * web (ENG-72, ENG-74, ENG-75, ENG-103).
 */

/**
 * Qué parte de la historia clínica ve quien accede. Todavía no hay forma de
 * elegirlo (ENG-149): hoy el consultante ve solo el bloque vital.
 *
 * El orden va de lo que salva una vida a lo que es privacidad pura.
 */
export type EmergencyScope = 'VITAL' | 'CONDICIONES' | 'NOTAS' | 'ESTUDIOS';

/** `GET /medipass/me`: el código vigente del paciente (ENG-72). */
export interface MediPassCode {
  codigo: string;
  /** ISO-8601: cuándo deja de valer y hay que pedir el siguiente. */
  expiraEl: string;
}

/**
 * Un acceso abierto ahora sobre el MediPass (`GET /medipass/me/accesses`,
 * ENG-74). El backend ya filtra los vencidos y los revocados.
 */
export interface MediPassAccess {
  /** El id de la sesión: es lo que se manda para cortarla (ENG-75). */
  id: string;
  /** El nombre que dio quien escaneó el código. */
  consultante: string;
  /** La matrícula, si la dio: es opcional (ENG-139). */
  matricula: string | null;
  /** ISO-8601. */
  desde: string;
  /** ISO-8601: cuándo se corta sola (ENG-104). */
  expiraEl: string;
  minutosRestantes: number;
}

/**
 * El bloque vital (ENG-103), lo único que ve quien escanea el código.
 *
 * Los opcionales son los que el paciente puede no tener cargados todavía
 * (ENG-136): la pantalla los omite en vez de mostrar un hueco.
 */
export interface VitalBlock {
  nombre: string;
  edad?: number | null;
  sexo?: string | null;
  grupoSanguineo?: string | null;
  pais?: string | null;
  alergias?: { que: string; gravedad: string }[] | null;
  medicacion?: { droga: string; dosis: string; nota?: string | null }[] | null;
  condiciones?: { nombre: string; codigo: string }[] | null;
  contacto?: { nombre: string; vinculo: string; telefono: string } | null;
}
