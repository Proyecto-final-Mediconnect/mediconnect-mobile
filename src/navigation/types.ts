import type { NavigatorScreenParams } from '@react-navigation/native';

/**
 * Rutas de la app. Con React Navigation se mantienen a mano (ADR-016): agregar
 * una pantalla es sumarla acá y en su navegador.
 */

/** Las tabs del paciente, las del canvas ("App paciente"). */
export type PatientTabParamList = {
  Inicio: undefined;
  Turnos: undefined;
  MediPass: undefined;
  Perfil: undefined;
};

/**
 * Raíz. Las tabs, y encima las pantallas que se abren desde ellas —la historia
 * clínica se abre desde el inicio—. El lado público (login) lo suma ENG-114, y
 * `RootNavigator` elige entre los dos según la sesión.
 */
export type RootStackParamList = {
  Paciente: NavigatorScreenParams<PatientTabParamList>;
  HistoriaClinica: undefined;
};

// Tipa `useNavigation()` en toda la app sin pasarle el genérico cada vez.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface RootParamList extends RootStackParamList {}
  }
}
