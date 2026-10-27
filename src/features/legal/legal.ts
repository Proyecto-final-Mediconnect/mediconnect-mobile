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
