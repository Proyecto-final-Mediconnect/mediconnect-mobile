import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '../../../shared/ui/theme';

/**
 * "Pagado" al lado de "Confirmado" (ENG-199). Un turno confirmado siempre se
 * pagó —es lo que lo confirma—, pero decirlo explícito le saca la duda a quien
 * acaba de pagar. Mismo criterio que la web.
 */
export function PaidChip(): React.JSX.Element {
  return (
    <View style={styles.chip}>
      <Ionicons name="checkmark" size={12} color={colors.brandHover} />
      <Text style={styles.texto}>Pagado</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(20, 184, 166, 0.12)',
  },
  texto: { fontFamily: fonts.semibold, fontSize: 12, color: colors.brandHover },
});
