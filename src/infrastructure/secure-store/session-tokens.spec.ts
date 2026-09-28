import { describe, expect, it } from 'vitest';

import { __secureStore } from '../../../test-stubs/expo-secure-store';
import { clearSessionTokens, readSessionTokens, saveSessionTokens } from './session-tokens';

describe('session-tokens', () => {
  it('guarda el par en el secure store y lo vuelve a leer', async () => {
    await saveSessionTokens({ accessToken: 'a', refreshToken: 'r' });

    expect(await readSessionTokens()).toEqual({ accessToken: 'a', refreshToken: 'r' });
    expect(__secureStore.items.size).toBe(2);
  });

  it('sin tokens guardados no hay sesión', async () => {
    expect(await readSessionTokens()).toBeNull();
  });

  // Sin el refresh no se puede renovar; sin el access se renovaría a ciegas.
  it('un token sin el otro no es una sesión', async () => {
    await saveSessionTokens({ accessToken: 'a', refreshToken: 'r' });
    __secureStore.items.delete('mediconnect.session.refreshToken');

    expect(await readSessionTokens()).toBeNull();
  });

  it('cerrar la sesión borra los dos tokens', async () => {
    await saveSessionTokens({ accessToken: 'a', refreshToken: 'r' });

    await clearSessionTokens();

    expect(__secureStore.items.size).toBe(0);
  });

  // Un par mezclado —access nuevo, refresh viejo ya rotado— se caería al primer
  // refresh sin explicar por qué.
  it('si falla guardar el segundo token, no deja el primero suelto', async () => {
    __secureStore.failNextWriteOf('mediconnect.session.refreshToken');

    await expect(saveSessionTokens({ accessToken: 'a', refreshToken: 'r' })).rejects.toThrow(
      'Keychain no disponible',
    );
    expect(__secureStore.items.size).toBe(0);
  });
});
