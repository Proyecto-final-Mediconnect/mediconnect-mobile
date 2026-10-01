import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, fontSize, radius, spacing } from '../../../shared/ui/theme';
import { fullName } from '../lib/catalog';
import { ProfessionalAvatar } from './ProfessionalAvatar';

interface PastProfessionalCardProps {
  professional: { id: string; firstName: string; lastName: string };
  onPress: () => void;
}

/** Un profesional que ya atendió al paciente: un toque para volver a reservar. */
export function PastProfessionalCard({
  professional,
  onPress,
}: PastProfessionalCardProps): React.JSX.Element {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Volver a consultar con ${fullName(professional)}`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.presionada]}
    >
      <ProfessionalAvatar professional={{ ...professional, photoUrl: null }} size={44} />
      <Text style={styles.nombre} numberOfLines={2}>
        {fullName(professional)}
      </Text>
      <View style={styles.accion}>
        <Text style={styles.accionTexto}>Reservar</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 128,
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.card,
    padding: spacing.md,
  },
  presionada: { borderColor: colors.brand },
  nombre: {
    minHeight: 36,
    fontFamily: fonts.bold,
    fontSize: fontSize.sm,
    lineHeight: 18,
    color: colors.brandDeep,
    textAlign: 'center',
  },
  accion: {
    alignSelf: 'stretch',
    alignItems: 'center',
    paddingVertical: 6,
    borderRadius: radius.button,
    backgroundColor: colors.surfaceTeal,
  },
  accionTexto: { fontFamily: fonts.bold, fontSize: fontSize.xs, color: colors.brandHover },
});
