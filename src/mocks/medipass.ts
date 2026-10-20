import type { MediPassAccess, VitalBlock } from '../features/medipass/types';
import { ROTACION_MS } from '../features/medipass/lib/medipass';

/**
 * MediPass de ejemplo. Mismos datos que la web y que la historia clínica de
 * ejemplo —fibrilación auricular, apixabán, alergia a la penicilina—.
 *
 * El backend del MediPass no existe todavía: las tablas sí (`medipass_codes`,
 * `medipass_sessions`, `medipass_access_logs`), pero no hay rutas. Lo que falta
 * está listado en `mediconnect-web/src/features/medipass/lib/mockMediPass.ts`.
 */

const PREFIJO = 'MP-AR-8F42';

/**
 * El código de la ventana de 5 minutos en curso (ENG-72). Cambia con la
 * ventana para que se vea rotar; el de verdad lo emite el servidor y **nunca se
 * guarda en el teléfono** (ENG-117): vive en memoria mientras se muestra.
 */
export function codigoDeVentana(ahora: Date): string {
  const ventana = Math.floor(ahora.getTime() / ROTACION_MS);
  const sufijo = ((ventana * 2654435761) >>> 0).toString(16).toUpperCase().padStart(8, '0');
  return `${PREFIJO}-${sufijo.slice(0, 4)}`;
}

export const VITAL_DEMO: VitalBlock = {
  nombre: 'Marina Sosa',
  edad: 41,
  sexo: 'Femenino',
  grupoSanguineo: '0 Rh+',
  pais: 'Argentina',
  alergias: [{ que: 'Penicilina', gravedad: 'Anafilaxia' }],
  medicacion: [
    { droga: 'Apixabán 5 mg', dosis: 'Cada 12 horas', nota: 'Anticoagulada' },
    { droga: 'Enalapril 10 mg', dosis: 'Una vez por día' },
  ],
  condiciones: [
    { nombre: 'Fibrilación auricular paroxística', codigo: 'CIE-10 I48' },
    { nombre: 'Hipertensión arterial esencial', codigo: 'CIE-10 I10' },
  ],
  contacto: { nombre: 'Julián Sosa', vinculo: 'Hermano', telefono: '+54 351 555 2210' },
};

function crearAccesos(ahora: Date): MediPassAccess[] {
  return [
    {
      id: 'acc-ocampo',
      quien: 'Dra. Valeria Ocampo',
      contexto: 'Cardiología · desde su consultorio',
      desde: new Date(ahora.getTime() - 6 * 60_000).toISOString(),
      expiraEl: new Date(ahora.getTime() + 24 * 60_000).toISOString(),
      alcance: ['VITAL', 'CONDICIONES', 'NOTAS'],
      revocadoEl: null,
    },
    {
      id: 'acc-guardia',
      quien: 'Guardia · Hospital Italiano',
      contexto: 'Entró con tu código',
      desde: new Date(ahora.getTime() - 27 * 60_000).toISOString(),
      expiraEl: new Date(ahora.getTime() + 3 * 60_000).toISOString(),
      matricula: 'MN 98211',
      alcance: ['VITAL'],
      revocadoEl: null,
    },
  ];
}

let accesos = crearAccesos(new Date());

export const accesosDemo = {
  listar: (): MediPassAccess[] => accesos.map((a) => ({ ...a })),
  /** Revocar no borra: marca. Un acceso que desaparece no deja rastro de que existió. */
  revocar(id: string, ahora: Date = new Date()): MediPassAccess {
    const actual = accesos.find((a) => a.id === id);
    if (!actual) throw new Error('Ese acceso ya no existe.');
    const revocado = { ...actual, revocadoEl: ahora.toISOString(), expiraEl: ahora.toISOString() };
    accesos = accesos.map((a) => (a.id === id ? revocado : a));
    return revocado;
  },
  reiniciar(ahora?: Date): void {
    accesos = crearAccesos(ahora ?? new Date());
  },
};
