/** Respuesta de `GET /patients/me`. Mismo tipo que `PatientProfile` del backend. */
export interface PatientProfile {
  profileId: string;
  firstName: string | null;
  lastName: string | null;
  /** `AAAA-MM-DD`: fecha de calendario, sin hora ni zona. */
  birthDate: string | null;
  dni: string | null;
  phone: string | null;
  /** `false` mientras el paciente no cargó su ficha desde la web. */
  completed: boolean;
}
