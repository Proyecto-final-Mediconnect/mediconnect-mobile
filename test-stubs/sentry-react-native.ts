/*
 * Stub de `@sentry/react-native` para Vitest: el SDK real carga módulos nativos
 * que en jsdom no existen. Registra las llamadas a `init` para que los tests
 * puedan verificar si se inicializó y con qué opciones.
 */
export const llamadasAInit: unknown[] = [];

export function init(options: unknown): void {
  llamadasAInit.push(options);
}

export function wrap<T>(componente: T): T {
  return componente;
}
