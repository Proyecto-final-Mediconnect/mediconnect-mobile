import { Ionicons } from '@expo/vector-icons';
import {
  BottomTabBarHeightCallbackContext,
  type BottomTabBarProps,
} from '@react-navigation/bottom-tabs';
import { useContext, type ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Polyline } from 'react-native-svg';

import { colors, fonts, fontSize, radius, spacing } from '../shared/ui/theme';
import type { PatientTabParamList } from './types';

type IconName = ComponentProps<typeof Ionicons>['name'];

const TABS: Record<keyof PatientTabParamList, { label: string; icon: [IconName, IconName] }> = {
  Inicio: { label: 'Inicio', icon: ['home', 'home-outline'] },
  Turnos: { label: 'Turnos', icon: ['calendar', 'calendar-outline'] },
  MediPass: { label: 'MediPass', icon: ['heart', 'heart-outline'] },
  Reservar: { label: 'Reservar', icon: ['add-circle', 'add-circle-outline'] },
  Perfil: { label: 'Perfil', icon: ['person', 'person-outline'] },
};

/**
 * La barra de tabs del paciente: una barra azul noche, redondeada y separada de
 * los bordes, que flota de verdad: va encima del contenido, sin franja de fondo,
 * y la pantalla se ve alrededor y por debajo al desplazarse.
 *
 * El MediPass va en el centro, con el corazón y el latido del logo en teal (el
 * mismo que va en el centro del QR): es lo que distingue a
 * MediConnect y lo que se abre con apuro, en una guardia, así que el color lo
 * hace encontrar sin buscarlo.
 *
 * Las demás tabs: ícono y rótulo, la activa en blanco y las otras en el celeste
 * tenue de la noche (`onNight`, que se lee sobre el azul). Cada una ocupa su
 * quinto de ancho y 48pt de alto, el mínimo cómodo para el dedo.
 */
export function TabBar({ state, navigation }: BottomTabBarProps): React.JSX.Element {
  const insets = useSafeAreaInsets();
  // Las pantallas de las tabs usan este alto para dejar lugar abajo
  // (`useTabBarSpace`): la barra flota encima y no ocupa lugar propio.
  const informarAlto = useContext(BottomTabBarHeightCallbackContext);
  const enMediPass = state.routes[state.index]?.name === 'MediPass';

  return (
    <View
      // Solo la barra recibe toques: alrededor se sigue tocando la pantalla.
      pointerEvents="box-none"
      onLayout={(e) => informarAlto?.(e.nativeEvent.layout.height)}
      style={[styles.flota, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}
    >
      <View accessibilityRole="tablist" style={[styles.barra, enMediPass && styles.barraEnNoche]}>
        {state.routes.map((route, index) => {
          const activa = state.index === index;
          const nombre = route.name as keyof PatientTabParamList;
          const tab = TABS[nombre];

          const alTocar = (): void => {
            const evento = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!activa && !evento.defaultPrevented) navigation.navigate(route.name);
          };

          if (nombre === 'MediPass') {
            return (
              <Pressable
                key={route.key}
                accessibilityRole="tab"
                accessibilityLabel={tab.label}
                aria-selected={activa}
                onPress={alTocar}
                style={({ pressed }) => [styles.tab, pressed && styles.presionada]}
              >
                <Latido />
                <Text
                  style={[
                    styles.rotulo,
                    activa && styles.activo,
                    { color: activa ? colors.white : colors.onNight },
                  ]}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          }

          const color = activa ? colors.white : colors.onNight;
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityLabel={tab.label}
              aria-selected={activa}
              onPress={alTocar}
              style={({ pressed }) => [styles.tab, pressed && styles.presionada]}
            >
              <Ionicons name={tab.icon[activa ? 0 : 1]} size={22} color={color} />
              <Text style={[styles.rotulo, { color }, activa && styles.activo]}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/**
 * El corazón con el latido del logo de MediConnect, el mismo que va en el
 * centro del QR del MediPass: corazón teal y el trazo en el azul de la barra,
 * así parece recortado.
 */
function Latido(): React.JSX.Element {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24">
      <Path
        d="M12 21.4s-7.6-4.8-9.9-9.5A5.6 5.6 0 0 1 12 5.9a5.6 5.6 0 0 1 9.9 6c-2.3 4.7-9.9 9.5-9.9 9.5z"
        fill={colors.brandBright}
      />
      <Polyline
        points="4.6,13 8.8,13 10.5,9.4 13,16.6 14.7,11.8 15.8,13 19.4,13"
        fill="none"
        stroke={colors.night}
        strokeWidth={1.9}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  flota: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.md,
  },
  barra: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 60,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.card * 2,
    backgroundColor: colors.night,
    shadowColor: colors.night,
    shadowOpacity: 0.25,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  // Sobre el fondo noche del MediPass, un borde tenue la separa.
  barraEnNoche: { borderWidth: 1, borderColor: colors.nightBorder },
  tab: { flex: 1, minHeight: 52, alignItems: 'center', justifyContent: 'center', gap: 3 },
  presionada: { opacity: 0.6 },
  rotulo: { fontFamily: fonts.semibold, fontSize: fontSize.xs, letterSpacing: 0.2 },
  activo: { fontFamily: fonts.bold },
});
