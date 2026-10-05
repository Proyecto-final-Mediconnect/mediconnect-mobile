import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '../../../shared/ui/Button';
import { Chip } from '../../../shared/ui/Chip';
import { colors, fonts, fontSize, radius, spacing } from '../../../shared/ui/theme';
import { formatShortDay, professionalName, statusLabel, statusTone } from '../lib/appointments';
import { joinStateOf, timeUntilOpen } from '../lib/join-window';
import type { Appointment } from '../types';

interface NextAppointmentCardProps {
  /** `null`: el paciente no tiene turnos próximos. */
  appointment: Appointment | null;
  onJoin: () => void;
  now?: Date;
}

/**
 * La tarjeta principal del inicio: la próxima consulta y, cuando corresponde, el
 * botón para entrar a la sala.
 *
 * El botón aparece solo con la sala abierta —la misma ventana que la web, de 10
 * minutos antes a 15 después—. Antes se dice cuándo abre en lugar de mostrar un
 * botón deshabilitado: uno gris no explica por qué no anda, y en un celular no
 * hay tooltip que lo aclare.
 */
export function NextAppointmentCard({
  appointment,
  onJoin,
  now = new Date(),
}: NextAppointmentCardProps): React.JSX.Element {
  if (!appointment) {
    return (
      <View style={styles.card}>
        <Text style={styles.eyebrow}>PRÓXIMA CONSULTA</Text>
        <Text style={styles.nombre}>No tenés turnos próximos</Text>
        <Text style={styles.detalle}>
          Reservá con un profesional desde MediConnect en la web y lo vas a ver acá.
        </Text>
      </View>
    );
  }

  const sala = joinStateOf(appointment, now);

  return (
    <View style={styles.card}>
      <View style={styles.fila}>
        <Text style={styles.eyebrow}>
          {formatShortDay(appointment.date, appointment.startTime).toUpperCase()}
        </Text>
        <Chip label={statusLabel(appointment.status)} tone={statusTone(appointment.status)} />
      </View>
      <Text style={styles.nombre}>{professionalName(appointment)}</Text>
      <Text style={styles.detalle}>Videoconsulta · {appointment.durationMinutes} min</Text>

      {sala.kind === 'OPEN' ? (
        <View style={styles.accion}>
          <Button label="Ingresar a la sala" variant="accent" onPress={onJoin} fullWidth />
        </View>
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
  aviso: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: radius.button,
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
  },
  avisoTexto: { fontFamily: fonts.semibold, fontSize: fontSize.sm, color: colors.muted },
});
