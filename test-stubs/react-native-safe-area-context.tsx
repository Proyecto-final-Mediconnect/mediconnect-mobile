import { createContext, type ReactNode } from 'react';
import { View } from 'react-native';

/*
 * Stub de `react-native-safe-area-context` para Vitest (ADR-016 §Verificación).
 *
 * Mismo problema que `react-native-screens`: fuente Flow sin transpilar. En jsdom
 * no hay notch ni barra de gestos, así que los márgenes seguros son cero.
 */

const insets = { top: 0, right: 0, bottom: 0, left: 0 };
const frame = { x: 0, y: 0, width: 390, height: 844 };

export const initialWindowMetrics = { insets, frame };
export const SafeAreaInsetsContext = createContext(insets);
export const SafeAreaFrameContext = createContext(frame);

export function SafeAreaProvider({ children }: { children?: ReactNode }): React.JSX.Element {
  return <>{children}</>;
}

export const SafeAreaView = View;
export const useSafeAreaInsets = (): typeof insets => insets;
export const useSafeAreaFrame = (): typeof frame => frame;
