import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { colors, fonts, fontSize, radius, spacing } from './theme';

interface ButtonProps {
  label: string;
  onPress: () => void;
  /**
   * `night` y `nightDanger` son para el fondo azul noche (el MediPass): un
   * contorno tenue con texto blanco, o en el rojo que se lee sobre la noche.
   */
  variant?: 'primary' | 'accent' | 'danger' | 'secondary' | 'ghost' | 'night' | 'nightDanger';
  /** `sm`: acción secundaria compacta, que no ocupa todo el ancho de la pantalla. */
  size?: 'md' | 'sm';
  disabled?: boolean;
  /** Muestra un indicador en lugar del texto y bloquea el botón. */
  loading?: boolean;
  fullWidth?: boolean;
}

// Equivalente al `Button` de la web. `primary` usa el azul profundo y no el
// teal por la misma razón que allá: el blanco sobre #14b8a6 da 2.2:1, debajo del
// mínimo de WCAG AA. `accent` es el CTA teal del canvas ("Ingresar a la sala",
// "Compartir acceso temporal"), con texto casi negro en lugar de blanco.
export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  fullWidth = false,
  size = 'md',
}: ButtonProps): React.JSX.Element {
  const bloqueado = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      aria-disabled={bloqueado}
      aria-busy={loading}
      disabled={bloqueado}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        size === 'sm' && styles.sm,
        styles[variant],
        pressed && pressedStyles[variant],
        fullWidth && styles.fullWidth,
        bloqueado && styles.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={labelStyles[variant].color} />
      ) : (
        <Text style={[styles.label, size === 'sm' && styles.labelSm, labelStyles[variant]]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.button,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  primary: { backgroundColor: colors.brandDeep },
  accent: { backgroundColor: colors.brand },
  danger: { backgroundColor: colors.danger },
  secondary: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.lineStrong,
  },
  ghost: { backgroundColor: 'transparent' },
  night: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.nightBorder },
  nightDanger: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.dangerOnNight,
  },
  sm: { minHeight: 38, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  labelSm: { fontSize: fontSize.sm },
  fullWidth: { alignSelf: 'stretch' },
  disabled: { opacity: 0.6 },
  label: { fontFamily: fonts.bold, fontSize: fontSize.md },
});

const pressedStyles = StyleSheet.create({
  primary: { backgroundColor: colors.night },
  accent: { backgroundColor: colors.brandBright },
  danger: { backgroundColor: colors.dangerPressed },
  secondary: { borderColor: colors.brand },
  ghost: { backgroundColor: colors.surfaceTeal },
  night: { backgroundColor: colors.nightCard },
  nightDanger: { backgroundColor: colors.nightCard },
});

const labelStyles = StyleSheet.create({
  primary: { color: colors.white },
  accent: { color: colors.inkDeep },
  danger: { color: colors.white },
  secondary: { color: colors.brandDeep },
  ghost: { color: colors.brandDeep },
  night: { color: colors.white },
  nightDanger: { color: colors.dangerOnNight },
});
