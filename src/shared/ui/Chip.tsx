import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from './theme';

type Tone = 'ok' | 'warning' | 'neutral';

/**
 * El estado de un turno: un punto de color y el nombre ("Confirmado", "Sin
 * pagar"), en una píldora suave. El color dice si está todo bien, si falta algo
 * o si ya no está vigente; el texto lo confirma para quien no distingue colores.
 */
export function Chip({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: Tone;
}): React.JSX.Element {
  return (
    <View style={[styles.chip, fondos[tone]]}>
      <View style={[styles.punto, puntos[tone]]} />
      <Text style={[styles.texto, textos[tone]]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    paddingLeft: 8,
    paddingRight: 10,
    paddingVertical: 4,
  },
  punto: { width: 6, height: 6, borderRadius: 3 },
  texto: { fontFamily: fonts.semibold, fontSize: 12 },
});

const fondos = StyleSheet.create({
  ok: { backgroundColor: colors.surfaceTeal },
  warning: { backgroundColor: colors.warm },
  neutral: { backgroundColor: colors.lineSoft },
});

const puntos = StyleSheet.create({
  ok: { backgroundColor: colors.brand },
  warning: { backgroundColor: colors.warmDot },
  neutral: { backgroundColor: colors.mutedSoft },
});

const textos = StyleSheet.create({
  ok: { color: colors.brandHover },
  warning: { color: colors.warmInk },
  neutral: { color: colors.muted },
});
