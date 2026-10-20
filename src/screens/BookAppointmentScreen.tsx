import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAvailability, useBookAppointment } from '../features/appointments/hooks/use-booking';
import { formatPrice, formatShortDay } from '../features/appointments/lib/appointments';
import {
  bookingRange,
  dayParts,
  firstDayWithSlots,
  freeSlots,
} from '../features/appointments/lib/booking';
import type { Appointment, AvailabilitySlot } from '../features/appointments/types';
import { fullName } from '../features/catalog/lib/catalog';
import type { RootStackParamList } from '../navigation/types';
import { Button } from '../shared/ui/Button';
import { ConfirmSheet } from '../shared/ui/ConfirmSheet';
import { Notice } from '../shared/ui/Notice';
import { Screen, ScreenHeader } from '../shared/ui/Screen';
import { EmptyState, ErrorState, LoadingState } from '../shared/ui/StatusViews';
import { colors, fonts, fontSize, radius, spacing } from '../shared/ui/theme';

/** Lo que dice la app sobre el pago mientras no se pueda pagar desde el celular. */
const AVISO_PAGO =
  'Tenés 15 minutos para pagarlo desde MediConnect en la web. Si no, el horario se libera para otro paciente.';

/**
 * Sacar un turno, paso 2: elegir día y horario y reservar (ENG-133).
 * Equivalente mobile de ENG-54.
 *
 * El turno queda reservado sin pagar: el pago con MercadoPago es de la web
 * (ENG-63) y, como ENG-101 libera los turnos no pagados a los 15 minutos, la
 * app lo dice antes y después de reservar.
 */
