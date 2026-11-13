import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as WebBrowser from 'expo-web-browser';
import { AppState, Linking } from 'react-native';

import { MY_APPOINTMENTS_KEY } from '../../appointments/hooks/use-appointments';
import { joinVideoConsultation } from '../api';
import type { VideoConsultationAccess } from '../types';

/**
 * Abre la sala en el navegador del sistema, dentro de la app
 * (SFSafariViewController en iOS, Custom Tabs en Android).
 *
 * Es Daily Prebuilt, la misma sala que la web embebe en un `<iframe>`. El
 * navegador pide los permisos de cámara y micrófono y, si se rechazan, Daily
 * explica cómo habilitarlos: la app no necesita permisos propios ni un SDK
 * nativo, y funciona en Expo Go.
 *
 * Si no se puede abrir de ninguna forma, tira: el botón lo muestra en vez de
 * dejar un toque que no hace nada a minutos de la consulta.
 */
export async function openRoom(access: Pick<VideoConsultationAccess, 'roomUrl'>): Promise<void> {
  try {
    const result = await WebBrowser.openBrowserAsync(access.roomUrl, {
      // Pantalla completa y sin barra de lectura: es una llamada, no un artículo.
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
      readerMode: false,
      enableBarCollapsing: false,
      dismissButtonStyle: 'close',
    });
    // En iOS la promesa se resuelve al cerrar el navegador. En Android, apenas
    // se abre (`opened`): la vuelta se detecta cuando la app vuelve al frente.
    if (result.type === WebBrowser.WebBrowserResultType.OPENED) await untilAppReturns();
  } catch {
    // En Android falla si no hay Custom Tabs (Chrome deshabilitado, por
    // ejemplo) o si ya hay otro navegador in-app abierto. Se prueba con el
    // navegador del sistema; si eso también falla, el error le llega a quien
    // llamó y se lo muestra al paciente.
    await Linking.openURL(access.roomUrl);
    await untilAppReturns();
  }
}

/**
 * Se resuelve cuando la app vuelve al frente después de haber salido: es la
 * señal de que el paciente cerró la sala (ENG-190). Espera la salida primero
 * porque el evento `active` puede llegar antes de que el navegador tape la app.
 */
function untilAppReturns(): Promise<void> {
  return new Promise((resolve) => {
    let salio = AppState.currentState !== 'active';
    const sub = AppState.addEventListener('change', (estado) => {
      if (estado !== 'active') {
        salio = true;
      } else if (salio) {
        sub.remove();
        resolve();
      }
    });
  });
}

/**
 * Pide la sala del turno. La URL que devuelve el backend no queda en la caché
 * de TanStack Query (`gcTime: 0`): lleva un meeting token y se pide de nuevo
 * cada vez que se entra.
 */
export function useJoinConsultation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: joinVideoConsultation,
    gcTime: 0,
    // Al volver de la sala el turno puede haber cambiado de estado (en curso,
    // completado): la lista tiene que decir lo que dice el servidor.
    onSettled: () => queryClient.invalidateQueries({ queryKey: MY_APPOINTMENTS_KEY }),
  });
}
