/**
 * ⚠️ DATOS DE EJEMPLO — la app todavía no habla con el backend.
 *
 * Hasta que exista el login (ENG-114) no hay sesión ni token, y sin token no se
 * puede pedir nada a la API. Mientras tanto las pantallas se alimentan de
 * `src/mocks/`, con las mismas formas que devuelve el backend, para que cambiar
 * a los datos reales sea reemplazar la función de cada `api.ts` y nada más.
 *
 * Todo lo que sale de acá pasa por `conDemora`, que simula la red: así se ven
 * los estados de carga, que con datos reales van a existir.
 */
export const MODO_DEMO = true;

const DEMORA_MS = typeof process !== 'undefined' && process.env.VITEST ? 0 : 450;

export function conDemora<T>(valor: T, ms: number = DEMORA_MS): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(valor), ms));
}
