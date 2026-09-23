import { DefaultTheme, NavigationContainer, type Theme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ClinicalRecordScreen } from '../screens/ClinicalRecordScreen';
import { EntryDetailScreen } from '../screens/EntryDetailScreen';
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
 * Hoy solo existe el lado privado. ENG-114 suma el login y la elección según la
 * sesión, con el mismo patrón que el `RequireAuth` de la web: navegadores
 * condicionales, no un chequeo dentro de cada pantalla.
 */
export function RootNavigator(): React.JSX.Element {
  return (
    <SafeAreaProvider>
      <NavigationContainer theme={tema}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Paciente" component={PatientTabs} />
          <Stack.Screen name="HistoriaClinica" component={ClinicalRecordScreen} />
          <Stack.Screen name="EntradaHC" component={EntryDetailScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
