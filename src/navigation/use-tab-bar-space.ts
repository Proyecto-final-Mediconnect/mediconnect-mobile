import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';
import { useContext } from 'react';

/**
 * Cuánto espacio dejar abajo para que la barra de tabs, que flota encima del
 * contenido, no tape lo último de la pantalla. Es el alto que la barra informa
 * al dibujarse; fuera de las tabs (una pantalla apilada) es 0.
 */
export function useTabBarSpace(): number {
  return useContext(BottomTabBarHeightContext) ?? 0;
}
