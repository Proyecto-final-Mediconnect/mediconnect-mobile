import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, fontSize, radius, spacing } from './theme';

interface SegmentedControlProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}

/**
 * El selector "Próximos / Pasados" del canvas: la opción elegida en azul
 * profundo, las otras con borde. Es un grupo de tabs para quien usa lector de
 * pantalla, no dos botones sueltos.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: SegmentedControlProps<T>): React.JSX.Element {
  return (
    <View accessibilityRole="tablist" style={styles.grupo}>
      {options.map((opcion) => {
        const activa = opcion.value === value;
        return (
          <Pressable
            key={opcion.value}
            accessibilityRole="tab"
            accessibilityLabel={opcion.label}
            aria-selected={activa}
            onPress={() => onChange(opcion.value)}
            style={[styles.opcion, activa ? styles.activa : styles.inactiva]}
          >
            <Text style={[styles.texto, activa && styles.textoActivo]}>{opcion.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grupo: { flexDirection: 'row', gap: 6, marginTop: spacing.md },
  opcion: {
    minHeight: 36,
    justifyContent: 'center',
    borderRadius: radius.button - 2,
    paddingHorizontal: spacing.lg,
  },
  activa: { backgroundColor: colors.brandDeep },
  inactiva: { borderWidth: 1, borderColor: colors.line },
  texto: { fontFamily: fonts.semibold, fontSize: fontSize.sm, color: colors.muted },
  textoActivo: { fontFamily: fonts.bold, color: colors.white },
});
