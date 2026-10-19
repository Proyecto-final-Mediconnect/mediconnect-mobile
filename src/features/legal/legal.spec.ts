import { afterEach, describe, expect, it, vi } from 'vitest';

async function legalUrlCon(webUrl: string | undefined): Promise<string> {
  vi.resetModules();
  vi.stubEnv('EXPO_PUBLIC_WEB_URL', webUrl);
  return (await import('./legal')).LEGAL_URL;
}

describe('LEGAL_URL', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('usa la web configurada', async () => {
    expect(await legalUrlCon('http://localhost:5173')).toBe('http://localhost:5173/legales');
  });

  it('con la variable vacía, como viene en .env.example, usa la web publicada', async () => {
    expect(await legalUrlCon('')).toBe('https://mediconnect-web-bigz.onrender.com/legales');
  });
});
