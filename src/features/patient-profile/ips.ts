import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';

import { discardPickedFile } from '../patient-documents/lib/pick-file';
import type { VitalAllergy, VitalCondition, VitalMedication } from './types';
import { MAX_ROWS, type VitalForm } from './vital-info';

/**
 * Importar el resumen de salud IPS que dio otro centro (ENG-246, ADR-022): lo
 * mismo que la web. El backend lee el documento y propone; el paciente elige y
 * lo elegido se suma a su formulario de datos de emergencia.
 */

/** Lo que devuelve `POST /patients/me/ips/preview`. */
export interface IpsPreview {
  documento: {
    titulo: string | null;
    fecha: string | null;
    /** Si el DNI del documento es el del paciente. `null`: no se puede saber. */
    dniCoincide: boolean | null;
  };
  propuesta: {
    allergies: VitalAllergy[];
    medications: VitalMedication[];
    conditions: VitalCondition[];
  };
  vacunas: { vacuna: string; fecha: string | null }[];
  ignorados: string[];
}

export type IpsSeleccion = IpsPreview['propuesta'];

/** El body más grande que acepta el backend. */
export const MAX_IPS_BYTES = 100 * 1024;

export type IpsFileResult =
  | { status: 'read'; documento: unknown }
  | { status: 'canceled' }
  | { status: 'invalid'; message: string };

const NO_ES_JSON =
  'No pudimos leer el archivo. Tiene que ser el resumen de salud (IPS) en formato JSON que te dio tu centro de salud.';

/**
 * Elige el archivo y lo lee. La copia que deja el selector en el caché se borra
 * enseguida: son datos de salud y el caché no está cifrado.
 */
export async function pickIpsFile(): Promise<IpsFileResult> {
  const resultado = await DocumentPicker.getDocumentAsync({
    // Android suele informar un JSON como `application/octet-stream`: filtrar
    // por tipo lo escondería. Lo que no sea JSON se rechaza al leerlo.
    type: '*/*',
    copyToCacheDirectory: true,
    multiple: false,
  });
  const elegido = resultado.canceled ? undefined : resultado.assets[0];
  if (!elegido) return { status: 'canceled' };

  try {
    if ((elegido.size ?? 0) > MAX_IPS_BYTES) {
      return {
        status: 'invalid',
        message: 'El archivo es demasiado grande para un resumen de salud (máximo 100 kB).',
      };
    }
    const texto = await new File(elegido.uri).text();
    if (texto.length > MAX_IPS_BYTES) {
      return {
        status: 'invalid',
        message: 'El archivo es demasiado grande para un resumen de salud (máximo 100 kB).',
      };
    }
    return { status: 'read', documento: JSON.parse(texto) as unknown };
  } catch {
    return { status: 'invalid', message: NO_ES_JSON };
  } finally {
    discardPickedFile(elegido.uri);
  }
}

const clave = (s: string): string => s.trim().toLocaleLowerCase('es-AR');

/**
 * Suma lo elegido al formulario: **no borra ni reemplaza nada**, y lo que ya
 * estaba (mismo nombre, sin importar mayúsculas) no se repite. Se corta en el
 * máximo de filas que acepta el backend. Mismo criterio que la web.
 */
export function mergeIps(form: VitalForm, seleccion: IpsSeleccion): VitalForm {
  const sumar = <T>(actuales: T[], nuevos: T[], nombre: (t: T) => string): T[] => {
    const vistos = new Set(actuales.map((t) => clave(nombre(t))).filter(Boolean));
    const agregados = nuevos.filter((t) => {
      const k = clave(nombre(t));
      if (!k || vistos.has(k)) return false;
      vistos.add(k);
      return true;
    });
    return [...actuales, ...agregados].slice(0, MAX_ROWS);
  };

  return {
    ...form,
    allergies: sumar(
      form.allergies,
      seleccion.allergies.map((a) => ({ que: a.que, gravedad: a.gravedad ?? '' })),
      (a) => a.que,
    ),
    medications: sumar(
      form.medications,
      seleccion.medications.map((m) => ({
        droga: m.droga,
        dosis: m.dosis ?? '',
        nota: m.nota ?? '',
      })),
      (m) => m.droga,
    ),
    conditions: sumar(
      form.conditions,
      seleccion.conditions.map((c) => ({ nombre: c.nombre, codigo: c.codigo ?? '' })),
      (c) => c.nombre,
    ),
  };
}
