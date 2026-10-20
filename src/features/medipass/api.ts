import { conDemora } from '../../mocks/demo';
import { accesosDemo, VITAL_DEMO } from '../../mocks/medipass';
import type { MediPassAccess, VitalBlock } from './types';

/*
 * API del MediPass. Hoy sale de los datos de ejemplo: el backend no tiene rutas
 * todavía (Release 3). Las que harían falta, las mismas que anota la web:
 *   fetchVitalBlock  → GET    /medipass/me/vital
 *   fetchAccesses    → GET    /medipass/me/accesses       (ENG-74)
 *   revokeAccess     → DELETE /medipass/me/accesses/:id   (ENG-75)
 * El código rotatorio (ENG-72) tampoco sale de acá: se genera en memoria.
 */

export function fetchVitalBlock(): Promise<VitalBlock> {
  return conDemora(VITAL_DEMO);
}

export function fetchAccesses(): Promise<MediPassAccess[]> {
  return conDemora(accesosDemo.listar());
}

export function revokeAccess(id: string): Promise<MediPassAccess> {
  return conDemora(accesosDemo.revocar(id));
}
