import { http, HttpResponse } from 'msw';

import type { PatientProfile } from '../features/patient-profile/types';
import { turnosDemo } from '../mocks/appointments';
import { refundPercentFor } from '../features/cancellation-policy/policy';
import { matchesSearch } from '../features/catalog/lib/catalog';
import { disponibilidadDe, ESPECIALIDADES, perfilDe, PROFESIONALES } from '../mocks/catalog';
import { crearHistoriaDemo } from '../mocks/clinical-record';
import { accesosDemo, codigoDemo, VITAL_DEMO } from '../mocks/medipass';
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

/** La ficha que devuelve el backend falso; guardar los datos vitales la cambia. */
let ficha: PatientProfile = FICHA;

const TODO_VISIBLE = {
  grupoSanguineo: true,
  alergias: true,
  medicacion: true,
  condiciones: true,
  contacto: true,
};
/** Qué ve un consultante externo (ENG-149); arranca todo visible. */
let scope = TODO_VISIBLE;

/** La tarjeta de emergencia del paciente de ejemplo (ENG-176): arranca sin ninguna. */
let tarjetaActiva: string | null = null;
export const TARJETA_DEMO = 'Ab3_-Ab3_-Ab3_-Ab3_-Ab3_-Ab3_-Ab3_-Ab3_-Ab3';

export function servirDatosDelPaciente(): void {
  ficha = FICHA;
  scope = TODO_VISIBLE;
  tarjetaActiva = null;
  server.use(
    http.get(`${API_URL}/medipass/me/emergency-card`, () =>
      HttpResponse.json({ activa: tarjetaActiva !== null, creadaEl: tarjetaActiva }),
    ),
    http.post(`${API_URL}/medipass/me/emergency-card`, () => {
      tarjetaActiva = '2026-11-04T15:00:00.000Z';
      return HttpResponse.json({ tarjeta: TARJETA_DEMO, creadaEl: tarjetaActiva }, { status: 201 });
    }),
    http.delete(`${API_URL}/medipass/me/emergency-card`, () => {
      tarjetaActiva = null;
      return new HttpResponse(null, { status: 204 });
    }),
    http.get(`${API_URL}/appointments/me`, () => HttpResponse.json(turnosDemo.listar())),
    http.get(`${API_URL}/medipass/me`, () => HttpResponse.json(codigoDemo())),
    http.get(`${API_URL}/medipass/me/vital`, () => HttpResponse.json(VITAL_DEMO)),
    http.get(`${API_URL}/medipass/me/accesses`, () => HttpResponse.json(accesosDemo.listar())),
    http.get(`${API_URL}/medipass/me/scope`, () => HttpResponse.json(scope)),
    http.put(`${API_URL}/medipass/me/scope`, async ({ request }) => {
      scope = (await request.json()) as typeof scope;
      return HttpResponse.json(scope);
    }),
    http.delete(`${API_URL}/medipass/me/accesses/:id`, ({ params }) => {
      accesosDemo.revocar(String(params.id));
      return new HttpResponse(null, { status: 204 });
    }),
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
    http.get(`${API_URL}/patients/me`, () => HttpResponse.json(ficha)),
    // Reemplaza el bloque vital entero, como el backend (ENG-136).
    http.put(`${API_URL}/patients/me/vital`, async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>;
      ficha = {
        ...FICHA,
        sex: null,
        bloodType: null,
        allergies: null,
        medications: null,
        conditions: null,
        emergencyContact: null,
        ...body,
      };
      return HttpResponse.json(ficha);
    }),
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
    // Reseñas (ENG-80, ENG-82): por defecto la paciente no dejó ninguna y los
    // profesionales no tienen; los tests de reseñas declaran las suyas.
    http.get(`${API_URL}/reviews/me`, () => HttpResponse.json([])),
    http.get(`${API_URL}/professionals/:id/reviews`, () =>
      HttpResponse.json({ reviews: [], rating: null, page: 1, hasMore: false }),
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
