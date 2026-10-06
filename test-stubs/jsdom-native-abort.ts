import type { Environment } from 'vitest';
import { builtinEnvironments } from 'vitest/environments';

/**
 * jsdom con el `AbortController` de Node. jsdom reemplaza el global por el suyo,
 * y desde Node 24 el `fetch` nativo (undici) rechaza esa señal: "Expected signal
 * to be an instance of AbortSignal". El `api-client` siempre manda una (timeout),
 * así que todos los requests fallaban con "No pudimos conectarnos" en CI.
 */
export default <Environment>{
  name: 'jsdom-native-abort',
  transformMode: 'web',
  async setup(global, options) {
    const { AbortController, AbortSignal } = global;
    const env = await builtinEnvironments.jsdom.setup(global, options);
    global.AbortController = AbortController;
    global.AbortSignal = AbortSignal;
    return env;
  },
};
