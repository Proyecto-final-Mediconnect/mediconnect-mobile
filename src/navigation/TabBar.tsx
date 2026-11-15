import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fonts, fontSize, spacing } from '../shared/ui/theme';
import type { PatientTabParamList } from './types';

type IconName = ComponentProps<typeof Ionicons>['name'];

const TABS: Record<keyof PatientTabParamList, { label: string; icon: [IconName, IconName] }> = {
  Inicio: { label: 'Inicio', icon: ['home', 'home-outline'] },
  Turnos: { label: 'Turnos', icon: ['calendar', 'calendar-outline'] },
  MediPass: { label: 'MediPass', icon: ['qr-code', 'qr-code'] },
  Reservar: { label: 'Reservar', icon: ['add-circle', 'add-circle-outline'] },
  Perfil: { label: 'Perfil', icon: ['person', 'person-outline'] },
};

/** Lado del botón central del MediPass, y cuánto sobresale de la barra. */
const CENTRO = 58;
const SOBRESALE = 22;

/**
 * La barra de tabs del paciente.
 *
 * El MediPass va en el centro, en un círculo azul noche que sobresale de la
 * barra: es lo que distingue a MediConnect y lo que se abre con apuro, en una
 * guardia, así que tiene que encontrarse sin buscarlo. Sobresale poco y con un
 * aro blanco, para no tapar contenido ni confundirse con él.
 *
 * Las demás tabs: ícono y rótulo, la activa en teal con una barrita arriba (se
 * reconoce sin depender solo del color). Cada una ocupa su quinto de ancho y
 * 48pt de alto, el mínimo cómodo para el dedo. El rótulo inactivo es `muted`:
 * `mutedSoft` da 2.6:1 sobre blanco y a 11px no se lee.
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
        const nombre = route.name as keyof PatientTabParamList;
        const tab = TABS[nombre];
        const color = activa ? colors.brandHover : colors.muted;

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
              style={styles.tab}
            >
              {({ pressed }) => (
                <>
                  <View
                    style={[
                      styles.centro,
                      activa && styles.centroActivo,
                      pressed && styles.centroPresionado,
                    ]}
                  >
                    <Ionicons name="qr-code" size={24} color={colors.white} />
                  </View>
                  <Text
                    style={[styles.rotulo, styles.rotuloCentro, { color }, activa && styles.activo]}
                  >
                    {tab.label}
                  </Text>
                </>
              )}
            </Pressable>
          );
        }

        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
            aria-selected={activa}
            onPress={alTocar}
            style={({ pressed }) => [styles.tab, pressed && styles.presionada]}
          >
            <View style={[styles.marca, activa && styles.marcaActiva]} />
            <Ionicons name={tab.icon[activa ? 0 : 1]} size={22} color={color} />
            <Text style={[styles.rotulo, { color }, activa && styles.activo]}>{tab.label}</Text>
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
    // Una sombra suave hacia arriba en vez del borde duro: la barra se separa
    // del contenido sin cortar la pantalla con una línea.
    shadowColor: colors.night,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
    elevation: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
  },
  tab: { flex: 1, minHeight: 52, alignItems: 'center', justifyContent: 'flex-end', gap: 3 },
  presionada: { opacity: 0.6 },
  marca: { width: 20, height: 3, borderRadius: 2, marginBottom: 5 },
  marcaActiva: { backgroundColor: colors.brandHover },
  rotulo: { fontFamily: fonts.semibold, fontSize: fontSize.xs, letterSpacing: 0.2 },
  activo: { fontFamily: fonts.bold },
  rotuloCentro: { marginTop: 2 },
  centro: {
    width: CENTRO,
    height: CENTRO,
    borderRadius: CENTRO / 2,
    marginTop: -SOBRESALE,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.night,
    borderWidth: 4,
    borderColor: colors.white,
    shadowColor: colors.night,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  centroActivo: { backgroundColor: colors.brandHover },
  centroPresionado: { transform: [{ scale: 0.94 }] },
});
