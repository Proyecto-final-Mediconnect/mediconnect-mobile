import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { Alert, Platform } from 'react-native';

import { apiRequest } from '../../shared/lib/api-client';

/**
 * Notificaciones push por mensajes nuevos (ENG-71).
 *
 * El push lo manda el backend al guardar el mensaje, no el cliente suscrito a
 * Realtime: el stream puede perder eventos (spike ENG-52). Acá solo se pide el
 * permiso, se registra el token del dispositivo y se lo borra al cerrar sesión.
 *
 * El aviso dice quién escribió y nada más: aparece en la pantalla bloqueada, y
 * el texto de un mensaje con un profesional puede ser clínico.
 */

/** El canal de Android de los avisos de mensajes. El backend manda a este. */
export const MESSAGES_CHANNEL_ID = 'mensajes';

/** El canal de Android de los avisos de turnos (ENG-204). Espeja `APPOINTMENTS_CHANNEL_ID` del backend. */
export const APPOINTMENTS_CHANNEL_ID = 'turnos';

/** Los avisos de un turno que llegan por push (ENG-204). */
const APPOINTMENT_PUSH_TYPES = ['TURNO_CANCELADO_PROFESIONAL', 'REEMBOLSO_TOTAL'] as const;

/** Lo que el backend pone en `data` del push de un turno. */
export interface AppointmentPushData {
  tipo: (typeof APPOINTMENT_PUSH_TYPES)[number];
  appointmentId: string;
}

/** Lee la `data` de un aviso de turno; `null` si es otra cosa. */
export function appointmentPushData(data: unknown): AppointmentPushData | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as Record<string, unknown>;
  const tipo = APPOINTMENT_PUSH_TYPES.find((t) => t === d.tipo);
  if (!tipo || typeof d.appointmentId !== 'string' || d.appointmentId === '') return null;
  return { tipo, appointmentId: d.appointmentId };
}

/** A dónde lleva tocar un aviso: la conversación del mensaje o el turno. */
export type PushTarget =
  { kind: 'conversacion'; data: MessagePushData } | { kind: 'turno'; appointmentId: string };

/** Qué aviso es y a dónde lleva. `null` si la app no lo entiende. */
export function pushTarget(data: unknown): PushTarget | null {
  const mensaje = messagePushData(data);
  if (mensaje) return { kind: 'conversacion', data: mensaje };
  const turno = appointmentPushData(data);
  if (turno) return { kind: 'turno', appointmentId: turno.appointmentId };
  return null;
}

/** Para no volver a explicar el permiso en cada inicio si el paciente dijo "Ahora no". */
const ASKED_KEY = 'push-permiso-explicado';

/** Lo que el backend pone en `data` del push de un mensaje nuevo. */
export interface MessagePushData {
  tipo: 'NUEVO_MENSAJE';
  conversationId: string;
  contraparteId: string;
  nombre: string;
}

/** Lee la `data` de una notificación: solo los avisos de mensaje se entienden. */
export function messagePushData(data: unknown): MessagePushData | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as Record<string, unknown>;
  if (
    d.tipo !== 'NUEVO_MENSAJE' ||
    typeof d.conversationId !== 'string' ||
    typeof d.contraparteId !== 'string' ||
    typeof d.nombre !== 'string'
  ) {
    return null;
  }
  return {
    tipo: 'NUEVO_MENSAJE',
    conversationId: d.conversationId,
    contraparteId: d.contraparteId,
    nombre: d.nombre,
  };
}

/**
 * El canal de Android. `PRIVATE`: con el bloqueo con PIN o huella, Android
 * muestra "MediConnect" y oculta quién escribió hasta desbloquear.
 */
async function ensureChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(MESSAGES_CHANNEL_ID, {
    name: 'Mensajes',
    description: 'Cuando un profesional te escribe.',
    importance: Notifications.AndroidImportance.HIGH,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
  });
  // ENG-204: un cambio en un turno (el profesional lo canceló, el reembolso).
  await Notifications.setNotificationChannelAsync(APPOINTMENTS_CHANNEL_ID, {
    name: 'Turnos',
    description: 'Cuando cambia un turno tuyo.',
    importance: Notifications.AndroidImportance.HIGH,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
  });
}

/** Explica para qué es el permiso antes de que Android lo pida. `true` si quiere activarlo. */
function explain(): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(
      'Avisos de mensajes',
      'Te avisamos cuando un profesional te escribe. El aviso dice quién te escribió, no lo que te escribió.',
      [
        { text: 'Ahora no', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Activar', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}

/** El token de Expo de este celular, con el `projectId` de EAS. */
async function deviceToken(): Promise<string> {
  const projectId = (Constants.expoConfig?.extra?.eas as { projectId?: string } | undefined)
    ?.projectId;
  const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
  return data;
}

/**
 * Pide el permiso si hace falta y registra el token en el backend. Se llama con
 * la sesión iniciada. **Nunca tira**: sin push la app funciona igual, y el
 * mensaje queda en el chat y en el aviso in-app.
 */
export async function registerForPush(): Promise<void> {
  try {
    await ensureChannel();

    // Android 13+ da `denied` con `canAskAgain` antes de la primera pregunta,
    // no `undetermined`: lo que dice si todavía se puede pedir es `canAskAgain`.
    const actual = await Notifications.getPermissionsAsync();
    let { status } = actual;
    if (status !== 'granted' && actual.canAskAgain) {
      // Se explica una sola vez. Si dijo "Ahora no", puede activarlo después
      // desde los ajustes del celular.
      if ((await SecureStore.getItemAsync(ASKED_KEY)) === '1') return;
      // La marca va después de la respuesta: si la app se cierra con el cartel
      // abierto, la próxima vez se vuelve a explicar.
      const quiere = await explain();
      await SecureStore.setItemAsync(ASKED_KEY, '1');
      if (!quiere) return;
      ({ status } = await Notifications.requestPermissionsAsync());
    }
    if (status !== 'granted') return;

    const token = await deviceToken();

    await apiRequest<void>('/push-tokens', {
      method: 'POST',
      body: { token, platform: Platform.OS === 'ios' ? 'ios' : 'android' },
      fallbackMessage: 'No pudimos activar los avisos.',
    });
  } catch (err) {
    // Emulador sin Google Play, sin credenciales de FCM en EAS, sin red…
    console.warn('No se pudieron activar las notificaciones push.', err);
  }
}

/**
 * Borra el token del backend. Va **antes** de soltar la sesión: sin el access
 * token el backend no sabe de quién es. **Nunca tira**: no frena el cierre de sesión;
 * el próximo que ingrese en este celular se queda con el token (el backend lo
 * reasigna al registrarlo).
 */
export async function unregisterFromPush(): Promise<void> {
  // La explicación del permiso es de esta persona: el próximo que ingrese en el
  // celular la ve de nuevo, y en el dispositivo no queda nada de la sesión.
  await SecureStore.deleteItemAsync(ASKED_KEY).catch(() => {});
  try {
    // El token se le pide al sistema, no a lo que registró esta sesión: si el
    // registro al abrir la app falló (sin red), el backend puede tener el token
    // de una sesión anterior y el celular seguiría recibiendo los avisos.
    if ((await Notifications.getPermissionsAsync()).status !== 'granted') return;
    const token = await deviceToken();
    await apiRequest<void>(`/push-tokens/${encodeURIComponent(token)}`, {
      method: 'DELETE',
      fallbackMessage: 'No pudimos desactivar los avisos.',
    });
  } catch (err) {
    console.warn('No se pudo borrar el token de push.', err);
  }
}
