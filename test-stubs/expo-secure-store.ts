/*
 * Stub de `expo-secure-store` para Vitest (ENG-114).
 *
 * El paquete real llama a un módulo nativo (Keychain / Keystore) que en jsdom no
 * existe. Acá es un `Map` en memoria con la misma API asíncrona, y
 * `__secureStore` deja que los tests lo inspeccionen y lo limpien.
 */

export type KeychainAccessibilityConstant = number;

export const AFTER_FIRST_UNLOCK = 0;
export const AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY = 1;
export const ALWAYS = 2;
export const WHEN_PASSCODE_SET_THIS_DEVICE_ONLY = 3;
export const ALWAYS_THIS_DEVICE_ONLY = 4;
export const WHEN_UNLOCKED = 5;
export const WHEN_UNLOCKED_THIS_DEVICE_ONLY = 6;

export interface SecureStoreOptions {
  keychainService?: string;
  keychainAccessible?: KeychainAccessibilityConstant;
  requireAuthentication?: boolean;
}

const items = new Map<string, string>();
let claveQueFalla: string | null = null;
let claveQueFallaAlBorrarUnaVez: string | null = null;
const clavesQueNoSeBorran = new Set<string>();

export const __secureStore = {
  items,
  /** Hace fallar la próxima escritura de esa clave, como un Keychain no disponible. */
  failNextWriteOf(key: string): void {
    claveQueFalla = key;
  },
  /** Hace fallar el próximo borrado de esa clave y después deja borrarla: un
   *  fallo pasajero, que el reintento tiene que resolver. */
  failNextDeleteOf(key: string): void {
    claveQueFallaAlBorrarUnaVez = key;
  },
  /** Hace fallar todos los borrados de esa clave: un Keychain que no deja
   *  limpiar el dispositivo. */
  failDeletesOf(key: string): void {
    clavesQueNoSeBorran.add(key);
  },
  reset(): void {
    items.clear();
    claveQueFalla = null;
    claveQueFallaAlBorrarUnaVez = null;
    clavesQueNoSeBorran.clear();
  },
};

export async function isAvailableAsync(): Promise<boolean> {
  return true;
}

export async function getItemAsync(key: string): Promise<string | null> {
  return items.get(key) ?? null;
}

export async function setItemAsync(key: string, value: string): Promise<void> {
  if (key === claveQueFalla) {
    claveQueFalla = null;
    throw new Error('Keychain no disponible');
  }
  items.set(key, value);
}

export async function deleteItemAsync(key: string): Promise<void> {
  if (clavesQueNoSeBorran.has(key)) throw new Error('Keychain no disponible');
  if (key === claveQueFallaAlBorrarUnaVez) {
    claveQueFallaAlBorrarUnaVez = null;
    throw new Error('Keychain no disponible');
  }
  items.delete(key);
}
