import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, fontSize, radius, spacing } from '../../../shared/ui/theme';
import { formatPrice } from '../../appointments/lib/appointments';
import { fullName, mainSpecialty } from '../lib/catalog';
import type { ProfessionalCard } from '../types';
import { ProfessionalAvatar } from './ProfessionalAvatar';

interface ProfessionalRowProps {
  professional: ProfessionalCard;
  onPress: () => void;
}

/** Un profesional en la búsqueda: quién es, qué atiende y cuánto sale. */
export function ProfessionalRow({
  professional,
  onPress,
}: ProfessionalRowProps): React.JSX.Element {
  const especialidad = mainSpecialty(professional);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Ver el perfil de ${fullName(professional)}`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.presionada]}
    >
      <ProfessionalAvatar professional={professional} />
      <View style={styles.textos}>
        <Text style={styles.nombre}>{fullName(professional)}</Text>
        {especialidad ? <Text style={styles.especialidad}>{especialidad}</Text> : null}
        <Text style={styles.precio}>
          {professional.price === null
            ? 'Precio a confirmar'
            : `${formatPrice(professional.price)} la consulta`}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.mutedSoft} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.card,
    padding: spacing.md,
  },
  presionada: { borderColor: colors.brand },
  textos: { flex: 1, gap: 2 },
  nombre: { fontFamily: fonts.bold, fontSize: fontSize.md, color: colors.brandDeep },
  especialidad: { fontFamily: fonts.semibold, fontSize: fontSize.sm, color: colors.brandHover },
  precio: { fontFamily: fonts.medium, fontSize: fontSize.sm, color: colors.muted },
});
