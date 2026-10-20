import { StyleSheet, Text, View } from 'react-native';

import { Chip } from '../../../shared/ui/Chip';
import { colors, fonts, fontSize, radius, spacing } from '../../../shared/ui/theme';
import { dayParts } from '../lib/booking';
import { professionalName, statusLabel, statusTone } from '../lib/appointments';
import type { Appointment } from '../types';

/**
 * Un turno en una línea, para el inicio: el día en un bloque, con quién y a qué
 * hora. El detalle y las acciones están en "Mis turnos".
 */
export function CompactAppointmentRow({
  appointment,
  last = false,
}: {
  appointment: Appointment;
  last?: boolean;
}): React.JSX.Element {
  const dia = dayParts(appointment.date);

  return (
    <View style={[styles.fila, !last && styles.borde]}>
      <View style={styles.fecha}>
        <Text style={styles.semana}>{dia.weekday.toUpperCase()}</Text>
        <Text style={styles.numero}>{dia.day}</Text>
      </View>
      <View style={styles.textos}>
        <Text style={styles.nombre} numberOfLines={1}>
          {professionalName(appointment)}
        </Text>
        <Text style={styles.detalle}>
          {dia.day} {dia.month} · {appointment.startTime}
        </Text>
      </View>
      <Chip label={statusLabel(appointment.status)} tone={statusTone(appointment.status)} />
    </View>
  );
}

const styles = StyleSheet.create({
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  borde: { borderBottomWidth: 1, borderBottomColor: colors.lineSoft },
  fecha: {
    width: 44,
    alignItems: 'center',
    paddingVertical: 6,
    borderRadius: radius.field,
    backgroundColor: colors.surfaceTeal,
  },
  semana: { fontFamily: fonts.bold, fontSize: 10, letterSpacing: 0.6, color: colors.brandHover },
  numero: { fontFamily: fonts.display, fontSize: fontSize.lg, color: colors.brandDeep },
  textos: { flex: 1, gap: 2 },
  nombre: { fontFamily: fonts.bold, fontSize: fontSize.md, color: colors.brandDeep },
  detalle: { fontFamily: fonts.medium, fontSize: fontSize.sm, color: colors.muted },
});
