/** `GET /patients/me/summary` (ENG-198): el mismo contrato que usa la web. */
export interface PatientSummary {
  from: string;
  to: string;
  currency: string;
  consultas: { realizadas: number; profesionales: number };
  /** `porVenir`: turnos pagados que todavía no pasaron (se paga al reservar). */
  pagos: { pagado: number; reembolsado: number; neto: number; turnos: number; porVenir: number };
  accesos: { medipass: number; historiaClinica: number; total: number };
}
