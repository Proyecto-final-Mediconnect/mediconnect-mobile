import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { AppointmentsScreen } from '../screens/AppointmentsScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { MediPassScreen } from '../screens/MediPassScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { TabBar } from './TabBar';
import type { PatientTabParamList } from './types';

const Tab = createBottomTabNavigator<PatientTabParamList>();

/**
 * Las tabs del paciente, las del canvas: Inicio, Turnos, MediPass y Perfil. La
 * historia clínica no es una tab: se abre desde su tarjeta en el inicio.
 */
export function PatientTabs(): React.JSX.Element {
  return (
    <Tab.Navigator tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Inicio" component={HomeScreen} />
      <Tab.Screen name="Turnos" component={AppointmentsScreen} />
      <Tab.Screen name="MediPass" component={MediPassScreen} />
      <Tab.Screen name="Perfil" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