export function BookAppointmentScreen(): React.JSX.Element {
  const navigation = useNavigation();
  const { params } = useRoute<RouteProp<RootStackParamList, 'Reservar'>>();
  // El rango se fija al abrir la pantalla: no se corre mientras el paciente elige.
  const [rango] = useState(() => bookingRange(new Date()));
  const disponibilidad = useAvailability(params.professionalId, rango.from, rango.to);
  const reservar = useBookAppointment();

  const [diaElegido, setDiaElegido] = useState<string | null>(null);
  const [horario, setHorario] = useState<AvailabilitySlot | null>(null);
  const [reservado, setReservado] = useState<Appointment | null>(null);

  const dias = useMemo(() => disponibilidad.data?.days ?? [], [disponibilidad.data]);
  const dia = diaElegido ?? firstDayWithSlots(dias);
  const libres = freeSlots(dias.find((d) => d.date === dia));
  const profesional = disponibilidad.data?.professional;
  const nombre = profesional ? fullName(profesional) : '';
  const precio = profesional?.consultationPrice ?? null;

  const header = (
    <ScreenHeader
      title="Elegí un horario"
      subtitle={nombre || ' '}
      onBack={() => navigation.goBack()}
    />
  );

  if (reservado) {
    return (
      <Screen header={<ScreenHeader title="Turno reservado" />}>
        <View style={styles.listo}>
          <View style={styles.listoIcono}>
            <Ionicons name="checkmark" size={32} color={colors.white} />
          </View>
          <Text accessibilityRole="header" style={styles.listoTitulo}>
            ¡Listo, reservaste tu turno!
          </Text>
          <Text style={styles.listoDetalle}>
            Con {nombre}, el {formatShortDay(reservado.date, reservado.startTime)}.
          </Text>
        </View>
        <Notice icon="time-outline" message={AVISO_PAGO} />
        <Button
          label="Ver mis turnos"
          onPress={() => navigation.navigate('Paciente', { screen: 'Turnos' })}
          fullWidth
        />
        <Button
          label="Volver al inicio"
          variant="ghost"
          onPress={() => navigation.navigate('Paciente', { screen: 'Inicio' })}
          fullWidth
        />
      </Screen>
    );
  }

  if (disponibilidad.isPending) {
    return (
      <Screen scroll={false} header={header}>
        <LoadingState label="Buscando horarios libres…" />
      </Screen>
    );
  }

  if (disponibilidad.isError) {
    return (
      <Screen scroll={false} header={header}>
        <ErrorState
          message={disponibilidad.error.message}
          onRetry={() => void disponibilidad.refetch()}
        />
      </Screen>
    );
  }

  if (!firstDayWithSlots(dias)) {
    return (
      <Screen scroll={false} header={header}>
        <EmptyState
          icon="calendar-clear-outline"
          title="No hay horarios libres"
          description={`${nombre} no tiene turnos disponibles en las próximas dos semanas.`}
          action={{ label: 'Buscar otro profesional', onPress: () => navigation.goBack() }}
        />
      </Screen>
    );
  }

  function cerrarConfirmacion(): void {
    setHorario(null);
    reservar.reset();
  }

  return (
    <Screen header={header}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.dias}
        accessibilityRole="tablist"
      >
        {dias.map((d) => {
          const partes = dayParts(d.date);
          const conLugar = freeSlots(d).length > 0;
          const activo = d.date === dia;
          return (
            <Pressable
              key={d.date}
              accessibilityRole="tab"
              accessibilityLabel={`${partes.weekday} ${partes.day} ${partes.month}`}
              aria-selected={activo}
              aria-disabled={!conLugar}
              disabled={!conLugar}
              onPress={() => setDiaElegido(d.date)}
              style={[styles.dia, activo && styles.diaActivo, !conLugar && styles.diaSinLugar]}
            >
              <Text style={[styles.diaSemana, activo && styles.diaTextoActivo]}>
                {partes.weekday}
              </Text>
              <Text style={[styles.diaNumero, activo && styles.diaTextoActivo]}>{partes.day}</Text>
              <Text style={[styles.diaMes, activo && styles.diaTextoActivo]}>{partes.month}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Text style={styles.seccion}>HORARIOS LIBRES</Text>
      <View style={styles.horarios}>
        {libres.map((slot) => (
          <Pressable
            key={slot.startTime}
            accessibilityRole="button"
            accessibilityLabel={`Reservar a las ${slot.startTime}`}
            onPress={() => setHorario(slot)}
            style={({ pressed }) => [styles.horario, pressed && styles.horarioPresionado]}
          >
            <Text style={styles.horarioTexto}>{slot.startTime}</Text>
          </Pressable>
        ))}
      </View>

      {precio !== null ? (
        <Text style={styles.pie}>
          La consulta por video sale {formatPrice(precio)}. Se paga después de reservar.
        </Text>
      ) : null}

      <ConfirmSheet
        visible={horario !== null}
        title="¿Reservar el turno?"
        message={
          horario && dia
            ? `Con ${nombre}, el ${formatShortDay(dia, horario.startTime)} (${horario.durationMinutes} min)${
                precio !== null ? `, por ${formatPrice(precio)}` : ''
              }. ${AVISO_PAGO}`
            : ''
        }
        confirmLabel="Reservar turno"
        dismissLabel="Elegir otro horario"
        confirmVariant="primary"
        pending={reservar.isPending}
        error={reservar.isError ? reservar.error.message : null}
        onDismiss={cerrarConfirmacion}
        onConfirm={() => {
          if (!horario || !dia) return;
          reservar.mutate(
            { professionalId: params.professionalId, date: dia, startTime: horario.startTime },
            {
              onSuccess: (turno) => {
                setHorario(null);
                setReservado(turno);
              },
            },
          );
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  dias: { gap: spacing.sm, paddingRight: spacing.lg },
  dia: {
    width: 58,
    alignItems: 'center',
    gap: 2,
    paddingVertical: spacing.md,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
  },
  diaActivo: { backgroundColor: colors.brandDeep, borderColor: colors.brandDeep },
  diaSinLugar: { opacity: 0.4 },
  diaSemana: { fontFamily: fonts.semibold, fontSize: fontSize.xs, color: colors.muted },
  diaNumero: { fontFamily: fonts.display, fontSize: fontSize.xl, color: colors.brandDeep },
  diaMes: { fontFamily: fonts.semibold, fontSize: fontSize.xs, color: colors.muted },
  diaTextoActivo: { color: colors.white },
  seccion: {
    marginTop: spacing.md,
    marginLeft: spacing.xs,
    fontFamily: fonts.bold,
    fontSize: fontSize.xs,
    letterSpacing: 1,
    color: colors.mutedSoft,
  },
  horarios: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  horario: {
    width: '31%',
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    backgroundColor: colors.white,
  },
  horarioPresionado: { borderColor: colors.brand, backgroundColor: colors.surfaceTeal },
  horarioTexto: { fontFamily: fonts.bold, fontSize: fontSize.md, color: colors.brandDeep },
  pie: {
    marginTop: spacing.md,
    fontFamily: fonts.medium,
    fontSize: fontSize.sm,
    lineHeight: 19,
    color: colors.muted,
    textAlign: 'center',
  },
  listo: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl },
  listoIcono: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brandHover,
  },
  listoTitulo: {
    fontFamily: fonts.display,
    fontSize: fontSize.xl,
    color: colors.brandDeep,
    textAlign: 'center',
  },
  listoDetalle: { fontFamily: fonts.medium, fontSize: fontSize.md, color: colors.muted },
});
