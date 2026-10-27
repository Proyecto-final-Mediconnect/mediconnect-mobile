/**
 * `expo-status-bar` sin módulo nativo. Desde el SDK 58 importa `expo`, que al
 * cargarse arma el HMR de Metro y en jsdom no existe (ENG-181). En los tests la
 * barra de estado no se ve: no renderiza nada.
 */
export function StatusBar(): null {
  return null;
}
