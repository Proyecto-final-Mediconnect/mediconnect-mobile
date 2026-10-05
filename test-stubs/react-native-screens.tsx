import type { ReactNode } from 'react';
import { View } from 'react-native';

/*
 * Stub de `react-native-screens` para Vitest (ADR-016 §Verificación).
 *
 * El paquete publica fuente con sintaxis Flow sin transpilar y Vite no la puede
 * parsear. Con `screensEnabled()` en `false`, React Navigation cae a su camino
 * de `View` comunes, que es el que corre en web: los navegadores se montan y
 * navegan igual, sin las optimizaciones nativas que en un test no importan.
 */

function Passthrough({ children }: { children?: ReactNode }): React.JSX.Element {
  return <>{children}</>;
}

export const screensEnabled = (): boolean => false;
export const enableScreens = (): void => {};
export const compatibilityFlags = {};
export const isSearchBarAvailableForCurrentPlatform = false;

export const Screen = View;
export const ScreenContainer = View;
export const ScreenStack = View;
export const ScreenStackItem = View;
export const ScreenFooter = Passthrough;
export const ScreenStackHeaderBackButtonImage = Passthrough;
export const ScreenStackHeaderCenterView = Passthrough;
export const ScreenStackHeaderLeftView = Passthrough;
export const ScreenStackHeaderRightView = Passthrough;
export const ScreenStackHeaderSearchBarView = Passthrough;
export const SearchBar = Passthrough;
export const Tabs = { Host: View, Screen: View };
