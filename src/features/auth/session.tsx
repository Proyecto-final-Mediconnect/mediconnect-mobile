import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import {
  clearSessionTokens,
  readSessionTokens,
  saveSessionTokens,
} from '../../infrastructure/secure-store/session-tokens';
import { ApiError, onSessionExpired } from '../../shared/lib/api-client';
import { LEGAL_VERSION } from '../legal/legal';
import { acceptLegal as postLegalAcceptance, fetchMe, login, verifyMfa } from './api';
import type { LoginInput, MobileSession, SessionUser } from './types';

/**
 * Estado de la sesión. Los tokens **no** están acá: viven en
 * `expo-secure-store` y solo los lee el cliente HTTP. React conoce al usuario,
 * no sus credenciales.
 */
export type SessionState =
  /** Al abrir la app: leyendo el secure store y verificando con `GET /me`. */
  | { status: 'restoring' }
  /** Sin sesión. `notice` explica por qué, si no fue el paciente quien la cerró. */
  | { status: 'signedOut'; notice?: string }
  | { status: 'signedIn'; user: SessionUser }
  /**
   * Hay una sesión guardada pero no se pudo verificar: sin conexión o el
   * servidor no responde. No es lo mismo que no tener sesión, así que no se
   * manda al login: se ofrece reintentar.
   */
  | { status: 'unreachable'; message: string };

interface SessionContextValue {
  state: SessionState;
  /**
   * Tira `ApiError` o `NotPatientError`; la pantalla de login decide el mensaje.
   * Con la verificación en dos pasos activa tira `MfaRequiredError` (ENG-88).
   */
  signIn: (input: LoginInput) => Promise<void>;
  /** El segundo paso del ingreso: el token de `MfaRequiredError` y el código. */
  signInWithCode: (mfaToken: string, code: string) => Promise<void>;
  signOut: () => Promise<void>;
  /**
   * Acepta los textos legales vigentes (ENG-140) y actualiza el usuario de la
   * sesión. Tira `ApiError`; la pantalla decide el mensaje.
   */
  acceptLegal: () => Promise<void>;
  /** Vuelve a intentar verificar la sesión guardada (desde `unreachable`). */
  retry: () => void;
}

/** La cuenta existe y la contraseña es correcta, pero no es de un paciente. */
export class NotPatientError extends Error {
  constructor() {
    super('La app de MediConnect es para pacientes. Si sos profesional, ingresá desde la web.');
    this.name = 'NotPatientError';
  }
}

/**
 * La contraseña está bien, pero la cuenta tiene activa la verificación en dos
 * pasos (ENG-88): falta el código de la app autenticadora. Lleva el token del
 * primer paso, que no se guarda en el dispositivo.
 */
export class MfaRequiredError extends Error {
  constructor(readonly mfaToken: string) {
    super('Falta el código de la verificación en dos pasos.');
    this.name = 'MfaRequiredError';
  }
}

const SESION_TERMINADA = 'Tu sesión terminó. Iniciá sesión de nuevo.';

const SessionContext = createContext<SessionContextValue | null>(null);

/**
 * Dueño de la sesión del paciente (ENG-114). Al montarse restaura la que quedó
 * guardada, así que abrir la app no vuelve a pedir la contraseña.
 *
 * Solo entran pacientes: el panel profesional es la web. Un usuario con otro
 * rol no llega a guardar nada en el dispositivo.
 */
