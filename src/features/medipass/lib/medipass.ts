import type { EmergencyScope, MediPassAccess } from '../types';

/**
 * Reglas del MediPass (EP-05).
 *
 * Puras y testeadas, como el resto.
 */

/**
 * Cada cuánto rota el código: los 5 minutos de ENG-72. Lo rota el servidor; acá
 * solo sirve para dibujar la barra de lo que falta.
 */
export const ROTACION_MS = 5 * 60_000;

/** Milisegundos hasta `expiraEl`, nunca negativo. */
export function msHasta(expiraEl: string, now: Date): number {
  return Math.max(0, new Date(expiraEl).getTime() - now.getTime());
}

/**
 * Cuándo volver a pedir el código, en ms (el `refetchInterval` de la consulta).
 *
 * Justo después de que vence, para que el QR nunca muestre uno que ya no sirve.
 * Con el backend fallando (`expiraEl` en `null`) se espera 30 s en vez de
 * insistir cada segundo; y si llega uno ya vencido (reloj del teléfono
 * adelantado), 15 s, para no quedar en un bucle.
 */
export function proximaConsultaDelCodigo(expiraEl: string | null, now: Date): number {
  if (!expiraEl) return 30_000;
  const restante = new Date(expiraEl).getTime() - now.getTime();
  return restante > 0 ? Math.max(5_000, restante + 500) : 15_000;
}

/**
 * Lo que va en el QR: la ficha de emergencia de la web con el código. Es la
 * misma URL que arma la web, así que cualquier cámara la abre en el navegador
 * de quien escanea, sin instalar nada.
 */
export function emergencyUrl(webUrl: string, codigo: string): string {
  return `${webUrl}/medipass/emergencia?codigo=${encodeURIComponent(codigo)}`;
}

/** `AB12CD34` → `AB12-CD34`: de a cuatro se lee y se dicta sin errores. */
export function formatCodigo(codigo: string): string {
  const limpio = codigo.replace(/[^0-9A-Za-z]/g, '').toUpperCase();
  return limpio.length === 8 ? `${limpio.slice(0, 4)}-${limpio.slice(4)}` : limpio;
}

export type EstadoAcceso = { estado: 'VIGENTE'; msRestantes: number } | { estado: 'VENCIDO' };

/**
 * Si un acceso sigue en pie.
 *
 * El corte es el instante de expiración: un acceso vencido hace un segundo ya no
 * ve nada, y mostrarlo como vigente le haría creer al paciente que alguien está
 * mirando su historia cuando no.
 */
export function estadoDeAcceso(acceso: MediPassAccess, now: Date = new Date()): EstadoAcceso {
  const restante = new Date(acceso.expiraEl).getTime() - now.getTime();

  return restante > 0 ? { estado: 'VIGENTE', msRestantes: restante } : { estado: 'VENCIDO' };
}

/** Los accesos que están mirando la historia ahora mismo. */
export function accesosVigentes(
  accesos: MediPassAccess[],
  now: Date = new Date(),
): MediPassAccess[] {
  return accesos.filter((acceso) => estadoDeAcceso(acceso, now).estado === 'VIGENTE');
}

/**
 * `mm:ss` de lo que falta. Por encima de una hora se corta en `59:59`: no hay
 * nada en el MediPass que dure tanto, y un tercer campo confundiría más.
 */
export function cuentaRegresiva(ms: number): string {
  const total = Math.max(0, Math.min(Math.floor(ms / 1000), 59 * 60 + 59));
  const mm = String(Math.floor(total / 60)).padStart(2, '0');
  const ss = String(total % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

/**
 * El bloque vital NO se puede apagar.
 *
 * Es la razón de ser del MediPass: un médico de guardia que escanea el código
 * tiene que ver alergias y medicación, o el pasaporte no sirve para lo único que
 * no puede fallar. Los otros tres bloques sí son opcionales.
 */
export function normalizarAlcance(scopes: EmergencyScope[]): EmergencyScope[] {
  return scopes.includes('VITAL') ? scopes : ['VITAL', ...scopes];
}

/** Si un bloque se muestra con el alcance elegido. */
export function muestraBloque(scopes: EmergencyScope[], bloque: EmergencyScope): boolean {
  return normalizarAlcance(scopes).includes(bloque);
}
