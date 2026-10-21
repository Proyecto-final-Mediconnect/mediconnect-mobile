import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts, fontSize, radius } from '../../../shared/ui/theme';
import { dayParts } from '../lib/booking';

/**
 * El día de un turno en un bloque: el día de la semana arriba y el número
 * grande. Es lo primero que se busca en una lista de turnos; lo usan el inicio y
 * "Mis turnos".
 */
export function DateBadge({
  date,
  muted = false,
}: {
  date: string;
  muted?: boolean;
}): React.JSX.Element {
  const dia = dayParts(date);

  return (
    <View style={[styles.bloque, muted && styles.bloqueApagado]}>
      <Text style={[styles.semana, muted && styles.textoApagado]}>{dia.weekday.toUpperCase()}</Text>
      <Text style={[styles.numero, muted && styles.textoApagado]}>{dia.day}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bloque: {
    width: 44,
    alignItems: 'center',
    paddingVertical: 6,
    borderRadius: radius.field,
    backgroundColor: colors.surfaceTeal,
  },
  bloqueApagado: { backgroundColor: colors.lineSoft },
  semana: { fontFamily: fonts.bold, fontSize: 10, letterSpacing: 0.6, color: colors.brandHover },
  numero: { fontFamily: fonts.display, fontSize: fontSize.lg, color: colors.brandDeep },
  textoApagado: { color: colors.muted },
});
