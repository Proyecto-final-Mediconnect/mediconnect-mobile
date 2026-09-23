import { crearHistoriaDemo } from '../../mocks/clinical-record';
import { conDemora } from '../../mocks/demo';
import type { ClinicalEntry } from './types';

/*
 * API de la historia clínica. Hoy sale de los datos de ejemplo (ver
 * `src/mocks/demo.ts`).
 *
 * Con la sesión de ENG-114 pasa a `GET /patients/:id/clinical-record` con el id
 * del paciente de la sesión, nunca uno que venga de otro lado: es lo que
 * garantiza que la app no ofrezca un camino para pedir la HC de otra persona
 * (ENG-116). El backend además lo impide con RLS.
 */

export function fetchMyClinicalRecord(): Promise<ClinicalEntry[]> {
  return conDemora(crearHistoriaDemo());
}
