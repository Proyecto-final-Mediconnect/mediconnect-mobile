import type { Availability, AvailabilityDay } from '../features/appointments/types';
import type {
  ProfessionalCard,
  PublicProfessionalProfile,
  Specialty,
} from '../features/catalog/types';
import { diaArgentino } from '../shared/lib/argentina-time';

/**
 * Catálogo de ejemplo para los tests (los sirve `src/test/patient-api.ts` con
 * MSW): los mismos profesionales que los turnos de ejemplo.
 */

export const ESPECIALIDADES: Specialty[] = [
  { id: 'esp-clinica', name: 'Clínica médica' },
  { id: 'esp-cardio', name: 'Cardiología' },
  { id: 'esp-derma', name: 'Dermatología' },
];

const [CLINICA, CARDIO, DERMA] = ESPECIALIDADES as [Specialty, Specialty, Specialty];

export const PROFESIONALES: ProfessionalCard[] = [
  {
    id: 'pro-ocampo',
    firstName: 'Valeria',
    lastName: 'Ocampo',
    photoUrl: null,
    primarySpecialty: CLINICA,
    specialties: [CLINICA],
    price: 18_500,
    currency: 'ARS',
  },
  {
    id: 'pro-olivares',
    firstName: 'Martín',
    lastName: 'Olivares',
    photoUrl: null,
    primarySpecialty: CARDIO,
    specialties: [CARDIO],
    price: 42_000,
    currency: 'ARS',
  },
  {
    id: 'pro-ruiz',
    firstName: 'Carolina',
    lastName: 'Ruiz',
    photoUrl: null,
    primarySpecialty: DERMA,
    specialties: [DERMA],
    price: 24_000,
    currency: 'ARS',
  },
];

export function perfilDe(id: string): PublicProfessionalProfile | undefined {
  const p = PROFESIONALES.find((x) => x.id === id);
  if (!p) return undefined;
  return {
    id: p.id,
    firstName: p.firstName,
    lastName: p.lastName,
    photoUrl: p.photoUrl,
    bio: `${p.firstName} atiende por videoconsulta de lunes a viernes.`,
    specialties: p.specialties,
    education: [
      {
        id: `edu-${p.id}`,
        institution: 'Universidad Nacional de Córdoba',
        degree: 'Médica/o',
        year: 2012,
      },
    ],
    price: p.price,
    currency: p.currency,
    // El default del backend (ENG-67), para un profesional que no la configuró.
    cancellationPolicy: { hoursFullRefund: 24, hoursPartialRefund: 6, partialRefundPercent: 50 },
  };
}

/**
 * Disponibilidad de ejemplo: hoy sin lugar, y a partir de mañana tres horarios
 * por día, el primero ya reservado.
 */
export function disponibilidadDe(id: string, from: string, ahora: Date = new Date()): Availability {
  const p = PROFESIONALES.find((x) => x.id === id) ?? PROFESIONALES[0]!;
  const days: AvailabilityDay[] = Array.from({ length: 14 }, (_, i) => ({
    date: diaArgentino(ahora, i),
    weekday: 1,
    fullyBlocked: false,
    slots:
      i === 0
        ? [{ startTime: '09:00', durationMinutes: 30, status: 'PAST' }]
        : [
            { startTime: '09:00', durationMinutes: 30, status: 'BOOKED' },
            { startTime: '09:30', durationMinutes: 30, status: 'AVAILABLE' },
            { startTime: '10:00', durationMinutes: 30, status: 'AVAILABLE' },
          ],
  }));
  return {
    professional: {
      id: p.id,
      firstName: p.firstName,
      lastName: p.lastName,
      consultationPrice: p.price,
      currency: p.currency,
    },
    from,
    to: days[days.length - 1]!.date,
    days,
  };
}
