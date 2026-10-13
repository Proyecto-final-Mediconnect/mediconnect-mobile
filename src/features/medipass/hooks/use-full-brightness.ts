import { useFocusEffect } from '@react-navigation/native';
import * as Brightness from 'expo-brightness';
import { useCallback } from 'react';
import { AppState } from 'react-native';

/**
 * Brillo al máximo mientras la pantalla del MediPass está enfocada, y de vuelta
 * al que estaba al salir (ENG-117: "el QR se ve con brillo suficiente"). Con el
 * brillo bajo, otro teléfono no lee el código, y en una guardia no hay tiempo
 * para que el paciente lo suba a mano.
 *
 * También se devuelve al pasar a segundo plano —el foco no cambia al minimizar,
 * y en iOS el brillo es el del sistema, no el de la app— y se vuelve a subir al
 * volver.
 *
 * Si el sistema no deja cambiarlo, se sigue sin él: el código se muestra igual.
 */
export function useFullBrightness(): void {
  useFocusEffect(
    useCallback(() => {
      let previo: number | null = null;
      let activo = true;

      const subir = async (): Promise<void> => {
        try {
          previo = await Brightness.getBrightnessAsync();
          if (activo) await Brightness.setBrightnessAsync(1);
        } catch {
          // Sin permiso o sin soporte: el QR se muestra con el brillo que haya.
        }
      };
      const restaurar = (): void => {
        if (previo !== null) void Brightness.setBrightnessAsync(previo).catch(() => undefined);
        previo = null;
      };

      void subir();
      const sub = AppState.addEventListener('change', (estado) => {
        if (estado === 'active') void subir();
        else restaurar();
      });

      return () => {
        activo = false;
        sub.remove();
        restaurar();
      };
    }, []),
  );
}
