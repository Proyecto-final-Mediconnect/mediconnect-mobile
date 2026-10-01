import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, fonts, fontSize, spacing } from './theme';

interface FilterChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

/** Un filtro que se prende y se apaga: especialidad, tope de precio. */
export function FilterChip({ label, selected, onPress }: FilterChipProps): React.JSX.Element {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      aria-pressed={selected}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        selected ? styles.activo : styles.inactivo,
        pressed && !selected && styles.presionado,
      ]}
    >
      <Text style={[styles.texto, selected && styles.textoActivo]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: 36,
    justifyContent: 'center',
    borderRadius: 18,
    paddingHorizontal: spacing.lg,
  },
  activo: { backgroundColor: colors.brandDeep },
  inactivo: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line },
  presionado: { borderColor: colors.brand },
  texto: { fontFamily: fonts.semibold, fontSize: fontSize.sm, color: colors.ink },
  textoActivo: { fontFamily: fonts.bold, color: colors.white },
});
