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
 * Las tabs del paciente: las cuatro del canvas —Inicio, Turnos, MediPass y
 * Perfil— y, en el centro, Reservar (ENG-132): sacar un turno es lo que más hace
 * un paciente con la app, y así queda a un toque desde cualquier pantalla. La
 * historia clínica no es una tab: se abre desde su acceso en el inicio.
 */
export function PatientTabs(): React.JSX.Element {
  return (
    <Tab.Navigator tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Inicio" component={HomeScreen} />
      <Tab.Screen name="Turnos" component={AppointmentsScreen} />
      <Tab.Screen name="Reservar" component={ProfessionalsScreen} />
      <Tab.Screen name="MediPass" component={MediPassScreen} />
      <Tab.Screen name="Perfil" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
