/*
 * Stub de `expo-image-picker` para Vitest: la cámara y la galería son nativas.
 * Cada test dice qué devuelve la próxima apertura (`__fotos.proxima`) y si el
 * paciente da el permiso de la cámara; el stub guarda con qué opciones se abrió.
 */

export enum UIImagePickerPreferredAssetRepresentationMode {
  Automatic = 'automatic',
  Compatible = 'compatible',
  Current = 'current',
}

export interface ImagePickerAsset {
  uri: string;
  width: number;
  height: number;
  fileName?: string | null;
  fileSize?: number;
  mimeType?: string;
}

export type ImagePickerResult =
  { canceled: false; assets: ImagePickerAsset[] } | { canceled: true; assets: null };

export type ImagePickerOptions = Record<string, unknown>;

const FOTO: ImagePickerAsset = {
  uri: 'file:///cache/ImagePicker/estudio.jpg',
  width: 1200,
  height: 1600,
  fileName: null,
  fileSize: 1_800_000,
  mimeType: 'image/jpeg',
};

export const __fotos = {
  /** `null`: el paciente cerró la cámara sin sacar nada. */
  proxima: FOTO as ImagePickerAsset | null,
  permisoCamara: true,
  /** Las opciones de cada apertura, en orden. */
  aperturas: [] as { origen: 'camera' | 'gallery'; opciones?: ImagePickerOptions }[],
  reiniciar(): void {
    this.proxima = FOTO;
    this.permisoCamara = true;
    this.aperturas.length = 0;
  },
};

function resultado(): ImagePickerResult {
  return __fotos.proxima
    ? { canceled: false, assets: [__fotos.proxima] }
    : { canceled: true, assets: null };
}

export async function requestCameraPermissionsAsync(): Promise<{
  granted: boolean;
  canAskAgain: boolean;
}> {
  return { granted: __fotos.permisoCamara, canAskAgain: false };
}

export async function launchCameraAsync(opciones?: ImagePickerOptions): Promise<ImagePickerResult> {
  __fotos.aperturas.push({ origen: 'camera', opciones });
  return resultado();
}

export async function launchImageLibraryAsync(
  opciones?: ImagePickerOptions,
): Promise<ImagePickerResult> {
  __fotos.aperturas.push({ origen: 'gallery', opciones });
  return resultado();
}
