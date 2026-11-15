import { useEffect } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

export const TYPING_ANNOUNCEMENT = 'La otra persona está escribiendo…';

/**
 * Anuncia "escribiendo…" a los lectores de pantalla en iOS, donde
 * `accessibilityLiveRegion` no existe (en Android lo cubre la región viva del
 * texto, y anunciarlo dos veces sería ruido). Solo al pasar a `true`: el aviso
 * se renueva cada pocos segundos pero el estado no cambia, así que no se repite
 * mientras la otra persona sigue tipeando.
 */
export function useTypingAnnouncement(escribiendo: boolean): void {
  useEffect(() => {
    if (escribiendo && Platform.OS === 'ios') {
      AccessibilityInfo.announceForAccessibility(TYPING_ANNOUNCEMENT);
    }
  }, [escribiendo]);
}