export function SessionProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [state, setState] = useState<SessionState>({ status: 'restoring' });
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let vigente = true;
    const actualizar = (nuevo: SessionState): void => {
      if (vigente) setState(nuevo);
    };

    void (async () => {
      const tokens = await readSessionTokens().catch(() => null);
      if (!tokens) return actualizar({ status: 'signedOut' });

      try {
        // `fetchMe` renueva el access token si venció: una sesión de hace días
        // se recupera sola mientras el refresh token siga vigente.
        const user = await fetchMe();
        if (user.role !== 'PACIENTE') {
          await clearSessionTokens();
          return actualizar({ status: 'signedOut' });
        }
        actualizar({ status: 'signedIn', user });
      } catch (err) {
        // 401: el cliente ya borró los tokens. Cualquier otra cosa es pasajera.
        if (err instanceof ApiError && err.status === 401) {
          return actualizar({ status: 'signedOut', notice: SESION_TERMINADA });
        }
        actualizar({
          status: 'unreachable',
          message: err instanceof ApiError ? err.message : 'No pudimos verificar tu sesión.',
        });
      }
    })();

    return () => {
      vigente = false;
    };
  }, [intento]);

  // El cliente HTTP avisa cuando una sesión en uso se vence y no se puede
  // renovar: la app vuelve al login desde cualquier pantalla.
  useEffect(
    () =>
      onSessionExpired(() => {
        setState((prev) =>
          prev.status === 'signedIn' ? { status: 'signedOut', notice: SESION_TERMINADA } : prev,
        );
      }),
    [],
  );

  /**
   * Abre la sesión con un par de tokens recién emitidos. El rol se consulta con
   * ese token y antes de guardarlo: si no es un paciente, la sesión no llega a
   * existir en el dispositivo.
   */
  const open = useCallback(async (session: MobileSession): Promise<void> => {
    const user = await fetchMe(session.accessToken);
    if (user.role !== 'PACIENTE') throw new NotPatientError();

    await saveSessionTokens({
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
    });
    setState({ status: 'signedIn', user });
  }, []);

  const signIn = useCallback(
    async (input: LoginInput): Promise<void> => {
      const respuesta = await login(input);
      if ('mfaRequired' in respuesta) throw new MfaRequiredError(respuesta.mfaToken);
      await open(respuesta);
    },
    [open],
  );

  const signInWithCode = useCallback(
    async (mfaToken: string, code: string): Promise<void> => {
      await open(await verifyMfa(mfaToken, code));
    },
    [open],
  );

  const signOut = useCallback(async (): Promise<void> => {
    // Sin `finally` a propósito: si el borrado falla, los tokens siguen en el
    // Keystore y pasar a `signedOut` le haría creer al paciente que cerró
    // sesión. Al volver a abrir la app, `SessionProvider` la restauraría y
    // mostraría sus turnos y su historia clínica. En un celular compartido eso
    // es exposición de datos de salud, así que el error sube a la pantalla y
    // la sesión sigue abierta hasta que el borrado funcione.
    await clearSessionTokens();
    setState({ status: 'signedOut' });
  }, []);

  const acceptLegal = useCallback(async (): Promise<void> => {
    const user = await postLegalAcceptance(LEGAL_VERSION);
    setState({ status: 'signedIn', user });
  }, []);

  const retry = useCallback(() => {
    setState({ status: 'restoring' });
    setIntento((n) => n + 1);
  }, []);

  const value = useMemo(
    () => ({ state, signIn, signInWithCode, signOut, acceptLegal, retry }),
    [state, signIn, signInWithCode, signOut, acceptLegal, retry],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession tiene que usarse dentro de <SessionProvider>.');
  return value;
}

/**
 * El paciente de la sesión, para las pantallas privadas: solo se montan con la
 * sesión iniciada (ver `RootNavigator`).
 *
 * Al cerrar sesión, el navegador desmonta esas pantallas un render después de
 * que cambia el estado. En ese render intermedio se devuelve el último paciente
 * conocido en lugar de romper.
 */
export function useSessionUser(): SessionUser {
  const { state } = useSession();
  const ultimo = useRef<SessionUser | null>(null);
  if (state.status === 'signedIn') ultimo.current = state.user;
  if (!ultimo.current) {
    throw new Error('useSessionUser solo se usa en pantallas con la sesión iniciada.');
  }
  return ultimo.current;
}
