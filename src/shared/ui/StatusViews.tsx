import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Button } from './Button';
import { colors, fonts, fontSize, spacing } from './theme';

/*
 * Los tres estados que toda pantalla con datos tiene que poder mostrar: cargando,
 * falló y no hay nada. Van juntos porque se usan juntos y comparten el mismo
 * encuadre, centrado en el alto disponible (con `<Screen scroll={false}>`).
 */

export function LoadingState({ label = 'Cargando…' }: { label?: string }): React.JSX.Element {
  return (
    <View style={styles.centro} accessibilityRole="progressbar" accessibilityLabel={label}>
      <ActivityIndicator size="large" color={colors.brand} />
      <Text style={styles.texto}>{label}</Text>
    </View>
  );
}

interface ErrorStateProps {
  /** Qué falló, con las palabras del backend si las hay. */
  message: string;
  /**
   * Sin `onRetry` no se ofrece reintentar: un 403 no se arregla probando de
   * nuevo, y ofrecerlo manda a la persona a un callejón sin salida.
   */
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps): React.JSX.Element {
  return (
    <View style={styles.centro}>
      <Ionicons name="alert-circle-outline" size={40} color={colors.danger} />
      <View accessibilityRole="alert" style={styles.bloque}>
        <Text style={styles.titulo}>No pudimos cargar esto</Text>
        <Text style={styles.texto}>{message}</Text>
      </View>
      {onRetry ? <Button label="Probá de nuevo" variant="secondary" onPress={onRetry} /> : null}
    </View>
  );
}

interface EmptyStateProps {
  icon: ComponentProps<typeof Ionicons>['name'];
  title: string;
  description: string;
  /** `dark` sobre el azul noche del MediPass. */
  tone?: 'light' | 'dark';
}

export function EmptyState({
  icon,
  title,
  description,
  tone = 'light',
}: EmptyStateProps): React.JSX.Element {
  const oscuro = tone === 'dark';

  return (
    <View style={styles.centro}>
      <View style={[styles.icono, oscuro && styles.iconoDark]}>
        <Ionicons name={icon} size={28} color={oscuro ? colors.brandBright : colors.brandHover} />
      </View>
      <View style={styles.bloque}>
        <Text accessibilityRole="header" style={[styles.titulo, oscuro && styles.tituloDark]}>
          {title}
        </Text>
        <Text style={[styles.texto, oscuro && styles.textoDark]}>{description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  bloque: { alignItems: 'center', gap: spacing.xs },
  icono: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceTeal,
  },
  iconoDark: { backgroundColor: 'rgba(255,255,255,0.08)' },
  titulo: {
    fontFamily: fonts.bold,
    fontSize: fontSize.lg,
    color: colors.brandDeep,
    textAlign: 'center',
  },
  tituloDark: { color: colors.white },
  texto: {
    fontFamily: fonts.medium,
    fontSize: fontSize.md,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 21,
  },
  textoDark: { color: colors.onNight },
});
