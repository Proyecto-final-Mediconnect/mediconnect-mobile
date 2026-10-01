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
 * Raíz. Con sesión, las tabs y encima las pantallas que se abren desde ellas
 * —la historia clínica se abre desde el inicio—. Sin sesión, el ingreso
 * (ENG-114). `RootNavigator` monta solo uno de los dos lados.
 */
export type RootStackParamList = {
  Ingresar: undefined;
  Paciente: NavigatorScreenParams<PatientTabParamList>;
  HistoriaClinica: undefined;
  EntradaHC: { id: string };
};

// Tipa `useNavigation()` en toda la app sin pasarle el genérico cada vez.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface RootParamList extends RootStackParamList {}
  }
}
