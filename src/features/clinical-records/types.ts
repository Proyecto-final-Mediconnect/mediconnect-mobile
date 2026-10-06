/**
 * Historia clínica (EP-06), portada de `mediconnect-web`. Espeja lo que devuelve
 * `GET /patients/:id/clinical-record`.
 *
 * Solo el lado de lectura: en mobile la HC no se escribe (ENG-116). Cargar
 * entradas es del profesional y queda en la web.
 */

export const ENTRY_TYPE_LABELS: Record<string, string> = {
  CONSULTA: 'Consulta',
  DIAGNOSTICO: 'Diagnóstico',
  PRESCRIPCION: 'Prescripción',
  ESTUDIO: 'Estudio',
  CORRECCION: 'Corrección',
};

/** Autor del asiento, tal como lo resuelve el backend (ENG-59). */
export interface EntryAuthor {
  firstName: string;
  lastName: string;
}

export interface ClinicalEntry {
  id: string;
  patientId: string;
  professionalId: string;
  /**
   * Quién firmó el asiento. `null` si el profesional no tiene perfil cargado —
   * la entrada se muestra igual: es una historia clínica, y perder el nombre es
   * mejor que perder el registro.
   */
  professional: EntryAuthor | null;
  /** Posición en la cadena de hash del paciente. Arranca en 1. */
  sequenceNumber: number;
  entryType: string;
  fhirResourceType: string;
  content: unknown;
  consultationId: string | null;
  /** Entrada que esta corrige, si es una corrección (ENG-100). */
  correctsEntryId: string | null;
  /** ISO-8601. Lo fija el servidor al sellar: entra al hash. */
  createdAt: string;
  contentHash: string;
  previousHash: string;
}
