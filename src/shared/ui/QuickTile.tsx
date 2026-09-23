import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, fonts, fontSize, radius, spacing } from './theme';

interface QuickTileProps {
  icon: ComponentProps<typeof Ionicons>['name'];
  title: string;
  caption: string;
  onPress: () => void;
}

/**
 * Acceso rápido del inicio: ícono, nombre y una línea. Van de a tres por fila,
 * en lugar de las tarjetas a lo ancho del canvas, que con tres ocupaban la
 * pantalla sin decir nada más que el nombre de la sección.
 */
export function QuickTile({ icon, title, caption, onPress }: QuickTileProps): React.JSX.Element {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={caption}
      onPress={onPress}
      style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
    >
      <Ionicons name={icon} size={22} color={colors.brandHover} />
      <Text style={styles.titulo}>{title}</Text>
      <Text style={styles.caption} numberOfLines={2}>
        {caption}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minHeight: 96,
    gap: 2,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.card,
    padding: spacing.md,
  },
  pressed: { borderColor: colors.brand },
  titulo: {
    marginTop: spacing.sm,
    fontFamily: fonts.bold,
    fontSize: fontSize.sm,
    color: colors.brandDeep,
  },
  caption: { fontFamily: fonts.medium, fontSize: fontSize.xs, color: colors.muted, lineHeight: 15 },
});
