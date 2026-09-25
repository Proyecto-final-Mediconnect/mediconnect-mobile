import {
  clearSessionTokens,
  readSessionTokens,
  saveSessionTokens,
  sessionGeneration,
  type SessionTokens,
} from '../../infrastructure/secure-store/session-tokens';

/**
 * Cliente HTTP de la app contra `mediconnect-backend` (ENG-114).
 *
 * Es el equivalente mobile del `apiFetch` de la web, con una diferencia de
 * fondo: la web lleva la sesión en cookies httpOnly y acá no hay cookies. Cada
 * request lleva `Authorization: Bearer <accessToken>`, leído de
 * `expo-secure-store`, y la renovación va contra `POST /auth/mobile/refresh`
 * con el refresh token en el body.
 *
 * Ante un 401 renueva **una vez** y reintenta. Si la renovación dice que la
 * sesión ya no es válida, borra los tokens y avisa (`onSessionExpired`) para
 * que la app vuelva al login. Si falla por red o porque Supabase no responde,
 * **no** borra nada: una caída no es un token inválido, y desloguear por eso
 * obligaría al paciente a escribir la contraseña cada vez que pierde señal.
 */

export class ApiError extends Error {
  /** Status HTTP. `0` cuando no hubo respuesta: sin conexión o sin servidor. */
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

const MENSAJE_SIN_CONEXION = 'No pudimos conectarnos. Revisá tu conexión e intentá de nuevo.';
const MENSAJE_GENERICO = 'Ocurrió un error inesperado. Intentá de nuevo.';

/**
 * El backend gratis de Render se duerme y tarda hasta un minuto en despertar:
 * cortar antes haría fallar justo el primer login del día. Sin ningún límite,
 * en cambio, una red que se cuelga deja la ruedita girando para siempre.
 */
const TIMEOUT_MS = 60_000;

function apiUrl(path: string): string {
  // Expo reemplaza `process.env.EXPO_PUBLIC_*` al compilar, y solo si se escribe
  // así, completo: no se puede leer con una clave dinámica.
  const base = process.env.EXPO_PUBLIC_API_URL;
  if (!base) {
    throw new ApiError(0, 'La app no tiene configurada la dirección del servidor.');
  }
  return `${base.replace(/\/+$/, '')}${path}`;
}

async function send(
  path: string,
  { method, body, token }: { method: string; body?: unknown; token?: string },
): Promise<Response> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(apiUrl(path), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(0, MENSAJE_SIN_CONEXION);
  } finally {
    clearTimeout(timer);
  }
}

async function toApiError(response: Response, fallback?: string): Promise<ApiError> {
  const data = (await response.json().catch(() => null)) as {
    message?: string | string[];
  } | null;
  const message = data?.message;
  return new ApiError(
    response.status,
    Array.isArray(message) ? message.join(' ') : (message ?? fallback ?? MENSAJE_GENERICO),
  );
}

// --- Sesión vencida ---------------------------------------------------------

let sessionExpiredHandler: (() => void) | null = null;

/**
 * Lo registra `SessionProvider`: la sesión se venció y no se pudo renovar, así
 * que la app tiene que volver al login. Devuelve la función para desregistrarlo.
 */
export function onSessionExpired(handler: () => void): () => void {
  sessionExpiredHandler = handler;
  return () => {
    if (sessionExpiredHandler === handler) sessionExpiredHandler = null;
  };
}

// --- Renovación -------------------------------------------------------------

type RefreshResult = 'renewed' | 'invalid' | 'unavailable';

/**
 * Renovación en curso. Supabase rota el refresh token en cada uso, así que dos
 * renovaciones en paralelo con el mismo token se pisan: la segunda llega con un
 * token ya usado. Todos los requests que reciben 401 a la vez esperan esta.
 */
let refreshInFlight: Promise<RefreshResult> | null = null;

