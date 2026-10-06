import { DefaultTheme, NavigationContainer, type Theme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { SessionProvider, useSession } from '../features/auth/session';
import { ClinicalRecordScreen } from '../screens/ClinicalRecordScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { ErrorState, LoadingState } from '../shared/ui/StatusViews';
import { colors } from '../shared/ui/theme';
import { PatientTabs } from './PatientTabs';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

// Los colores de la marca aplicados a lo que dibuja el navegador por su cuenta:
// fondo de las pantallas, headers, barra de tabs y bordes.
const tema: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.brandHover,
    background: colors.surface,
    card: colors.white,
    text: colors.brandDeep,
    border: colors.line,
    notification: colors.danger,
  },
};

/**
 * Navegador raíz (ADR-016).
 *
 * Es un stack con las tabs abajo y, encima, las pantallas que se abren desde
 * ellas y tapan la barra —la historia clínica—. Ningún navegador dibuja header:
 * lo pone cada pantalla con `ScreenHeader`, porque en el canvas cambia de una a
 * otra.
 *
 * Elige entre el lado público y el privado según la sesión (ENG-114), con el
 * mismo patrón que el `RequireAuth` de la web: navegadores condicionales, no un
 * chequeo dentro de cada pantalla. Sin sesión, las pantallas privadas no
 * existen en el navegador, así que no hay forma de llegar a ellas; al cerrar
 * sesión se desmontan y no queda nada del paciente anterior en pantalla.
 */
export function RootNavigator(): React.JSX.Element {
  return (
    <SafeAreaProvider>
      <SessionProvider>
        <RootStack />
      </SessionProvider>
    </SafeAreaProvider>
  );
}

function RootStack(): React.JSX.Element {
  const { state, retry } = useSession();

  // Mientras se lee el secure store y se verifica la sesión, al abrir la app:
  // mostrar el ingreso un instante y después saltar al inicio sería peor que
  // esperar.
  //
  // Estos dos estados van fuera del `NavigationContainer` a propósito. Si el
  // contenedor se monta vacío y el navegador aparece después, hay un momento en
  // que la pantalla ya se ve pero la navegación todavía no registró su estado, y
  // un `navigate()` en ese momento se pierde: un toque que no hace nada.
  if (state.status === 'restoring') {
    return (
      <View style={styles.fondo}>
        <LoadingState label="Abriendo MediConnect…" />
      </View>
    );
  }

  // Hay una sesión guardada pero no se pudo verificar. Mandar al ingreso
  // obligaría a escribir la contraseña por un problema de señal.
  if (state.status === 'unreachable') {
    return (
      <View style={styles.fondo}>
        <ErrorState message={state.message} onRetry={retry} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={tema}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {state.status === 'signedIn' ? (
          <Stack.Group>
            <Stack.Screen name="Paciente" component={PatientTabs} />
            <Stack.Screen name="HistoriaClinica" component={ClinicalRecordScreen} />
          </Stack.Group>
        ) : (
          <Stack.Screen
            name="Ingresar"
            component={LoginScreen}
            // Al cerrar sesión, la animación de "volver" sugeriría que se puede
            // ir para adelante de nuevo.
            options={{ animationTypeForReplace: 'pop' }}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// El mismo fondo que las pantallas (`Screen`), para que no haya un salto de
// color al pasar de "Abriendo…" al ingreso o al inicio.
const styles = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: colors.surface },
});
