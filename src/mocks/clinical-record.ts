import type { ClinicalEntry, EntryAuthor } from '../features/clinical-records/types';
import { enArgentina } from '../shared/lib/argentina-time';
import { PACIENTE_DEMO } from './patient';

/**
 * Historia clínica de ejemplo de Marina Sosa, coherente con su MediPass:
 * fibrilación auricular paroxística con apixabán, hipertensión con enalapril y
 * alergia a la penicilina.
 *
 * Mezcla a propósito las dos formas que conviven en la base real —el
 * `ClinicalImpression` que escribe la app y los recursos del seed
 * (`Encounter`, `Condition`, `MedicationRequest`, `DiagnosticReport`)— y trae una
 * corrección, que es el caso que más cuesta mostrar bien (ENG-100).
 */

const OCAMPO: EntryAuthor = { firstName: 'Valeria', lastName: 'Ocampo' };
const GARCIA: EntryAuthor = { firstName: 'Ana', lastName: 'García' };

function hash(semilla: number): string {
  return Array.from({ length: 64 }, (_, i) => ((semilla * 31 + i * 7) % 16).toString(16)).join('');
}

function hace(ahora: Date, dias: number, hora: number): string {
  const d = new Date(ahora.getTime() - dias * 86_400_000);
  d.setUTCHours(hora + 3, 15, 0, 0);
  return d.toISOString();
}

export function crearHistoriaDemo(ahora: Date = new Date()): ClinicalEntry[] {
  const entradas: Omit<
    ClinicalEntry,
    'sequenceNumber' | 'contentHash' | 'previousHash' | 'patientId' | 'consultationId'
  >[] = [
    {
      id: 'hc-alergia',
      professionalId: 'pro-garcia',
      professional: GARCIA,
      entryType: 'DIAGNOSTICO',
      fhirResourceType: 'Condition',
      correctsEntryId: null,
      createdAt: hace(ahora, 210, 10),
      content: {
        resourceType: 'Condition',
        descripcion: 'Alergia a la penicilina (anafilaxia en 2009)',
        codigo: 'Z88.0',
        sistema: 'CIE-10',
        estado: 'Activo',
      },
    },
    {
      id: 'hc-palpitaciones',
      professionalId: 'pro-ocampo',
      professional: OCAMPO,
      entryType: 'CONSULTA',
      fhirResourceType: 'Encounter',
      correctsEntryId: null,
      createdAt: hace(ahora, 75, 11),
      content: {
        resourceType: 'Encounter',
        motivo: 'Palpitaciones de una semana de evolución',
        evolucion:
          'Episodios de 10 a 20 minutos, en reposo, sin síncope. Electrocardiograma en consultorio con ritmo sinusal.',
        diagnostico: 'Sospecha de fibrilación auricular paroxística',
        plan: 'Holter de 24 horas y laboratorio con función tiroidea.',
      },
    },
    {
      id: 'hc-holter',
      professionalId: 'pro-ocampo',
      professional: OCAMPO,
      entryType: 'ESTUDIO',
      fhirResourceType: 'DiagnosticReport',
      correctsEntryId: null,
      createdAt: hace(ahora, 68, 16),
      content: {
        resourceType: 'DiagnosticReport',
        estudio: 'Holter de 24 horas',
        hallazgos: 'Tres episodios de fibrilación auricular, el más largo de 42 minutos.',
        conclusion: 'Fibrilación auricular paroxística.',
      },
    },
    {
      id: 'hc-fa',
      professionalId: 'pro-ocampo',
      professional: OCAMPO,
      entryType: 'DIAGNOSTICO',
      fhirResourceType: 'Condition',
      correctsEntryId: null,
      createdAt: hace(ahora, 67, 10),
      content: {
        resourceType: 'Condition',
        descripcion: 'Fibrilación auricular paroxística',
        codigo: 'I48.0',
        sistema: 'CIE-10',
        estado: 'Activo',
      },
    },
    {
      id: 'hc-apixaban',
      professionalId: 'pro-ocampo',
      professional: OCAMPO,
      entryType: 'PRESCRIPCION',
      fhirResourceType: 'MedicationRequest',
      correctsEntryId: null,
      createdAt: hace(ahora, 67, 10),
      content: {
        resourceType: 'MedicationRequest',
        medicamento: 'Apixabán 5 mg',
        dosis: '1 comprimido',
        frecuencia: 'Cada 12 horas',
        duracion: 'Tratamiento crónico',
      },
    },
    {
      id: 'hc-holter-correccion',
      professionalId: 'pro-ocampo',
      professional: OCAMPO,
      entryType: 'CORRECCION',
      fhirResourceType: 'DiagnosticReport',
      correctsEntryId: 'hc-holter',
      createdAt: hace(ahora, 60, 9),
      content: {
        resourceType: 'DiagnosticReport',
        estudio: 'Holter de 24 horas',
        motivo_correccion:
          'El estudio se había cargado con la fecha del informe y no con la del registro.',
        fecha_real: enArgentina(new Date(ahora.getTime() - 70 * 86_400_000)).date,
        hallazgos: 'Tres episodios de fibrilación auricular, el más largo de 42 minutos.',
        conclusion: 'Fibrilación auricular paroxística.',
      },
    },
    {
      id: 'hc-control-presion',
      professionalId: 'pro-garcia',
      professional: GARCIA,
      entryType: 'CONSULTA',
      fhirResourceType: 'ClinicalImpression',
      correctsEntryId: null,
      createdAt: hace(ahora, 14, 9),
      content: {
        resourceType: 'ClinicalImpression',
        description: 'Control de presión arterial',
        summary: 'Tensión arterial de 150/95 en dos tomas separadas. Sin síntomas.',
        finding: [{ item: { concept: { text: 'Hipertensión arterial esencial' } } }],
        note: [
          { text: 'Enalapril 10 mg por día. Control en un mes con registro de presión en casa.' },
        ],
      },
    },
    {
      id: 'hc-hta',
      professionalId: 'pro-garcia',
      professional: GARCIA,
      entryType: 'DIAGNOSTICO',
      fhirResourceType: 'Condition',
      correctsEntryId: null,
      createdAt: hace(ahora, 14, 9),
      content: {
        resourceType: 'Condition',
        descripcion: 'Hipertensión arterial esencial',
        codigo: 'I10',
        sistema: 'CIE-10',
        estado: 'Activo',
      },
    },
    {
      id: 'hc-enalapril',
      professionalId: 'pro-garcia',
      professional: GARCIA,
      entryType: 'PRESCRIPCION',
      fhirResourceType: 'MedicationRequest',
      correctsEntryId: null,
      createdAt: hace(ahora, 14, 9),
      content: {
        resourceType: 'MedicationRequest',
        medicamento: 'Enalapril 10 mg',
        dosis: '1 comprimido',
        frecuencia: 'Una vez por día',
        duracion: 'Tratamiento crónico',
      },
    },
  ];

  // La cadena va hacia adelante, como la devuelve el backend.
  return entradas.map((entrada, i) => ({
    ...entrada,
    patientId: PACIENTE_DEMO.id,
    consultationId: null,
    sequenceNumber: i + 1,
    contentHash: hash(i + 1),
    previousHash: i === 0 ? '0'.repeat(64) : hash(i),
  }));
}