function renewSession(): Promise<RefreshResult> {
  refreshInFlight ??= (async (): Promise<RefreshResult> => {
    const generacion = sessionGeneration();
    const tokens = await readSessionTokens();
    if (!tokens) return 'invalid';

    let response: Response;
    try {
      response = await send('/auth/mobile/refresh', {
        method: 'POST',
        body: { refreshToken: tokens.refreshToken },
      });
    } catch {
      return 'unavailable';
    }

    if (response.ok) {
      // Un 200 que no trae el par —la página HTML de un proxy, o la de Render
      // mientras despierta— no es una sesión nueva, pero tampoco prueba que la
      // vieja haya dejado de servir: se trata como una falla pasajera.
      const session = (await response.json().catch(() => null)) as Partial<SessionTokens> | null;
      if (typeof session?.accessToken !== 'string' || typeof session.refreshToken !== 'string') {
        return 'unavailable';
      }
      // El paciente cerró sesión mientras se renovaba: el par nuevo no se guarda.
      if (sessionGeneration() !== generacion) return 'invalid';
      await saveSessionTokens({
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
      });
      return 'renewed';
    }
    // 401: el refresh token venció o ya se usó. 400: no llegó uno válido. Ninguno
    // se arregla reintentando. El resto (429, 503) es pasajero.
    return response.status === 401 || response.status === 400 ? 'invalid' : 'unavailable';
  })().finally(() => {
    refreshInFlight = null;
  });

  return refreshInFlight;
}

async function endSession(): Promise<void> {
  await clearSessionTokens();
  sessionExpiredHandler?.();
}

// --- Requests ---------------------------------------------------------------

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** Mensaje si el backend no manda uno propio. */
  fallbackMessage?: string;
  /**
   * `false` para las rutas públicas: no manda el token ni intenta renovar.
   * El login, por ejemplo.
   */
  auth?: boolean;
  /**
   * Usa este access token en lugar del guardado, sin renovar. Sirve para
   * consultar `GET /me` con el token recién emitido **antes** de guardarlo: si
   * el usuario no es paciente, no queda nada en el dispositivo.
   */
  token?: string;
}

/**
 * Request a la API. Devuelve el body parseado o tira `ApiError` con el mensaje
 * del backend, que ya viene en castellano y pensado para mostrarse.
 */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, fallbackMessage, auth = true, token } = options;

  if (!auth || token) {
    const response = await send(path, { method, body, token });
    if (!response.ok) throw await toApiError(response, fallbackMessage);
    return parse<T>(response);
  }

  const tokens = await readSessionTokens();
  if (!tokens) {
    await endSession();
    throw new ApiError(401, 'Tu sesión terminó. Iniciá sesión de nuevo.');
  }

  let response = await send(path, { method, body, token: tokens.accessToken });

  if (response.status === 401) {
    // Otro request pudo haber renovado mientras este viajaba: si el token
    // guardado ya no es el que se usó, alcanza con reintentar con el nuevo.
    const actuales = await readSessionTokens();
    const yaRenovado = actuales && actuales.accessToken !== tokens.accessToken;
    const resultado = yaRenovado ? 'renewed' : await renewSession();

    if (resultado === 'invalid') {
      await endSession();
      throw new ApiError(401, 'Tu sesión terminó. Iniciá sesión de nuevo.');
    }
    if (resultado === 'unavailable') {
      throw new ApiError(503, 'No pudimos renovar tu sesión. Probá de nuevo en unos minutos.');
    }

    const renovados = await readSessionTokens();
    response = await send(path, { method, body, token: renovados?.accessToken });

    // Recién renovado y otra vez 401: el problema no es el vencimiento.
    if (response.status === 401) {
      await endSession();
      throw new ApiError(401, 'Tu sesión terminó. Iniciá sesión de nuevo.');
    }
  }

  if (!response.ok) throw await toApiError(response, fallbackMessage);
  return parse<T>(response);
}

/** Un 200 que no es JSON —la página HTML de un proxy— se reporta como `ApiError`, no como un `SyntaxError`. */
async function parse<T>(response: Response): Promise<T> {
  if (response.status === 204) return undefined as T;
  try {
    return (await response.json()) as T;
  } catch {
    throw new ApiError(502, MENSAJE_GENERICO);
  }
}
