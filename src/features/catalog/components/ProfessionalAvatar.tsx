import { Image, StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '../../../shared/ui/theme';
import { initialsOf } from '../lib/catalog';

interface ProfessionalAvatarProps {
  professional: { firstName: string; lastName: string; photoUrl: string | null };
  size?: number;
}

/** La foto del profesional o, si no subió una, sus iniciales. */
export function ProfessionalAvatar({
  professional,
  size = 52,
}: ProfessionalAvatarProps): React.JSX.Element {
  const forma = { width: size, height: size, borderRadius: size / 2 };

  if (professional.photoUrl) {
    return (
      <Image
        source={{ uri: professional.photoUrl }}
        style={[styles.foto, forma]}
        accessibilityIgnoresInvertColors
      />
    );
  }

  return (
    <View style={[styles.iniciales, forma]}>
      <Text style={[styles.texto, { fontSize: size * 0.38 }]}>{initialsOf(professional)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  foto: { backgroundColor: colors.lineSoft },
  iniciales: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceTeal,
  },
  texto: { fontFamily: fonts.display, color: colors.brandHover },
});
