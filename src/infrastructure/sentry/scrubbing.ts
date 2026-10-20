import type { Breadcrumb, ErrorEvent } from '@sentry/react-native';

/**
 * Saneamiento de los eventos que se envían a Sentry (ENG-83 / ENG-99).
 *
 * Sentry es un servicio de terceros: todo lo que se adjunte a un evento sale de
 * nuestra infraestructura. La app maneja historia clínica (Ley 26.529) y el
 * MediPass, datos de salud que la Ley 25.326 trata como sensibles.
 *
 * Es la misma política que la web (`mediconnect-web/src/shared/lib/
 * sentry.scrubbing.ts`) y el backend: sin body, headers ni query string, y al
 * usuario se lo identifica solo por su id, nunca por su email.
 *
 * Mobile suma una fuente que la web no tiene: el SDK de React Native registra
 * cada `console.*` como breadcrumb con el texto completo, y un `console.log` de
 * un objeto de la API puede arrastrar una entrada entera de la historia clínica.
 */

/**
 * Quita del evento todo lo que pueda contener datos sensibles antes de enviarlo.
 */
export function scrubEvent(event: ErrorEvent): ErrorEvent {
  if (event.request) {
    const { url } = event.request;

    event.request = {
      ...(url !== undefined && { url: url.split('?')[0] }),
    };
  }

  // Sin `sendDefaultPii` el SDK no adjunta datos del usuario, pero el id puede
  // llegar por `Sentry.setUser`. Nos quedamos solo con el id.
  if (event.user) {
    const { id } = event.user;

    event.user = id !== undefined ? { id } : {};
  }

  return event;
}

/**
 * Recorta los breadcrumbs, o los descarta cuando no hay forma segura de
 * mandarlos.
 *
 * - Los de **consola** se descartan enteros: su mensaje es texto libre que no se
 *   puede sanear sin saber qué se logueó.
 * - En el resto se conservan método y código de estado ("un POST devolvió
 *   500"), que es lo que sirve para reconstruir qué pasó, y se descarta todo lo
 *   demás: la URL de un request puede llevar ids de paciente o un código
 *   MediPass, y los parámetros de navegación, el id del turno que se abrió.
 */
export function scrubBreadcrumb(breadcrumb: Breadcrumb): Breadcrumb | null {
  if (breadcrumb.category === 'console') {
    return null;
  }

  if (!breadcrumb.data) {
    return breadcrumb;
  }

  const { method, status_code } = breadcrumb.data as {
    method?: unknown;
    status_code?: unknown;
  };

  breadcrumb.data = {
    ...(method !== undefined && { method }),
    ...(status_code !== undefined && { status_code }),
  };

  return breadcrumb;
}
