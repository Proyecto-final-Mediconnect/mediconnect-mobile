import { http, HttpResponse } from 'msw';

import type { PatientProfile } from '../features/patient-profile/types';
import { turnosDemo } from '../mocks/appointments';
import { refundPercentFor } from '../features/cancellation-policy/policy';
import { matchesSearch } from '../features/catalog/lib/catalog';
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
/** La política default del backend, que es la que tienen guardada los turnos de ejemplo. */
const POLITICA_DEMO = { hoursFullRefund: 24, hoursPartialRefund: 6, partialRefundPercent: 50 };

/** Lo que devolvería el backend al cancelar ahora (ENG-65): solo un turno pagado. */
function cotizar(id: string): { percent: number; amount: number } | null {
  const turno = turnosDemo.listar().find((t) => t.id === id);
  if (!turno) return null;
  const percent =
    turno.status === 'CONFIRMADO'
      ? refundPercentFor(POLITICA_DEMO, new Date(turno.scheduledAt), new Date())
      : 0;
  return { percent, amount: (turno.price * percent) / 100 };
}

export function servirDatosDelPaciente(): void {
  server.use(
    http.get(`${API_URL}/appointments/me`, () => HttpResponse.json(turnosDemo.listar())),
    http.get(`${API_URL}/appointments/:id/cancellation-quote`, ({ params }) => {
      const cotizacion = cotizar(String(params.id));
      return cotizacion
        ? HttpResponse.json({ ...cotizacion, status: null })
        : HttpResponse.json({ message: 'No encontramos ese turno.' }, { status: 404 });
    }),
    http.patch(`${API_URL}/appointments/:id/cancel`, ({ params }) => {
      const cotizacion = cotizar(String(params.id)) ?? { percent: 0, amount: 0 };
      return HttpResponse.json({
        ...turnosDemo.cancelar(String(params.id)),
        refund: { ...cotizacion, status: cotizacion.percent > 0 ? 'PROCESADO' : null },
      });
    }),
    // El estado del pago, para el detalle del turno: los confirmados se pagaron.
    http.get(`${API_URL}/appointments/:id/payment`, ({ params }) => {
      const turno = turnosDemo.listar().find((t) => t.id === params.id);
      const pago = ['CONFIRMADO', 'COMPLETADO'].includes(turno?.status ?? '')
        ? 'APROBADO'
        : 'SIN_INICIAR';
      return HttpResponse.json({
        appointmentId: params.id,
        status: pago,
        appointmentStatus: turno?.status,
      });
    }),
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
      const busqueda = url.searchParams.get('search') ?? '';
      const data = PROFESIONALES.filter(
        (p) =>
          matchesSearch(p, busqueda) &&
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
