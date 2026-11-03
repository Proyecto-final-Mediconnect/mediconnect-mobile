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
  /* Datos de emergencia del MediPass (ENG-134, ENG-136). */
  sex?: string | null;
  bloodType?: string | null;
  allergies?: VitalAllergy[] | null;
  medications?: VitalMedication[] | null;
  conditions?: VitalCondition[] | null;
  emergencyContact?: VitalContact | null;
}

export interface VitalAllergy {
  que: string;
  gravedad?: string;
}
export interface VitalMedication {
  droga: string;
  dosis?: string;
  nota?: string;
}
export interface VitalCondition {
  nombre: string;
  codigo?: string;
}
export interface VitalContact {
  nombre: string;
  vinculo?: string;
  telefono: string;
}

/** `PUT /patients/me/vital`: reemplaza el bloque entero; lo que no viene queda vacío. */
export interface VitalInfoInput {
  sex?: string;
  bloodType?: string;
  allergies?: VitalAllergy[];
  medications?: VitalMedication[];
  conditions?: VitalCondition[];
  emergencyContact?: VitalContact;
}

export const BLOOD_TYPES = ['0+', '0-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'] as const;
export const SEXES = ['Femenino', 'Masculino', 'Otro'] as const;
