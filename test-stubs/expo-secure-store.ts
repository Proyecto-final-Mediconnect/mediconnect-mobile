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

export const __secureStore = {
  items,
  /** Hace fallar la próxima escritura de esa clave, como un Keychain no disponible. */
  failNextWriteOf(key: string): void {
    claveQueFalla = key;
  },
  reset(): void {
    items.clear();
    claveQueFalla = null;
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
  items.delete(key);
}
