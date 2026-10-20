import { setupServer } from 'msw/node';

/**
 * Servidor de MSW para los tests (Sprint 0 §4.2.1). Arranca sin handlers: cada
 * test declara con `server.use(...)` las respuestas que necesita, y un request
 * sin handler hace fallar el test (`vitest.setup.ts`).
 */
export const API_URL = 'http://api.mediconnect.test';

export const server = setupServer();
