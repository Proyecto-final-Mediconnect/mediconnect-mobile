import { StatusBar } from 'expo-status-bar';

import { HomeScreen } from './screens/HomeScreen';

/**
 * Componente raíz de la app.
 *
 * TODO(ADR-016): cuando se defina la tecnología de navegación (Expo Router vs
 * React Navigation) en el Sprint 1, reemplazar el render directo de la pantalla
 * por el navegador raíz expuesto desde `src/navigation/`.
 */
export function App(): React.JSX.Element {
  return (
    <>
      <HomeScreen />
      <StatusBar style="auto" />
    </>
  );
}
