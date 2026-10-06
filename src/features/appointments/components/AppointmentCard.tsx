import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Chip } from '../../../shared/ui/Chip';
import { colors, fonts, fontSize, radius, spacing } from '../../../shared/ui/theme';
import {
  canCancel,
  formatPrice,
  formatShortDay,
  isActive,
  professionalName,
  statusLabel,
  statusTone,
} from '../lib/appointments';
import type { Appointment } from '../types';

interface AppointmentCardProps {
  appointment: Appointment;
  onCancel: (appointment: Appointment) => void;
  now?: Date;
}

/**
 * Un turno en la lista: cuándo, con quién, en qué estado y cuánto sale, como
 * las tarjetas de "Mis turnos" del canvas. Un turno que ya no está vigente se
 * muestra apagado, no como uno activo.
 */
export function AppointmentCard({
  appointment,
  onCancel,
  now = new Date(),
}: AppointmentCardProps): React.JSX.Element {
  const vigente = isActive(appointment);

  return (
    <View style={[styles.card, !vigente && styles.apagado]}>
      <View style={styles.fila}>
        <Text style={styles.cuando}>
          {formatShortDay(appointment.date, appointment.startTime).toUpperCase()}
        </Text>
        <Chip label={statusLabel(appointment.status)} tone={statusTone(appointment.status)} />
      </View>
      <Text style={styles.nombre}>{professionalName(appointment)}</Text>
      <Text style={styles.detalle}>
        Videoconsulta · {appointment.durationMinutes} min · {formatPrice(appointment.price)}
      </Text>

      {canCancel(appointment, now) ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Cancelar el turno con ${professionalName(appointment)}`}
          hitSlop={spacing.sm}
          onPress={() => onCancel(appointment)}
          style={styles.cancelar}
        >
          <Text style={styles.cancelarTexto}>Cancelar turno</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.card,
    padding: spacing.lg,
    gap: 2,
  },
  apagado: { opacity: 0.7 },
  fila: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cuando: { fontFamily: fonts.bold, fontSize: fontSize.sm, color: colors.brandDeep },
  nombre: {
    marginTop: spacing.sm,
    fontFamily: fonts.bold,
    fontSize: fontSize.md,
    color: colors.brandDeep,
  },
  detalle: { fontFamily: fonts.medium, fontSize: fontSize.sm, color: colors.muted },
  cancelar: {
    alignSelf: 'flex-start',
    marginTop: spacing.md,
    paddingTop: spacing.md,
  },
  cancelarTexto: { fontFamily: fonts.semibold, fontSize: fontSize.sm, color: colors.danger },
});
