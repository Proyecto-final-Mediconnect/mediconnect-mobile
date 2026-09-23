import { StyleSheet, Text } from 'react-native';

import { colors, fonts, radius } from './theme';

type Tone = 'ok' | 'warning' | 'neutral';

/**
 * Etiqueta de estado del canvas ("CONFIRMADO", "A CONFIRMAR"). Va en mayúscula
 * con espaciado, como allá, pero a 11pt: a los 9px del canvas no se lee en un
 * teléfono.
 */
export function Chip({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: Tone;
}): React.JSX.Element {
  return <Text style={[styles.chip, styles[tone]]}>{label.toUpperCase()}</Text>;
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: 'flex-start',
    overflow: 'hidden',
    borderRadius: radius.button - 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontFamily: fonts.bold,
    fontSize: 11,
    letterSpacing: 0.6,
  },
  ok: { backgroundColor: colors.surfaceTeal, color: colors.brandHover },
  warning: { backgroundColor: colors.warm, color: colors.warmInk },
  neutral: { backgroundColor: colors.lineSoft, color: colors.muted },
});
