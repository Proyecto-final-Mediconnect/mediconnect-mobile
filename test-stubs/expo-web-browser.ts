/*
 * Stub de `expo-web-browser` para Vitest: abrir el navegador es nativo. Guarda
 * qué URLs se abrieron, para que los tests verifiquen que se entró a la sala
 * correcta.
 */
export const __abiertas: string[] = [];

/** Para los tests del error: la próxima apertura falla, como en un Android sin
 *  Custom Tabs. */
export const __control = { fallarProxima: false };

export enum WebBrowserPresentationStyle {
  FULL_SCREEN = 'fullScreen',
}

export async function openBrowserAsync(url: string): Promise<{ type: 'dismiss' }> {
  if (__control.fallarProxima) {
    __control.fallarProxima = false;
    throw new Error('No hay un navegador disponible');
  }
  __abiertas.push(url);
  return { type: 'dismiss' };
}
