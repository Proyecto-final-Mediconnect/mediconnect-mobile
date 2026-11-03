import type { Environment } from 'vitest';
import { builtinEnvironments } from 'vitest/environments';

/**
 * jsdom con el `AbortController` de Node. jsdom reemplaza el global por el suyo,
 * y desde Node 24 el `fetch` nativo (undici) rechaza esa señal: "Expected signal
 * to be an instance of AbortSignal". El `api-client` siempre manda una (timeout),
 * así que todos los requests fallaban con "No pudimos conectarnos" en CI.
 *
 * Lo mismo con `FormData`, `Blob` y `File` (ENG-164): undici no reconoce el
 * `FormData` de jsdom, lo manda como texto (`[object FormData]`) y el request
 * llega sin `multipart/form-data`. En la app real el `FormData` es el de React
 * Native, que `fetch` sí entiende.
 */
export default <Environment>{
  name: 'jsdom-native-abort',
  transformMode: 'web',
  async setup(global, options) {
    const { AbortController, AbortSignal, FormData, Blob, File } = global;
    const env = await builtinEnvironments.jsdom.setup(global, options);
    global.AbortController = AbortController;
    global.AbortSignal = AbortSignal;
    global.FormData = FormData;
    global.Blob = Blob;
    global.File = File;
    return env;
  },
};
