import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Keyboard, Platform, type LayoutChangeEvent } from 'react-native';

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
  /**
   * Va en el `onLayout` del contenedor de la pantalla (el que lleva el margen).
   * En Android sirve para saber si la ventana ya se achicó sola con el teclado.
   */
  onLayout: (e: LayoutChangeEvent) => void;
}

/**
 * Sigue al teclado. En iOS escucha el "will" —antes de que suba— y anima el
 * margen con la duración del propio teclado; Android solo avisa el "did".
 *
 * Con `Animated` y no con `LayoutAnimation` ni `KeyboardAvoidingView`: el
 * primero no se aplicaba y el formulario saltaba de golpe mientras el teclado
 * todavía subía; el segundo calcula su margen un render después que el resto.
 *
 * **Android.** Depende de cómo corra la app:
 * - En Expo Go la ventana se achica sola al abrir el teclado (`adjustResize`):
 *   no hace falta margen, y agregarlo dejaría un hueco.
 * - En el APK (SDK 58, de borde a borde) la ventana no se achica y el teclado
 *   tapa el formulario: el margen tiene que ser el alto del teclado.
 * Por eso el margen es lo que el teclado tapa **menos lo que la ventana ya se
 * achicó**, medido con el `onLayout` del contenedor. Sirve para los dos casos
 * sin saber en cuál se está.
 */
export function useKeyboardHeight(): KeyboardHeight {
  const [abierto, setAbierto] = useState(false);
  const margen = useRef(new Animated.Value(0)).current;
  /** Alto del teclado (Android). */
  const teclado = useRef(0);
  /** Alto del contenedor con el teclado cerrado, y el de ahora (Android). */
  const altoBase = useRef(0);
  const altoActual = useRef(0);

  const animar = useCallback(
    (valor: number, duracion: number) => {
      Animated.timing(margen, {
        toValue: valor,
        duration: duracion,
        easing: CURVA_TECLADO,
        // Es un margen, una propiedad de layout: el driver nativo no la anima.
        useNativeDriver: false,
      }).start();
    },
    [margen],
  );

  /** Android: lo que el teclado tapa y la ventana no absorbió. */
  const recalcularAndroid = useCallback(
    (duracion: number) => {
      const achicada = Math.max(0, altoBase.current - altoActual.current);
      animar(Math.max(0, teclado.current - achicada), duracion);
    },
    [animar],
  );

  useEffect(() => {
    const mostrar = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const ocultar = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    function seguir(altura: number, duracion: number): void {
      setAbierto(altura > 0);
      if (Platform.OS === 'ios') {
        animar(altura, duracion);
        return;
      }
      teclado.current = altura;
      recalcularAndroid(duracion);
    }

    const alMostrar = Keyboard.addListener(mostrar, (e) =>
      seguir(e.endCoordinates.height, e.duration),
    );
    const alOcultar = Keyboard.addListener(ocultar, (e) => seguir(0, e.duration));
    return () => {
      alMostrar.remove();
      alOcultar.remove();
    };
  }, [animar, recalcularAndroid]);

  const onLayout = useCallback(
    (e: LayoutChangeEvent) => {
      if (Platform.OS !== 'android') return;
      const alto = e.nativeEvent.layout.height;
      altoActual.current = alto;
      // La base es el alto más grande visto: la ventana entera. Se toma el máximo
      // y no "el alto con el teclado cerrado" porque en Expo Go la ventana puede
      // achicarse antes de que llegue el aviso de que el teclado se abrió.
      if (alto > altoBase.current) altoBase.current = alto;
      if (teclado.current > 0) recalcularAndroid(0);
    },
    [recalcularAndroid],
  );

  return { abierto, margen, onLayout };
}
