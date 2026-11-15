import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { AppointmentsScreen } from '../screens/AppointmentsScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { MediPassScreen } from '../screens/MediPassScreen';
import { ProfessionalsScreen } from '../screens/ProfessionalsScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { TabBar } from './TabBar';
import type { PatientTabParamList } from './types';

const Tab = createBottomTabNavigator<PatientTabParamList>();

/**
 * Las tabs del paciente: Inicio, Turnos, MediPass, Reservar (ENG-132) y Perfil.
 * El MediPass va en el centro y destacado (ver `TabBar`): es lo que distingue a
 * MediConnect y lo que se abre con apuro. Reservar queda igual a un toque desde
 * cualquier pantalla. La historia clínica no es una tab: se abre desde su
 * acceso en el inicio.
 */
export function PatientTabs(): React.JSX.Element {
  return (
    <Tab.Navigator tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Inicio" component={HomeScreen} />
      <Tab.Screen name="Turnos" component={AppointmentsScreen} />
      <Tab.Screen name="MediPass" component={MediPassScreen} />
      <Tab.Screen name="Reservar" component={ProfessionalsScreen} />
      <Tab.Screen name="Perfil" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
