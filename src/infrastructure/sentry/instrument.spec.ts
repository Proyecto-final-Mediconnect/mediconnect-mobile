import { beforeEach, describe, expect, it } from 'vitest';

import { llamadasAInit } from '../../../test-stubs/sentry-react-native';
import { initSentry } from './instrument';

describe('initSentry', () => {
  beforeEach(() => {
    llamadasAInit.length = 0;
  });

  it('sin DSN configurado no inicializa Sentry ni envía nada', () => {
    expect(initSentry(undefined)).toBe(false);
    expect(initSentry('')).toBe(false);
    expect(llamadasAInit).toHaveLength(0);
  });

  it('con DSN lo inicializa sin datos personales, sin capturas y con los filtros puestos', () => {
    expect(initSentry('https://clave@o0.ingest.sentry.io/0')).toBe(true);

    expect(llamadasAInit).toHaveLength(1);
    expect(llamadasAInit[0]).toMatchObject({
      dsn: 'https://clave@o0.ingest.sentry.io/0',
      sendDefaultPii: false,
      tracesSampleRate: 0,
      attachScreenshot: false,
      attachViewHierarchy: false,
      beforeSend: expect.any(Function),
      beforeBreadcrumb: expect.any(Function),
    });
  });
});
