import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '../../../shared/ui/theme';
import { initialsOf } from '../lib/chat';

/**
 * Las iniciales en un círculo: no hay fotos de perfil. Es decorativo, porque el
 * nombre siempre está escrito al lado, así que el lector de pantalla lo saltea.
 */
export function Avatar({
  nombre,
  size = 44,
}: {
  nombre: string;
  size?: number;
}): React.JSX.Element {
  return (
    <View
      style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Text style={[styles.texto, { fontSize: Math.round(size * 0.36) }]}>
        {initialsOf(nombre)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceTeal },
  texto: { fontFamily: fonts.bold, color: colors.brandHover },
});
