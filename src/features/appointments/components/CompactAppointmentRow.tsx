import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Chip } from '../../../shared/ui/Chip';
import { colors, fonts, fontSize, spacing } from '../../../shared/ui/theme';
import { dayParts } from '../lib/booking';
import { professionalName, statusLabel, statusTone } from '../lib/appointments';
import type { Appointment } from '../types';
import { DateBadge } from './DateBadge';

/**
 * Un turno en una línea, para el inicio: el día en un bloque, con quién y a qué
 * hora. El detalle y las acciones están en "Mis turnos".
 */
export function CompactAppointmentRow({
  appointment,
  last = false,
  muted = false,
  onPress,
}: {
  appointment: Appointment;
  last?: boolean;
  /** Para los que ya no se realizan: cancelados y liberados. */
  muted?: boolean;
  /** Abre el detalle. Sin esto, la fila no se toca (el inicio). */
  onPress?: () => void;
}): React.JSX.Element {
  const dia = dayParts(appointment.date);

  const contenido = (
    <>
      <DateBadge date={appointment.date} muted={muted} />
      <View style={styles.textos}>
        <Text style={[styles.nombre, muted && styles.apagado]} numberOfLines={1}>
          {professionalName(appointment)}
        </Text>
        <Text style={styles.detalle}>
          {dia.day} {dia.month} · {appointment.startTime}
        </Text>
      </View>
      <Chip label={statusLabel(appointment.status)} tone={statusTone(appointment.status)} />
      {onPress ? <Ionicons name="chevron-forward" size={16} color={colors.mutedSoft} /> : null}
    </>
  );

  if (!onPress) return <View style={[styles.fila, !last && styles.borde]}>{contenido}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Ver el turno con ${professionalName(appointment)}`}
      onPress={onPress}
      style={({ pressed }) => [styles.fila, !last && styles.borde, pressed && styles.presionada]}
    >
      {contenido}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  presionada: { opacity: 0.6 },
  borde: { borderBottomWidth: 1, borderBottomColor: colors.lineSoft },
  textos: { flex: 1, gap: 2 },
  nombre: { fontFamily: fonts.bold, fontSize: fontSize.md, color: colors.brandDeep },
  apagado: { color: colors.muted },
  detalle: { fontFamily: fonts.medium, fontSize: fontSize.sm, color: colors.muted },
});
