/*
 * Stub de `expo-web-browser` para Vitest: abrir el navegador es nativo. Guarda
 * qué URLs se abrieron, para que los tests verifiquen que se entró a la sala
 * correcta.
 */
export const __abiertas: string[] = [];

/** Para los tests del error: la próxima apertura falla, como en un Android sin
 *  Custom Tabs. */
export const __control = {
  fallarProxima: false,
  /** Cómo termina la próxima sesión del checkout (`success` si no se pisa). */
  resultadoProximo: null as string | null,
};

export enum WebBrowserPresentationStyle {
  FULL_SCREEN = 'fullScreen',
}

export enum WebBrowserResultType {
  CANCEL = 'cancel',
  DISMISS = 'dismiss',
  OPENED = 'opened',
  LOCKED = 'locked',
}

/**
 * La sesión del checkout (ENG-172). Los tests la ven como una apertura más: lo
 * que importa es a qué URL se fue y adónde se espera volver.
 */
export const __vueltas: string[] = [];

export async function openAuthSessionAsync(
  url: string,
  redirectUrl: string,
): Promise<{ type: WebBrowserResultType | 'success'; url?: string }> {
  if (__control.fallarProxima) {
    __control.fallarProxima = false;
    throw new Error('No hay un navegador disponible');
  }
  __abiertas.push(url);
  __vueltas.push(redirectUrl);
  const tipo = __control.resultadoProximo;
  if (tipo) {
    __control.resultadoProximo = null;
    return { type: tipo as WebBrowserResultType };
  }
  return { type: 'success', url: `${redirectUrl}/turno?resultado=exito` };
}

export async function openBrowserAsync(url: string): Promise<{ type: WebBrowserResultType }> {
  if (__control.fallarProxima) {
    __control.fallarProxima = false;
    throw new Error('No hay un navegador disponible');
  }
  __abiertas.push(url);
  return { type: WebBrowserResultType.DISMISS };
}
