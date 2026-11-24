import { WEB_URL } from '../../shared/lib/web-url';

/**
 * Versión vigente de los textos legales (ENG-140). Tiene que ser **la misma**
 * que `LEGAL_VERSION` del backend y de la web: si cambian los textos, se sube en
 * los tres y a quien ya aceptó se le vuelven a pedir.
 */
export const LEGAL_VERSION = '2026-10-13';

/**
 * Dónde se leen los textos completos: la página `/legales` de la web. La app no
 * los duplica, así hay una sola copia que mantener.
 */
export const LEGAL_URL = `${WEB_URL}/legales`;

/** Lo que se le dice a quien quiere registrarse sin aceptar: el mismo texto que la web. */
export const LEGAL_REQUIRED_MESSAGE =
  'Para usar MediConnect tenés que aceptar los términos y condiciones, la política de privacidad y el consentimiento para el tratamiento de tus datos de salud.';
