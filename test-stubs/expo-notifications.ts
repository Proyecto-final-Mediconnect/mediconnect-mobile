/*
 * Stub de `expo-notifications` para Vitest (ENG-71).
 *
 * El paquete real habla con FCM y con el módulo nativo de notificaciones, que en
 * jsdom no existen. `__notifications` deja que los tests elijan qué responde el
 * permiso, simulen el toque de un aviso y lean el handler instalado.
 */

export type PermissionStatus = 'granted' | 'denied' | 'undetermined';

export interface NotificationResponse {
  notification: { request: { content: { data: Record<string, unknown> } } };
}

type ResponseListener = (response: NotificationResponse) => void;
type Handler = {
  handleNotification: (notification: {
    request: { content: { data: Record<string, unknown> } };
  }) => Promise<Record<string, boolean>>;
};

const state = {
  status: 'undetermined' as PermissionStatus,
  /** Android 13+ arranca en `denied` pero con `canAskAgain`: se puede preguntar. */
  canAskAgain: true,
  /** Lo que el usuario contesta al diálogo del sistema. */
  answer: 'granted' as PermissionStatus,
  token: 'ExponentPushToken[test-token-123]',
  tokenError: null as Error | null,
  lastResponse: null as NotificationResponse | null,
  listeners: new Set<ResponseListener>(),
  handler: null as Handler | null,
  requested: 0,
  channels: [] as { id: string; config: Record<string, unknown> }[],
};

export const __notifications = {
  state,
  reset(): void {
    state.status = 'undetermined';
    state.canAskAgain = true;
    state.answer = 'granted';
    state.token = 'ExponentPushToken[test-token-123]';
    state.tokenError = null;
    state.lastResponse = null;
    state.listeners.clear();
    state.requested = 0;
    state.channels = [];
  },
  /** Simula que el paciente toca un aviso con la app abierta. */
  tap(data: Record<string, unknown>): void {
    const response = { notification: { request: { content: { data } } } };
    for (const listener of state.listeners) listener(response);
  },
};

export const AndroidImportance = { HIGH: 4, DEFAULT: 3 } as const;
export const AndroidNotificationVisibility = { PUBLIC: 1, PRIVATE: 0, SECRET: -1 } as const;

export function setNotificationHandler(handler: Handler | null): void {
  state.handler = handler;
}

export async function setNotificationChannelAsync(
  id: string,
  config: Record<string, unknown>,
): Promise<void> {
  state.channels.push({ id, config });
}

export async function getPermissionsAsync(): Promise<{
  status: PermissionStatus;
  canAskAgain: boolean;
}> {
  return { status: state.status, canAskAgain: state.canAskAgain };
}

export async function requestPermissionsAsync(): Promise<{ status: PermissionStatus }> {
  state.requested++;
  state.status = state.answer;
  state.canAskAgain = state.answer !== 'denied';
  return { status: state.status };
}

export async function getExpoPushTokenAsync(): Promise<{ data: string; type: 'expo' }> {
  if (state.tokenError) throw state.tokenError;
  return { data: state.token, type: 'expo' };
}

export async function getLastNotificationResponseAsync(): Promise<NotificationResponse | null> {
  return state.lastResponse;
}

export async function clearLastNotificationResponseAsync(): Promise<void> {
  state.lastResponse = null;
}

export function addNotificationResponseReceivedListener(listener: ResponseListener): {
  remove: () => void;
} {
  state.listeners.add(listener);
  return { remove: () => state.listeners.delete(listener) };
}
