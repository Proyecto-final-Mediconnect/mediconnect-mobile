import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, fontSize, radius, spacing } from '../../shared/ui/theme';

const TEXTO =
  'Leí y acepto los términos y condiciones, la política de privacidad y el tratamiento de mis datos de salud.';

/**
 * La casilla de los textos legales (ENG-140). La usan el pedido de
 * consentimiento y el registro (ENG-235).
 *
 * Arranca sin tildar y no hay forma de tildarla por defecto: el consentimiento
 * para tratar datos de salud tiene que ser expreso (Ley 25.326, art. 7).
 */
export function ConsentCheckbox({
  checked,
  onChange,
  error,
  disabled = false,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  error?: string;
  disabled?: boolean;
}): React.JSX.Element {
  return (
    <View style={styles.bloque}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked, disabled }}
        aria-checked={checked}
        accessibilityLabel={TEXTO}
        onPress={() => onChange(!checked)}
        disabled={disabled}
        style={[styles.casilla, !!error && styles.casillaError]}
      >
        <View style={[styles.caja, checked && styles.cajaTildada]}>
          {checked ? <Ionicons name="checkmark" size={16} color={colors.white} /> : null}
        </View>
        <Text style={styles.texto}>{TEXTO}</Text>
      </Pressable>
      {error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bloque: { gap: spacing.xs },
  casilla: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    backgroundColor: colors.surfaceTeal,
    borderWidth: 1,
    borderColor: colors.surfaceTeal,
    borderRadius: radius.field,
    padding: spacing.lg,
  },
  casillaError: { borderColor: colors.dangerBorder },
  caja: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.lineStrong,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cajaTildada: { backgroundColor: colors.brandDeep, borderColor: colors.brandDeep },
  texto: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: fontSize.sm,
    lineHeight: 19,
    color: colors.ink,
  },
  error: { fontFamily: fonts.medium, fontSize: fontSize.sm, color: colors.danger },
});
