// Extiende los matchers de Vitest con los de @testing-library/jest-dom
// (toBeInTheDocument, toHaveTextContent, etc.).
import '@testing-library/jest-dom/vitest';
import { cleanup, configure } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, vi } from 'vitest';

import { API_URL, server } from './src/test/msw-server';
// El mismo módulo al que apunta el alias de `expo-secure-store`.
import { __secureStore } from './test-stubs/expo-secure-store';
import { __documentos } from './test-stubs/expo-document-picker';
import { __disco } from './test-stubs/expo-file-system';
import { __fotos } from './test-stubs/expo-image-picker';
import { __abiertas } from './test-stubs/expo-web-browser';
import { __notifications } from './test-stubs/expo-notifications';

// Los tests montan la app entera con el navegador real, y abrirla ahora incluye
// restaurar la sesión (ENG-114): en una máquina lenta o en CI, el segundo que
// Testing Library espera por defecto en los `findBy*` queda justo y los tests
// fallan de a ratos. Tres segundos da margen sin esconder un cuelgue.
configure({ asyncUtilTimeout: 3000 });

// La API de los tests: MSW responde en esta dirección (Sprint 0 §4.2.1). Un
// request sin handler falla el test, para que ninguno hable con la red de verdad.
process.env.EXPO_PUBLIC_API_URL = API_URL;

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  // Cada test arranca sin sesión guardada.
  __secureStore.reset();
  __abiertas.length = 0;
  __fotos.reiniciar();
  __documentos.reiniciar();
  __disco.reiniciar();
  __notifications.reset();
});

afterAll(() => {
  server.close();
});

// jsdom no implementa `ResizeObserver` y `@react-navigation/elements` lo usa en
// su camino web para medir el header. ADR-016.
globalThis.ResizeObserver ??= class {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
};

/**
 * `usePublicConfig` (ENG-229) devuelve en todos los tests lo que responde hoy
 * `GET /config`: así ningún test necesita un handler de MSW para `/config`.
 * `getPublicConfig` queda real y tiene su propio test.
 */
vi.mock('./src/shared/config/public-config', async (importOriginal) => {
  const { TEST_PUBLIC_CONFIG } = await import('./src/shared/config/test-public-config');
  return {
    ...(await importOriginal<typeof import('./src/shared/config/public-config')>()),
    usePublicConfig: () => TEST_PUBLIC_CONFIG,
  };
});
