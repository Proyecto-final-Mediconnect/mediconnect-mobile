import { http, HttpResponse } from 'msw';

import type { PatientProfile } from '../features/patient-profile/types';
import { turnosDemo } from '../mocks/appointments';
import { crearHistoriaDemo } from '../mocks/clinical-record';
import { PACIENTE_DEMO } from '../mocks/patient';
import { API_URL, server } from './msw-server';

export const FICHA: PatientProfile = {
  profileId: PACIENTE_DEMO.id,
  firstName: PACIENTE_DEMO.firstName,
  lastName: PACIENTE_DEMO.lastName,
  birthDate: PACIENTE_DEMO.birthDate,
  dni: PACIENTE_DEMO.dni,
  phone: PACIENTE_DEMO.phone,
  completed: true,
};

/**
 * El backend del paciente de los tests, servido con MSW a partir de los datos
 * de ejemplo: turnos (con la cancelación, que cambia la lista), su historia
 * clínica y su ficha. La HC responde solo para su propio id: si la app la pidiera
 * con otro, el request no tendría handler y el test fallaría.
 */
export function servirDatosDelPaciente(): void {
  server.use(
    http.get(`${API_URL}/appointments/me`, () => HttpResponse.json(turnosDemo.listar())),
    http.patch(`${API_URL}/appointments/:id/cancel`, ({ params }) =>
      HttpResponse.json(turnosDemo.cancelar(String(params.id))),
    ),
    http.get(`${API_URL}/patients/${PACIENTE_DEMO.id}/clinical-record`, () =>
      HttpResponse.json(crearHistoriaDemo()),
    ),
    http.get(`${API_URL}/patients/me`, () => HttpResponse.json(FICHA)),
  );
}
