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

/** Para no volver a explicar el permiso en cada inicio si el paciente dijo "Ahora no". */
const ASKED_KEY = 'push-permiso-explicado';

/** El token registrado en el backend con esta sesión, para borrarlo al salir. */
let registeredToken: string | null = null;

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

    const projectId = (Constants.expoConfig?.extra?.eas as { projectId?: string } | undefined)
      ?.projectId;
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });

    await apiRequest<void>('/push-tokens', {
      method: 'POST',
      body: { token, platform: Platform.OS === 'ios' ? 'ios' : 'android' },
      fallbackMessage: 'No pudimos activar los avisos.',
    });
    registeredToken = token;
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
  const token = registeredToken;
  registeredToken = null;
  if (!token) return;
  try {
    await apiRequest<void>(`/push-tokens/${encodeURIComponent(token)}`, {
      method: 'DELETE',
      fallbackMessage: 'No pudimos desactivar los avisos.',
    });
  } catch (err) {
    console.warn('No se pudo borrar el token de push.', err);
  }
}
