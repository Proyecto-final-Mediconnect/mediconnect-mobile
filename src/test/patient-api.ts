import { http, HttpResponse } from 'msw';

import type { PatientProfile } from '../features/patient-profile/types';
import { turnosDemo } from '../mocks/appointments';
import { disponibilidadDe, ESPECIALIDADES, perfilDe, PROFESIONALES } from '../mocks/catalog';
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
    // Catálogo y reserva (ENG-132, ENG-133).
    http.get(`${API_URL}/specialties`, () => HttpResponse.json(ESPECIALIDADES)),
    http.get(`${API_URL}/catalog/professionals`, ({ request }) => {
      const url = new URL(request.url);
      const especialidades = url.searchParams.getAll('specialtyId');
      const tope = url.searchParams.get('maxPrice');
      const data = PROFESIONALES.filter(
        (p) =>
          (especialidades.length === 0 ||
            p.specialties.some((e) => especialidades.includes(e.id))) &&
          (tope === null || (p.price !== null && p.price <= Number(tope))),
      );
      return HttpResponse.json({
        data,
        meta: { page: 1, limit: 20, total: data.length, totalPages: 1, hasNextPage: false },
      });
    }),
    http.get(`${API_URL}/professionals/:id/availability`, ({ params, request }) =>
      HttpResponse.json(
        disponibilidadDe(String(params.id), new URL(request.url).searchParams.get('from') ?? ''),
      ),
    ),
    http.get(`${API_URL}/professionals/:id`, ({ params }) => {
      const perfil = perfilDe(String(params.id));
      return perfil
        ? HttpResponse.json(perfil)
        : HttpResponse.json({ message: 'Ese profesional no existe.' }, { status: 404 });
    }),
    http.post(`${API_URL}/appointments`, async ({ request }) => {
      const body = (await request.json()) as {
        professionalId: string;
        date: string;
        startTime: string;
      };
      const p = PROFESIONALES.find((x) => x.id === body.professionalId)!;
      return HttpResponse.json(
        turnosDemo.reservar(
          { id: p.id, firstName: p.firstName, lastName: p.lastName },
          body.date,
          body.startTime,
          p.price ?? 0,
        ),
        { status: 201 },
      );
    }),
  );
}
