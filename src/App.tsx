import { StatusBar } from 'expo-status-bar';

import { HomeScreen } from './screens/HomeScreen';

/**
 * Componente raíz de la app.
 *
 * TODO(ENG-113): el ADR-016 ya definió la tecnología de navegación
 * (React Navigation 7 — ver `src/navigation/README.md`). Falta reemplazar este
 * render directo de la pantalla por el navegador raíz que ENG-113 expone desde
 * `src/navigation/`.
 */
export function App(): React.JSX.Element {
  return (
    <>
      <HomeScreen />
      <StatusBar style="auto" />
    </>
  );
}
