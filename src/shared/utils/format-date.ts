// Util de ejemplo. Archivos de utils en kebab-case (Sprint 0 §3.4.3).

/**
 * Formatea una fecha al formato corto `dd/MM/yyyy` usado en la UI (es-AR).
 *
 * @param date Fecha a formatear.
 * @returns Cadena `dd/MM/yyyy`.
 */
export function formatShortDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}
