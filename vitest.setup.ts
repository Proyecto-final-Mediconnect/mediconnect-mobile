// Extiende los matchers de Vitest con los de @testing-library/jest-dom
// (toBeInTheDocument, toHaveTextContent, etc.).
import '@testing-library/jest-dom/vitest';
import { cleanup, configure } from '@testing-library/react';
import { afterAll, afterEach, beforeAll } from 'vitest';

import { API_URL, server } from './src/test/msw-server';
// El mismo módulo al que apunta el alias de `expo-secure-store`.
import { __secureStore } from './test-stubs/expo-secure-store';

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
