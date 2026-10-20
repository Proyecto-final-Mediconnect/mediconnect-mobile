import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, fontSize, radius, spacing } from './theme';

interface NoticeProps {
  icon: ComponentProps<typeof Ionicons>['name'];
  message: string;
  action?: { label: string; onPress: () => void };
}

/** Aviso de algo pendiente, en el par naranja del canvas ("A confirmar"). */
export function Notice({ icon, message, action }: NoticeProps): React.JSX.Element {
  return (
    <View style={styles.aviso}>
      <Ionicons name={icon} size={18} color={colors.warmInk} />
      <Text style={styles.texto}>{message}</Text>
      {action ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={action.label}
          hitSlop={spacing.sm}
          onPress={action.onPress}
        >
          <Text style={styles.accion}>{action.label}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  aviso: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.warm,
    borderRadius: radius.card,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  texto: {
    flex: 1,
    fontFamily: fonts.semibold,
    fontSize: fontSize.sm,
    lineHeight: 18,
    color: colors.warmInk,
  },
  accion: { fontFamily: fonts.bold, fontSize: fontSize.sm, color: colors.warmInk },
});
