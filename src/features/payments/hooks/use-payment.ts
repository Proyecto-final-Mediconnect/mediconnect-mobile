import { useMutation, useQuery } from '@tanstack/react-query';
import * as WebBrowser from 'expo-web-browser';
import { Linking } from 'react-native';

import { getPaymentStatus, startCheckout } from '../api';
import { paymentOutcomeOf } from '../lib/payment';
import type { PaymentStatus } from '../types';

/** Cada cuánto se vuelve a preguntar mientras se espera el webhook. */
export const POLL_INTERVAL_MS = 2_000;

/**
 * Adónde vuelve MercadoPago al terminar (ENG-172): el backend arma los
 * `back_urls` como `mediconnect://pago/{id}?resultado=…`, con el `scheme` del
 * `app.json`. En Expo Go el esquema es otro y no aplica: ahí la vuelta se sigue
 * detectando con `AppState`, como antes.
 */
export const CHECKOUT_RETURN_URL = 'mediconnect://pago';

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
 * Abre el checkout de MercadoPago en el navegador dentro de la app, como una
 * sesión que se cierra sola cuando MercadoPago redirige a
 * {@link CHECKOUT_RETURN_URL} (ENG-172). Si no abre (Android sin Custom Tabs),
 * prueba con el del sistema; si tampoco, tira y la pantalla lo muestra.
 *
 * Devuelve `true` si ya se sabe que el paciente terminó: volvió por el link o
 * cerró el navegador a mano (`false` si no se llegó a abrir porque ya había otra
 * sesión). El `?resultado=` del link **no se usa**: lo dispara
 * el navegador y no confirma nada; el resultado lo sigue leyendo la pantalla
 * del backend. Con el navegador del sistema no hay forma de saberlo desde acá,
 * y la pantalla lo detecta cuando la app vuelve al primer plano.
 */
export async function openCheckout(checkoutUrl: string): Promise<boolean> {
  try {
    const result = await WebBrowser.openAuthSessionAsync(checkoutUrl, CHECKOUT_RETURN_URL, {
      dismissButtonStyle: 'close',
      // En iOS la sesión comparte cookies con Safari: no dejar la de MercadoPago
      // del paciente guardada en el celular.
      preferEphemeralSession: true,
    });
    // `locked`: ya había otra sesión abierta y no se abrió ningún navegador.
    return result.type !== WebBrowser.WebBrowserResultType.LOCKED;
  } catch {
    await Linking.openURL(checkoutUrl);
    return false;
  }
}
