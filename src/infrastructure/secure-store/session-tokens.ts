import * as SecureStore from 'expo-secure-store';

/**
 * Los tokens de la sesión del paciente (ENG-114).
 *
 * Viven **solo** acá: en el Keychain de iOS o en el Keystore de Android, a
 * través de `expo-secure-store`. Nunca en `AsyncStorage` —es texto plano en el
 * disco— ni en el estado de React. Este módulo es el único que los toca.
 */
export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
}

const ACCESS_KEY = 'mediconnect.session.accessToken';
const REFRESH_KEY = 'mediconnect.session.refreshToken';

/**
 * `WHEN_UNLOCKED_THIS_DEVICE_ONLY`: solo con el celular desbloqueado, y la
 * entrada no viaja a otro dispositivo al restaurar un backup de iCloud o de
 * iTunes. Es la opción más restrictiva que la app puede usar, porque nunca
 * necesita el token con la pantalla bloqueada. En Android se ignora: el
 * Keystore ya queda atado al dispositivo.
 *
 * Se pasan las mismas opciones a las tres operaciones para que lean y borren
 * la misma entrada que se escribió.
 */
const OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

/**
 * Cuántas veces se cerró la sesión. Una renovación que arrancó antes de un
 * logout no tiene que guardar su par nuevo después: la sesión resucitaría y
 * volvería al abrir la app. El cliente HTTP la compara antes de guardar.
 */
let generacion = 0;

export function sessionGeneration(): number {
  return generacion;
}

export async function readSessionTokens(): Promise<SessionTokens | null> {
  const [accessToken, refreshToken] = await Promise.all([
    SecureStore.getItemAsync(ACCESS_KEY, OPTIONS),
    SecureStore.getItemAsync(REFRESH_KEY, OPTIONS),
  ]);
  // Uno sin el otro no es una sesión: sin el refresh no se puede renovar, y sin
  // el access se renovaría a ciegas.
  if (!accessToken || !refreshToken) return null;
  return { accessToken, refreshToken };
}

/**
 * Guarda el par entero. Si falla la escritura de uno, borra los dos: un par
 * mezclado —el access nuevo con el refresh viejo, que Supabase ya rotó— dejaría
 * una sesión que se cae al primer refresh sin explicar por qué.
 */
export async function saveSessionTokens(tokens: SessionTokens): Promise<void> {
  try {
    await SecureStore.setItemAsync(ACCESS_KEY, tokens.accessToken, OPTIONS);
    await SecureStore.setItemAsync(REFRESH_KEY, tokens.refreshToken, OPTIONS);
  } catch (err) {
    // El error que importa acá es el de la escritura. Si además falla el
    // borrado no hay nada mejor que hacer: no quedó una sesión usable igual,
    // porque `readSessionTokens` exige las dos claves.
    await clearSessionTokens().catch(() => undefined);
    throw err;
  }
}

/**
 * Borra el par.
 *
 * Reintenta una vez las claves que fallaron y **tira** si alguna queda: quien
 * llama tiene que poder distinguir "la sesión se cerró" de "los tokens siguen
 * en el dispositivo". Una clave sola no deja una sesión usable —
 * `readSessionTokens` exige las dos— pero sí deja material en el Keystore, y en
 * un celular compartido eso es lo que importa.
 *
 * `generacion` sube igual, antes de intentar: una renovación en vuelo no tiene
 * que guardar su par nuevo ni aunque el borrado falle.
 */
export async function clearSessionTokens(): Promise<void> {
  generacion += 1;
  const pendientes = await borrarClaves([ACCESS_KEY, REFRESH_KEY]);
  if (pendientes.length === 0) return;

  const fallidas = await borrarClaves(pendientes);
  if (fallidas.length > 0) {
    throw new Error(
      `No se pudieron borrar los tokens de la sesión (${String(fallidas.length)} de 2).`,
    );
  }
}

/** Borra las claves y devuelve las que fallaron. */
async function borrarClaves(keys: string[]): Promise<string[]> {
  const resultados = await Promise.allSettled(
    keys.map((key) => SecureStore.deleteItemAsync(key, OPTIONS)),
  );
  return keys.filter((_, i) => resultados[i]?.status === 'rejected');
}
