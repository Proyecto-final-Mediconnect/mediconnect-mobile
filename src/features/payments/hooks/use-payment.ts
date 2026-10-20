import { useMutation, useQuery } from '@tanstack/react-query';
import * as WebBrowser from 'expo-web-browser';
import { Linking } from 'react-native';

import { getPaymentStatus, startCheckout } from '../api';
import { paymentOutcomeOf } from '../lib/payment';
import type { PaymentStatus } from '../types';

/** Cada cuánto se vuelve a preguntar mientras se espera el webhook. */
export const POLL_INTERVAL_MS = 2_000;

/**
 * Pide el link de pago. **Sin reintento automático**: es una escritura contra
 * un proveedor de pagos, y un reintento silencioso solo demora el error.
 */
export function useStartCheckout() {
  return useMutation({ mutationFn: startCheckout, retry: false });
}

/**
 * Estado del pago del turno. Con `poll`, pregunta cada {@link POLL_INTERVAL_MS}
 * hasta que haya un resultado: MercadoPago devuelve al paciente antes de mandar
 * el webhook, así que al volver lo normal es encontrarlo todavía pendiente.
 */
export function usePaymentStatus(
  appointmentId: string,
  poll: boolean,
  statusBeforeCheckout: PaymentStatus | 'SIN_INICIAR' | null,
) {
  return useQuery({
    queryKey: ['payment', appointmentId] as const,
    queryFn: () => getPaymentStatus(appointmentId),
    enabled: poll,
    // Un corte de red de un segundo no tiene que terminar en un error en el
    // momento más sensible del flujo.
    retry: 2,
    gcTime: 0,
    refetchInterval: (query) => {
      if (!poll) return false;
      const data = query.state.data;
      return data && paymentOutcomeOf(data, statusBeforeCheckout) !== 'ESPERANDO'
        ? false
        : POLL_INTERVAL_MS;
    },
  });
}

/**
 * Abre el checkout de MercadoPago en el navegador dentro de la app. Si no abre
 * (Android sin Custom Tabs), prueba con el del sistema; si tampoco, tira y la
 * pantalla lo muestra.
 *
 * Devuelve `true` si ya se sabe que el paciente cerró el navegador. En iOS la
 * promesa se resuelve al cerrarlo; en Android se resuelve enseguida (`opened`)
 * y no hay forma de saberlo desde acá: la pantalla lo detecta cuando la app
 * vuelve al primer plano.
 */
export async function openCheckout(checkoutUrl: string): Promise<boolean> {
  try {
    const result = await WebBrowser.openBrowserAsync(checkoutUrl, {
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
      dismissButtonStyle: 'close',
    });
    return result.type !== WebBrowser.WebBrowserResultType.OPENED;
  } catch {
    await Linking.openURL(checkoutUrl);
    return false;
  }
}
