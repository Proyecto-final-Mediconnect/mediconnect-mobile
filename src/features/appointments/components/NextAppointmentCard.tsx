import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '../../../shared/ui/Button';
import { Chip } from '../../../shared/ui/Chip';
import { colors, fonts, fontSize, radius, spacing } from '../../../shared/ui/theme';
import { JoinConsultationButton } from '../../video/components/JoinConsultationButton';
import { formatShortDay, professionalName, statusLabel, statusTone } from '../lib/appointments';
import { joinStateOf, timeUntilOpen, UNPAID_JOIN_MESSAGE } from '../lib/join-window';
import type { Appointment } from '../types';

interface NextAppointmentCardProps {
  /** `null`: el paciente no tiene turnos próximos. */
  appointment: Appointment | null;
  now?: Date;
  /** Sin turnos próximos, ofrece reservar uno. */
  onBook?: () => void;
  /** Abre el detalle del turno al tocar la tarjeta. */
  onOpen?: () => void;
  /** Turno sin pagar: lleva a pagarlo. */
  onPay?: () => void;
}

/**
 * La tarjeta principal del inicio: el próximo turno, que se toca para ver el
 * detalle, y cuando corresponde el botón para entrar a la sala o para pagarlo.
 *
 * El botón aparece solo con la sala abierta —la misma ventana que la web, de 10
 * minutos antes a 15 después—. Antes se dice cuándo abre en lugar de mostrar un
 * botón deshabilitado: uno gris no explica por qué no anda, y en un celular no
 * hay tooltip que lo aclare.
 */
export function NextAppointmentCard({
  appointment,
  now = new Date(),
  onBook,
  onOpen,
  onPay,
}: NextAppointmentCardProps): React.JSX.Element {
  if (!appointment) {
    return (
      <View style={styles.card}>
        <Text style={styles.eyebrow}>PRÓXIMO TURNO</Text>
        <Text style={styles.nombre}>No tenés turnos próximos</Text>
        <Text style={styles.detalle}>
          Cuando reserves con un profesional, tu próximo turno va a aparecer acá.
        </Text>
        {onBook ? (
          <View style={styles.accion}>
            <Button label="Sacar un turno" onPress={onBook} fullWidth />
          </View>
        ) : null}
      </View>
    );
  }

  const sala = joinStateOf(appointment, now);

  return (
    <View style={styles.card}>
      {/* La cabecera abre el detalle; el botón de la sala o de pago va aparte para
          que un toque en él no abra también el turno. */}
      <Pressable
        accessibilityRole={onOpen ? 'button' : undefined}
        accessibilityLabel={
          onOpen ? `Ver el turno con ${professionalName(appointment)}` : undefined
        }
        disabled={!onOpen}
        onPress={onOpen}
        style={({ pressed }) => pressed && styles.presionada}
      >
        <View style={styles.fila}>
          <Text style={styles.eyebrow}>
            {formatShortDay(appointment.date, appointment.startTime).toUpperCase()}
          </Text>
          <Chip label={statusLabel(appointment.status)} tone={statusTone(appointment.status)} />
        </View>
        <View style={styles.fila}>
          <Text style={styles.nombre}>{professionalName(appointment)}</Text>
          {onOpen ? (
            <Ionicons
              name="chevron-forward"
              size={18}
              color={colors.mutedSoft}
              style={styles.chevron}
            />
          ) : null}
        </View>
        <Text style={styles.detalle}>Videoconsulta · {appointment.durationMinutes} min</Text>
      </Pressable>

      {sala.kind === 'OPEN' ? (
        <View style={styles.accion}>
          <JoinConsultationButton appointmentId={appointment.id} />
        </View>
      ) : sala.kind === 'UNPAID' ? (
        onPay ? (
          <View style={styles.accion}>
            <Button label="Pagar el turno" onPress={onPay} variant="accent" fullWidth />
          </View>
        ) : (
          <View style={[styles.accion, styles.aviso]}>
            <Ionicons name="card-outline" size={16} color={colors.muted} />
            <Text style={[styles.avisoTexto, styles.avisoLargo]}>{UNPAID_JOIN_MESSAGE}</Text>
          </View>
        )
      ) : sala.kind === 'TOO_EARLY' ? (
        <View style={[styles.accion, styles.aviso]}>
          <Ionicons name="time-outline" size={16} color={colors.muted} />
          <Text style={styles.avisoTexto}>La sala se abre {timeUntilOpen(sala.opensAt, now)}</Text>
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
    borderRadius: radius.card + 2,
    padding: spacing.lg,
    gap: 2,
  },
  fila: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eyebrow: {
    fontFamily: fonts.bold,
    fontSize: fontSize.xs,
    letterSpacing: 1,
    color: colors.brandHover,
  },
  nombre: {
    marginTop: spacing.sm,
    fontFamily: fonts.bold,
    fontSize: fontSize.lg,
    color: colors.brandDeep,
  },
  detalle: { fontFamily: fonts.medium, fontSize: fontSize.sm, color: colors.muted, lineHeight: 19 },
  accion: { marginTop: spacing.md },
  presionada: { opacity: 0.7 },
  chevron: { marginTop: spacing.sm },
  aviso: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: radius.button,
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
  },
  avisoLargo: { flexShrink: 1 },
  avisoTexto: { fontFamily: fonts.semibold, fontSize: fontSize.sm, color: colors.muted },
});
