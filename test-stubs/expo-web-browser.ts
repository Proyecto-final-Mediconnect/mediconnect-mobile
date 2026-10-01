/*
 * Stub de `expo-web-browser` para Vitest: abrir el navegador es nativo. Guarda
 * qué URLs se abrieron, para que los tests verifiquen que se entró a la sala
 * correcta.
 */
export const __abiertas: string[] = [];

export enum WebBrowserPresentationStyle {
  FULL_SCREEN = 'fullScreen',
}

export async function openBrowserAsync(url: string): Promise<{ type: 'dismiss' }> {
  __abiertas.push(url);
  return { type: 'dismiss' };
}
