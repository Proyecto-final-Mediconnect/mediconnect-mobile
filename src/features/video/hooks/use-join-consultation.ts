import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as WebBrowser from 'expo-web-browser';

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
 */
export async function openRoom(access: VideoConsultationAccess): Promise<void> {
  await WebBrowser.openBrowserAsync(access.roomUrl, {
    // Pantalla completa y sin barra de lectura: es una llamada, no un artículo.
    presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
    readerMode: false,
    enableBarCollapsing: false,
    dismissButtonStyle: 'close',
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
