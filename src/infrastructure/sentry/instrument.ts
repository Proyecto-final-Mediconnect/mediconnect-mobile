import * as Sentry from '@sentry/react-native';

import { scrubBreadcrumb, scrubEvent } from './scrubbing';

/**
 * Inicialización de Sentry en la app mobile (ENG-83 / ENG-99).
 *
 * Mobile es la única superficie donde el equipo no tiene forma de enterarse de
 * un error: no hay logs de servidor ni consola del navegador. Un crash en el
 * celular de un paciente es invisible sin esto.
 *
 * Se llama desde `index.ts` antes de registrar el componente raíz, para que
 * también se capturen los errores del arranque.
 *
 * **Sin `EXPO_PUBLIC_SENTRY_DSN` no se inicializa y no envía nada.** Es lo que
 * pasa en local y en CI, así el dashboard no se llena de errores de desarrollo.
 * El DSN no es un secreto: es público por diseño y solo permite enviar eventos.
 * El token para subir source maps sí lo es, y vive como variable de EAS, nunca
 * en el bundle.
 *
 * Devuelve si quedó inicializado, para poder testearlo.
 */
export function initSentry(dsn: string | undefined = process.env.EXPO_PUBLIC_SENTRY_DSN): boolean {
  if (!dsn) {
    return false;
  }

  Sentry.init({
    dsn,
    environment: process.env.EXPO_PUBLIC_ENV ?? 'development',

    // No adjuntar IP ni datos de usuario automáticamente: son datos personales
    // y la app trata con pacientes (Ley 25.326).
    sendDefaultPii: false,

    // Tracing desactivado: este ticket entrega monitoreo de errores, igual que
    // en la web y el backend.
    tracesSampleRate: 0,

    // Explícitos aunque ya vienen apagados: una captura de pantalla de la
    // historia clínica o del MediPass sería mandarle datos clínicos a un
    // tercero. Que nadie los prenda sin discutirlo (decisión de ENG-83, la
    // misma que deja afuera Session Replay en la web).
    attachScreenshot: false,
    attachViewHierarchy: false,

    beforeSend: (event) => scrubEvent(event),
    beforeBreadcrumb: (breadcrumb) => scrubBreadcrumb(breadcrumb),
  });

  return true;
}
