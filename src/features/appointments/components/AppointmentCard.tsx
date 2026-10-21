import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Chip } from '../../../shared/ui/Chip';
import { colors, fonts, fontSize, radius, spacing } from '../../../shared/ui/theme';
import { canPay } from '../../payments/lib/payment';
import { Button } from '../../../shared/ui/Button';
import { JoinConsultationButton } from '../../video/components/JoinConsultationButton';
import {
  canCancel,
  formatPrice,
  professionalName,
  statusLabel,
  statusTone,
} from '../lib/appointments';
import { dayParts } from '../lib/booking';
import { joinStateOf } from '../lib/join-window';
import type { Appointment } from '../types';
import { DateBadge } from './DateBadge';

interface AppointmentCardProps {
  appointment: Appointment;
  onCancel: (appointment: Appointment) => void;
  /** Abre el pago del turno (ENG-168). Sin esto, la tarjeta no ofrece pagar. */
  onPay?: (appointment: Appointment) => void;
  now?: Date;
}

/**
 * Un turno en "Mis turnos": el día en un bloque —como en el inicio—, con quién,
 * a qué hora y cuánto sale. Debajo, separadas por una línea, las acciones: la
 * principal como botón ("Pagar", "Ingresar a la sala") y cancelar como texto
 * discreto, para que no compita con ella. El rojo queda para la confirmación.
 */
export function AppointmentCard({
  appointment,
  onCancel,
  onPay,
  now = new Date(),
}: AppointmentCardProps): React.JSX.Element {
  const salaAbierta = joinStateOf(appointment, now).kind === 'OPEN';
  const pagar = onPay && canPay(appointment, now);
  const cancelable = canCancel(appointment, now);
  const dia = dayParts(appointment.date);

  return (
    <View style={styles.card}>
      <View style={styles.fila}>
        <DateBadge date={appointment.date} />
        <View style={styles.textos}>
          <Text style={styles.nombre} numberOfLines={1}>
            {professionalName(appointment)}
          </Text>
          <Text style={styles.detalle}>
            {dia.day} {dia.month} · {appointment.startTime} · {appointment.durationMinutes} min
          </Text>
          <Text style={styles.detalle}>Videoconsulta · {formatPrice(appointment.price)}</Text>
        </View>
        <Chip label={statusLabel(appointment.status)} tone={statusTone(appointment.status)} />
      </View>

      {pagar ? (
        <View style={styles.aviso}>
          <Ionicons name="time-outline" size={15} color={colors.warmInk} />
          <Text style={styles.avisoTexto}>
            Pagalo para confirmarlo; si no, el horario se libera.
          </Text>
        </View>
      ) : null}

      {salaAbierta || pagar || cancelable ? (
        <View style={styles.pie}>
          {cancelable ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Cancelar el turno con ${professionalName(appointment)}`}
              hitSlop={spacing.sm}
              onPress={() => onCancel(appointment)}
              style={({ pressed }) => [styles.cancelar, pressed && styles.cancelarPresionado]}
            >
              <Text style={styles.cancelarTexto}>Cancelar</Text>
            </Pressable>
          ) : (
            <View />
          )}
          {salaAbierta ? (
            <View style={styles.principal}>
              <JoinConsultationButton appointmentId={appointment.id} />
            </View>
          ) : pagar ? (
            <View style={styles.principal}>
              <Button label="Pagar" variant="accent" onPress={() => onPay(appointment)} fullWidth />
            </View>
          ) : null}
        </View>
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
    gap: spacing.md,
  },
  fila: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  textos: { flex: 1, gap: 2 },
  nombre: { fontFamily: fonts.bold, fontSize: fontSize.md, color: colors.brandDeep },
  detalle: { fontFamily: fonts.medium, fontSize: fontSize.sm, color: colors.muted },
  aviso: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.button,
    backgroundColor: colors.warm,
  },
  avisoTexto: {
    flex: 1,
    fontFamily: fonts.semibold,
    fontSize: fontSize.xs + 1,
    color: colors.warmInk,
  },
  pie: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.lineSoft,
  },
  principal: { flex: 1, maxWidth: 200 },
  cancelar: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: colors.line,
  },
  cancelarPresionado: { backgroundColor: colors.surface },
  cancelarTexto: { fontFamily: fonts.semibold, fontSize: fontSize.sm, color: colors.muted },
});
