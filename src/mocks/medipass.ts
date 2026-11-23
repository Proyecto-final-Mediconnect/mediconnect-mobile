import type {
  MediPassAccess,
  MediPassCode,
  MediPassHistory,
  VitalBlock,
} from '../features/medipass/types';
/** Cada cuánto rota el código en el backend (ENG-72): lo que informa `GET /config`. */
const ROTACION_MS = 5 * 60_000;

/**
 * MediPass de ejemplo para los tests: lo que contesta el backend falso (MSW).
 * Mismos datos que la historia clínica de ejemplo —fibrilación auricular,
 * apixabán, alergia a la penicilina—.
 */

/** El código de la ventana de 5 minutos en curso, como lo emite `GET /medipass/me`. */
export function codigoDemo(ahora: Date = new Date()): MediPassCode {
  const ventana = Math.floor(ahora.getTime() / ROTACION_MS);
  const sufijo = ((ventana * 2654435761) >>> 0).toString(16).toUpperCase().padStart(8, '0');
  return {
    codigo: sufijo.slice(0, 8),
    expiraEl: new Date((ventana + 1) * ROTACION_MS).toISOString(),
  };
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
  const acceso = (
    id: string,
    consultante: string,
    matricula: string | null,
    desdeMin: number,
    quedanMin: number,
  ): MediPassAccess => ({
    id,
    consultante,
    matricula,
    desde: new Date(ahora.getTime() - desdeMin * 60_000).toISOString(),
    expiraEl: new Date(ahora.getTime() + quedanMin * 60_000).toISOString(),
    minutosRestantes: quedanMin,
  });
  return [
    acceso('11111111-1111-4111-8111-111111111111', 'Dra. Valeria Ocampo', 'MP 45120', 6, 24),
    acceso('22222222-2222-4222-8222-222222222222', 'Guardia Hospital Italiano', null, 27, 3),
  ];
}

let accesos = crearAccesos(new Date());

/** Los accesos abiertos del paciente de ejemplo. Revocar los saca de la lista, como el backend. */
export const accesosDemo = {
  listar: (): MediPassAccess[] => accesos.map((a) => ({ ...a })),
  revocar(id: string): void {
    accesos = accesos.filter((a) => a.id !== id);
  },
  reiniciar(ahora?: Date): void {
    accesos = crearAccesos(ahora ?? new Date());
  },
};

/**
 * El historial de ejemplo (`GET /medipass/me/historial`): uno abierto ahora,
 * uno que se cerró solo y uno que el paciente cortó. Con otros nombres que los
 * accesos de ahora, para que los tests no los confundan.
 */
export function historialDemo(ahora: Date = new Date()): MediPassHistory {
  const hace = (min: number) => new Date(ahora.getTime() - min * 60_000).toISOString();
  return {
    pagina: 1,
    hayMas: false,
    accesos: [
      {
        sesionId: 'h1',
        consultante: { nombre: 'Dra. Laura Méndez', matricula: 'MP 33210' },
        origen: 'CODIGO',
        inicio: hace(6),
        vence: hace(-24),
        revocadoEl: null,
        estado: 'ACTIVO',
        vistas: [{ recurso: 'VITAL', etiqueta: 'Datos vitales', el: hace(6) }],
      },
      {
        sesionId: 'h2',
        consultante: { nombre: 'Guardia Sanatorio Allende', matricula: null },
        origen: 'TARJETA',
        inicio: hace(60 * 26),
        vence: hace(60 * 26 - 30),
        revocadoEl: null,
        estado: 'VENCIDO',
        vistas: [],
      },
      {
        sesionId: 'h3',
        consultante: { nombre: 'Dr. Martín Pérez', matricula: 'MP 11111' },
        origen: 'CODIGO',
        inicio: hace(60 * 50),
        vence: hace(60 * 50 - 30),
        revocadoEl: hace(60 * 50 - 4),
        estado: 'REVOCADO',
        vistas: [],
      },
    ],
  };
}
