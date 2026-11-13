import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';

import type { PickedFile } from '../types';
import { fileNameFor, fileProblem, mimeTypeOf } from './document-file';

/*
 * Las tres formas de elegir el archivo. Las dos librerías andan en Expo Go, así
 * que no hace falta un build propio para probarlo.
 */

export type PickSource = 'camera' | 'gallery' | 'pdf';

export type PickResult =
  | { status: 'picked'; file: PickedFile }
  | { status: 'canceled' }
  /** No dio el permiso: hay que explicarle cómo darlo desde los ajustes. */
  | { status: 'denied'; message: string }
  /** El archivo no se puede subir (tipo o tamaño): se dice antes de llenar el formulario. */
  | { status: 'invalid'; message: string };

/**
 * Foto comprimida a JPEG. Un estudio en papel sacado con la cámara pesa entre 3
 * y 8 MB a calidad máxima; a 0.7 queda en un par de MB y sigue legible.
 *
 * `quality` también es lo que hace que el picker reescriba la imagen como JPEG:
 * así la HEIC de un iPhone llega como JPG. Para la galería, además, `Compatible`
 * le pide a iOS la versión transcodificada en lugar del original.
 */
const OPCIONES_FOTO: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  quality: 0.7,
  exif: false,
  preferredAssetRepresentationMode:
    ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
};

const SIN_CAMARA =
  'Para sacar la foto, MediConnect necesita usar la cámara. Podés habilitarla desde los ajustes del teléfono, o elegir una foto de la galería.';

export async function pickFile(source: PickSource): Promise<PickResult> {
  if (source === 'pdf') return elegirPdf();

  if (source === 'camera') {
    // La galería no pide permiso: el selector del sistema (PHPicker, Photo
    // Picker) solo le pasa a la app la foto elegida. La cámara sí.
    const permiso = await ImagePicker.requestCameraPermissionsAsync();
    if (!permiso.granted) return { status: 'denied', message: SIN_CAMARA };
  }

  const resultado =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync(OPCIONES_FOTO)
      : await ImagePicker.launchImageLibraryAsync(OPCIONES_FOTO);
  const foto = resultado.canceled ? undefined : resultado.assets[0];
  if (!foto) return { status: 'canceled' };

  const mimeType = mimeTypeOf(foto.fileName ?? foto.uri, foto.mimeType);
  return validar({
    uri: foto.uri,
    name: fileNameFor(foto.fileName, mimeType),
    mimeType,
    sizeBytes: foto.fileSize ?? null,
  });
}

async function elegirPdf(): Promise<PickResult> {
  const resultado = await DocumentPicker.getDocumentAsync({
    type: 'application/pdf',
    // Sin la copia, en Android la URI es un `content://` que puede dejar de
    // valer antes de que el paciente termine el formulario.
    copyToCacheDirectory: true,
    multiple: false,
  });
  const pdf = resultado.canceled ? undefined : resultado.assets[0];
  if (!pdf) return { status: 'canceled' };

  return validar({
    uri: pdf.uri,
    name: pdf.name,
    mimeType: mimeTypeOf(pdf.name, pdf.mimeType),
    sizeBytes: pdf.size ?? null,
  });
}

function validar(elegido: PickedFile): PickResult {
  // Algunos pickers no informan el tamaño (`fileSize` es opcional, y ciertos
  // `content://` de Android): se lee del disco, sin abrir el archivo, para que
  // el tope de 10 MB se chequee antes de mandarlo entero por datos móviles.
  const file =
    elegido.sizeBytes === null ? { ...elegido, sizeBytes: tamanoEnDisco(elegido.uri) } : elegido;
  const problema = fileProblem(file);
  if (problema) discardPickedFile(file.uri);
  return problema ? { status: 'invalid', message: problema } : { status: 'picked', file };
}

function tamanoEnDisco(uri: string): number | null {
  try {
    const archivo = new File(uri);
    return archivo.exists ? archivo.size : null;
  } catch {
    return null;
  }
}

/**
 * Borra la copia que los pickers dejan en el caché de la app (el PDF con
 * `copyToCacheDirectory`, la foto recomprimida a JPEG). Son datos médicos y el
 * caché no está cifrado: no tienen que quedar ahí después de subirlos o de
 * arrepentirse. Solo toca el caché propio, nunca el original del paciente.
 */
export function discardPickedFile(uri: string): void {
  if (!uri.startsWith(Paths.cache.uri)) return;
  try {
    const archivo = new File(uri);
    if (archivo.exists) archivo.delete();
  } catch {
    // Si no se puede borrar, lo limpia el sistema cuando necesita espacio.
  }
}
