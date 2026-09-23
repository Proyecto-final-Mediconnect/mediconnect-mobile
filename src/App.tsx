import { Manrope_400Regular } from '@expo-google-fonts/manrope/400Regular';
import { Manrope_500Medium } from '@expo-google-fonts/manrope/500Medium';
import { Manrope_600SemiBold } from '@expo-google-fonts/manrope/600SemiBold';
import { Manrope_700Bold } from '@expo-google-fonts/manrope/700Bold';
import { Newsreader_400Regular } from '@expo-google-fonts/newsreader/400Regular';
import { useFonts } from 'expo-font';

import { RootNavigator } from './navigation/RootNavigator';

/**
 * Componente raíz de la app: carga las fuentes y monta el navegador raíz
 * (ADR-016, ENG-113).
 *
 * Hasta que las fuentes cargan no se dibuja nada —queda la pantalla de inicio de
 * Expo—: dibujar antes haría saltar todos los textos de la fuente del sistema a
 * la de la marca en el primer segundo. Si la carga falla se dibuja igual, con la
 * del sistema: es peor verse distinto que no abrir.
 *
 * La barra de estado no se pone acá: la pone cada pantalla, porque cambia de
 * color entre el azul noche del inicio y el blanco de las demás.
 */
export function App(): React.JSX.Element | null {
  const [cargadas, error] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Newsreader_400Regular,
  });

  if (!cargadas && !error) return null;

  return <RootNavigator />;
}
