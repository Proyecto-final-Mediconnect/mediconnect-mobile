import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Keyboard, Platform } from 'react-native';

/** Aproximación de la curva con la que sube el teclado de iOS. */
const CURVA_TECLADO = Easing.bezier(0.17, 0.59, 0.4, 0.77);

interface KeyboardHeight {
  /** Si el teclado está abierto (o abriéndose). */
  abierto: boolean;
  /**
   * Cuánto tapa el teclado, animado a la par de él: va como margen de abajo de
   * la pantalla, que así sube junto con el teclado.
   */
  margen: Animated.Value;
}

/**
 * Sigue al teclado. En iOS escucha el "will" —antes de que suba— y anima el
 * margen con la duración del propio teclado; Android solo avisa el "did".
 *
 * Con `Animated` y no con `LayoutAnimation` ni `KeyboardAvoidingView`: el
 * primero no se aplicaba y el formulario saltaba de golpe mientras el teclado
 * todavía subía; el segundo calcula su margen un render después que el resto.
 */
export function useKeyboardHeight(): KeyboardHeight {
  const [abierto, setAbierto] = useState(false);
  const margen = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const mostrar = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const ocultar = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    function seguir(altura: number, duracion: number): void {
      setAbierto(altura > 0);
      Animated.timing(margen, {
        toValue: altura,
        duration: duracion,
        easing: CURVA_TECLADO,
        // Es un margen, una propiedad de layout: el driver nativo no la anima.
        useNativeDriver: false,
      }).start();
    }

    const alMostrar = Keyboard.addListener(mostrar, (e) =>
      seguir(e.endCoordinates.height, e.duration),
    );
    const alOcultar = Keyboard.addListener(ocultar, (e) => seguir(0, e.duration));
    return () => {
      alMostrar.remove();
      alOcultar.remove();
    };
  }, [margen]);

  return { abierto, margen };
}
