/**
 * ⚠️ DATOS DE EJEMPLO.
 *
 * Turnos, historia clínica y perfil ya salen del backend. Lo que queda acá cumple
 * dos funciones:
 *
 * - Es lo que responde el backend en los tests (`src/test/patient-api.ts`, con
 *   MSW), con las mismas formas que la API real.
 * - Sirve de datos de ejemplo para el modo demo; el MediPass ya sale de
 *   `/medipass/me*` (ENG-117).
 *
 * `conDemora` simula la red, para que se vean los estados de carga.
 */
const DEMORA_MS = typeof process !== 'undefined' && process.env.VITEST ? 0 : 450;

export function conDemora<T>(valor: T, ms: number = DEMORA_MS): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(valor), ms));
}
