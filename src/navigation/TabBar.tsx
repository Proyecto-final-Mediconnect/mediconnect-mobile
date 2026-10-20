import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fonts, spacing } from '../shared/ui/theme';
import type { PatientTabParamList } from './types';

type IconName = ComponentProps<typeof Ionicons>['name'];

const TABS: Record<keyof PatientTabParamList, { label: string; icon: [IconName, IconName] }> = {
  Inicio: { label: 'Inicio', icon: ['home', 'home-outline'] },
  Turnos: { label: 'Turnos', icon: ['calendar', 'calendar-outline'] },
  Reservar: { label: 'Reservar', icon: ['add', 'add'] },
  MediPass: { label: 'MediPass', icon: ['qr-code', 'qr-code-outline'] },
  Perfil: { label: 'Perfil', icon: ['person', 'person-outline'] },
};

/**
 * La barra de tabs del canvas: blanca, con un borde arriba y la activa en teal.
 *
 * Se aparta del canvas en tres cosas, las tres por uso en un teléfono real:
 * - Lleva íconos. El canvas tiene solo texto; con íconos la tab se reconoce sin
 *   leer, que es como se usa una barra de tabs.
 * - El rótulo inactivo es `muted` y no `mutedSoft`: el gris del canvas da 2.6:1
 *   sobre blanco, y a 11px no se lee.
 * - Cada tab ocupa su quinto de ancho y 48pt de alto, el mínimo cómodo para el
 *   dedo; en el canvas el área tocable era solo la palabra.
 *
 * Y suma "Reservar" en el centro, con el ícono en un círculo teal: es la acción
 * principal del paciente y tiene que distinguirse de las secciones. No flota
 * por encima de la barra; un botón que se sale de la barra tapa contenido y en
 * pantallas chicas queda incómodo.
 */
export function TabBar({ state, navigation }: BottomTabBarProps): React.JSX.Element {
  const insets = useSafeAreaInsets();

  return (
    <View
      accessibilityRole="tablist"
      style={[styles.barra, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}
    >
      {state.routes.map((route, index) => {
        const activa = state.index === index;
        const tab = TABS[route.name as keyof PatientTabParamList];
        const color = activa ? colors.brandHover : colors.muted;

        const alTocar = (): void => {
          const evento = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!activa && !evento.defaultPrevented) navigation.navigate(route.name);
        };

        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
            aria-selected={activa}
            onPress={alTocar}
            style={styles.tab}
          >
            {route.name === 'Reservar' ? (
              <View style={[styles.reservar, activa && styles.reservarActiva]}>
                <Ionicons name="add" size={24} color={colors.white} />
              </View>
            ) : (
              <Ionicons name={tab.icon[activa ? 0 : 1]} size={22} color={color} />
            )}
            <Text style={[styles.rotulo, { color }]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  barra: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: spacing.sm,
  },
  tab: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', gap: 3 },
  rotulo: { fontFamily: fonts.semibold, fontSize: 11, letterSpacing: 0.3 },
  reservar: {
    width: 34,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brandHover,
  },
  reservarActiva: { backgroundColor: colors.brandDeep },
});
