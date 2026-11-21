import { Ionicons } from '@expo/vector-icons';
import { reprogramLead } from '../features/appointments/lib/reprogramCause';
import { StackActions, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useMemo, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ScrollViewInstance,
} from 'react-native';

import { DayCalendarSheet } from '../features/appointments/components/DayCalendarSheet';
import { useMyAppointments } from '../features/appointments/hooks/use-appointments';
import {
  useAvailability,
  useBookAppointment,
  useRescheduleAppointment,
} from '../features/appointments/hooks/use-booking';
import { formatPrice, formatSentenceDay } from '../features/appointments/lib/appointments';
import { cuando } from '../features/appointments/lib/timeline';
import {
  bookingRange,
  dayParts,
  esHoy,
  firstDayWithSlots,
  freeSlots,
} from '../features/appointments/lib/booking';
import type { Appointment, AvailabilitySlot } from '../features/appointments/types';
import { describePolicy } from '../features/cancellation-policy/policy';
import { usePublicProfile } from '../features/catalog/hooks/use-catalog';
import { fullName } from '../features/catalog/lib/catalog';
import type { RootStackParamList } from '../navigation/types';
import { Button } from '../shared/ui/Button';
import { ConfirmSheet } from '../shared/ui/ConfirmSheet';
import { Notice } from '../shared/ui/Notice';
import { Screen, ScreenHeader } from '../shared/ui/Screen';
import { EmptyState, ErrorState, LoadingState } from '../shared/ui/StatusViews';
import { colors, fonts, fontSize, radius, spacing } from '../shared/ui/theme';

/** Lo que dice la app sobre el pago: ENG-101 libera los turnos no pagados a los 15 minutos. */
const AVISO_PAGO = 'Tenés 15 minutos para pagarlo. Si no, el horario se libera para otro paciente.';

/**
 * Sacar un turno, paso 2: elegir día y horario y reservar (ENG-133).
 * Equivalente mobile de ENG-54.
 *
 * El turno queda reservado sin pagar y, como ENG-101 libera los turnos no
 * pagados a los 15 minutos, la app lo dice y ofrece pagarlo ahí mismo (ENG-168).
 *
 * Con `rescheduleId`, la misma grilla mueve ese turno (ENG-66): es el mismo
 * turno, con el mismo pago, y se puede mover una sola vez.
 */
export function BookAppointmentScreen(): React.JSX.Element {
  const navigation = useNavigation();
  const { params } = useRoute<RouteProp<RootStackParamList, 'Reservar'>>();
  // El rango se fija al abrir la pantalla: no se corre mientras el paciente elige.
  const [rango] = useState(() => bookingRange(new Date()));
  const disponibilidad = useAvailability(params.professionalId, rango.from, rango.to);
  const reservar = useBookAppointment();
  const reprogramar = useRescheduleAppointment();
  const { rescheduleId } = params;
  const turnos = useMyAppointments();
  // Solo un turno propio y con este profesional: si no está, no se reprograma
  // nada (y tampoco se cae a reservar uno nuevo).
  const aMover = rescheduleId
    ? (turnos.data?.find(
        (t) => t.id === rescheduleId && t.professional?.id === params.professionalId,
      ) ?? null)
    : null;
  const envio = rescheduleId ? reprogramar : reservar;
  // ENG-203: el turno que canceló el profesional. Se elige sin volver a pagar y
  // no cuenta como la reprogramación del paciente.
  const desdeCancelacion = aMover?.status === 'A_REPROGRAMAR';
  const plazo = desdeCancelacion ? cuando(aMover?.reprogramDeadline) : null;

  const [diaElegido, setDiaElegido] = useState<string | null>(null);
  const [verCalendario, setVerCalendario] = useState(false);
  const tira = useRef<ScrollViewInstance>(null);
  const [horario, setHorario] = useState<AvailabilitySlot | null>(null);
  const [reservado, setReservado] = useState<Appointment | null>(null);
  const [movido, setMovido] = useState<Appointment | null>(null);
  // Ancho de la grilla de horarios, para que entren tres por fila exactos y la
  // fila quede alineada con los bordes de la pantalla (con un 31 % fijo sobraba
  // un margen desparejo a la derecha).
  const [anchoHorarios, setAnchoHorarios] = useState(0);
  const anchoHorario = anchoHorarios > 0 ? Math.floor((anchoHorarios - spacing.sm * 2) / 3) : '31%';

  const dias = useMemo(() => disponibilidad.data?.days ?? [], [disponibilidad.data]);
  const dia = diaElegido ?? firstDayWithSlots(dias);
  const libres = freeSlots(dias.find((d) => d.date === dia));
  const profesional = disponibilidad.data?.professional;
  const nombre = profesional ? fullName(profesional) : '';
  const precio = profesional?.consultationPrice ?? null;
  // La disponibilidad no trae la política: sale del perfil, que ya está en
  // caché porque el paciente llega a esta pantalla desde ahí.
  const politica = usePublicProfile(params.professionalId).data?.cancellationPolicy;

  const header = (
    <ScreenHeader
      title={rescheduleId ? 'Reprogramar turno' : 'Elegí un horario'}
      subtitle={nombre || ' '}
      onBack={() => navigation.goBack()}
    />
  );

  if (reservado) {
    return (
      <Screen header={<ScreenHeader title="Turno reservado" />}>
        {/* Reservado no es confirmado: falta pagar. Reloj y tono de aviso, no el
            check de "listo", que queda para cuando se acredita (ENG-199). */}
        <View style={styles.listo}>
          <View style={styles.listoIcono}>
            <Ionicons name="time-outline" size={30} color={colors.warmInk} />
          </View>
          <Text style={styles.listoEyebrow}>FALTA PAGAR</Text>
          <Text accessibilityRole="header" style={styles.listoTitulo}>
            Reservaste tu turno
          </Text>
          <Text style={styles.listoDetalle}>
            Con {nombre}, el {formatSentenceDay(reservado.date, reservado.startTime)}. Se confirma
            cuando pagás.
          </Text>
        </View>
        <Notice icon="time-outline" message={AVISO_PAGO} />
        <Button
          label="Pagar ahora"
          variant="accent"
          onPress={() => navigation.navigate('Pago', { appointmentId: reservado.id })}
          fullWidth
        />
        <Button
          label="Ver mis turnos"
          variant="secondary"
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

  if (movido) {
    const pagado = movido.status === 'CONFIRMADO';
    return (
      <Screen header={<ScreenHeader title="Turno reprogramado" />}>
        <View style={styles.listo}>
          <View style={[styles.listoIcono, styles.listoIconoOk]}>
            <Ionicons name="checkmark" size={32} color={colors.brandHover} />
          </View>
          <Text style={[styles.listoEyebrow, styles.listoEyebrowOk]}>LISTO</Text>
          <Text accessibilityRole="header" style={styles.listoTitulo}>
            Movimos tu turno
          </Text>
          <Text style={styles.listoDetalle}>
            Con {nombre}, el {formatSentenceDay(movido.date, movido.startTime)}.{' '}
            {pagado
              ? 'El pago queda como estaba: no se vuelve a cobrar.'
              : 'Todavía falta pagarlo para confirmarlo.'}
          </Text>
        </View>
        {!pagado ? (
          <Button
            label="Pagar ahora"
            variant="accent"
            onPress={() => navigation.navigate('Pago', { appointmentId: movido.id })}
            fullWidth
          />
        ) : null}
        <Button
          label="Ver el turno"
          variant={pagado ? 'primary' : 'secondary'}
          onPress={() =>
            // Se vuelve al detalle de donde vino, no se apila otro igual.
            navigation.dispatch(StackActions.popTo('Turno', { appointmentId: movido.id }))
          }
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

  if (rescheduleId && turnos.isPending) {
    return (
      <Screen scroll={false} header={header}>
        <LoadingState label="Buscando tu turno…" />
      </Screen>
    );
  }

  if (rescheduleId && !aMover) {
    return (
      <Screen scroll={false} header={header}>
        <EmptyState
          icon="calendar-outline"
          title="No encontramos el turno"
          description="Puede que ya se haya cancelado o que no sea tuyo."
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
          description={`${nombre} no tiene turnos disponibles en los próximos dos meses.`}
          action={{ label: 'Buscar otro profesional', onPress: () => navigation.goBack() }}
        />
      </Screen>
    );
  }

  function cerrarConfirmacion(): void {
    setHorario(null);
    envio.reset();
  }

  /** Elegir un día desde el calendario también corre la tira hasta él. */
  const elegirDelCalendario = (fecha: string): void => {
    setDiaElegido(fecha);
    const i = dias.findIndex((d) => d.date === fecha);
    if (i >= 0) tira.current?.scrollTo({ x: Math.max(0, i - 1) * ANCHO_DIA, animated: true });
  };

  return (
    <Screen header={header}>
      {aMover ? (
        <Notice
          icon="swap-horizontal-outline"
          message={
            desdeCancelacion
              ? `${reprogramLead(aMover, nombre, formatSentenceDay(aMover.date, aMover.startTime))} Elegí el nuevo horario: no volvés a pagar y no cuenta como tu reprogramación.${plazo ? ` Tenés hasta el ${plazo}.` : ''}`
              : `Tu turno ahora: el ${formatSentenceDay(aMover.date, aMover.startTime)}. Elegí el nuevo horario. Un turno se puede reprogramar una sola vez.`
          }
        />
      ) : null}
      <View style={styles.diasCabecera}>
        <Text style={styles.seccion}>DÍA</Text>
        <Pressable
          accessibilityRole="button"
          hitSlop={spacing.sm}
          onPress={() => setVerCalendario(true)}
          style={styles.verCalendario}
        >
          <Ionicons name="calendar-outline" size={16} color={colors.brandHover} />
          <Text style={styles.verCalendarioTexto}>Ver calendario</Text>
        </Pressable>
      </View>
      <ScrollView
        ref={tira}
        horizontal
        showsHorizontalScrollIndicator={false}
        // Sin esto, dentro del scroll vertical de la pantalla la fila de días se
        // estira hasta ocupar el alto libre y cada tarjeta queda altísima.
        style={styles.diasScroll}
        contentContainerStyle={styles.dias}
        accessibilityRole="tablist"
      >
        {dias.map((d) => {
          const partes = dayParts(d.date);
          const conLugar = freeSlots(d).length > 0;
          const activo = d.date === dia;
          // "Hoy" por la fecha real en Argentina, no por la posición en el arreglo.
          const hoy = esHoy(d.date);
          return (
            <Pressable
              key={d.date}
              accessibilityRole="tab"
              accessibilityLabel={`${partes.weekday} ${partes.day} ${partes.month}${hoy ? ', hoy' : ''}`}
              aria-selected={activo}
              aria-disabled={!conLugar}
              disabled={!conLugar}
              onPress={() => setDiaElegido(d.date)}
              style={[
                styles.dia,
                hoy && styles.diaHoy,
                activo && styles.diaActivo,
                !conLugar && styles.diaSinLugar,
              ]}
            >
              <Text style={[styles.diaSemana, activo && styles.diaTextoActivo]}>
                {hoy ? 'hoy' : partes.weekday}
              </Text>
              <Text style={[styles.diaNumero, activo && styles.diaTextoActivo]}>{partes.day}</Text>
              <Text style={[styles.diaMes, activo && styles.diaTextoActivo]}>{partes.month}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Text style={styles.seccion}>HORARIOS LIBRES</Text>
      <View style={styles.horarios} onLayout={(e) => setAnchoHorarios(e.nativeEvent.layout.width)}>
        {libres.map((slot) => (
          <Pressable
            key={slot.startTime}
            accessibilityRole="button"
            accessibilityLabel={`${aMover ? 'Mover a las' : 'Reservar a las'} ${slot.startTime}`}
            onPress={() => setHorario(slot)}
            style={({ pressed }) => [
              styles.horario,
              { width: anchoHorario },
              pressed && styles.horarioPresionado,
            ]}
          >
            <Text style={styles.horarioTexto}>{slot.startTime}</Text>
          </Pressable>
        ))}
      </View>

      {aMover ? (
        <Text style={styles.pie}>
          {aMover.status === 'CONFIRMADO'
            ? 'Ya está pagado: moverlo no cuesta nada.'
            : `Todavía falta pagarlo: sigue saliendo ${formatPrice(aMover.price)}.`}
        </Text>
      ) : precio !== null ? (
        <Text style={styles.pie}>
          La videoconsulta sale {formatPrice(precio)}. Se paga después de reservar.
        </Text>
      ) : null}

      <DayCalendarSheet
        visible={verCalendario}
        days={dias}
        selected={dia}
        onSelect={elegirDelCalendario}
        onDismiss={() => setVerCalendario(false)}
      />

      <ConfirmSheet
        visible={horario !== null}
        title={aMover ? '¿Mover el turno?' : '¿Reservar el turno?'}
        message={
          aMover && horario && dia
            ? desdeCancelacion
              ? `Tu turno con ${nombre} pasa al ${formatSentenceDay(dia, horario.startTime)}. Es el mismo turno, con el mismo pago: no volvés a pagar nada.`
              : `Pasa del ${formatSentenceDay(aMover.date, aMover.startTime)} al ${formatSentenceDay(dia, horario.startTime)}, con ${nombre}. Es el mismo turno${aMover.status === 'CONFIRMADO' ? ', con el mismo pago' : ''}. Después no se puede volver a reprogramar.`
            : horario && dia
              ? `Con ${nombre}, el ${formatSentenceDay(dia, horario.startTime)} (${horario.durationMinutes} min)${
                  precio !== null ? `, por ${formatPrice(precio)}` : ''
                }. ${AVISO_PAGO}${politica ? `\n\n${describePolicy(politica)}` : ''}`
              : ''
        }
        confirmLabel={aMover ? 'Mover el turno' : 'Reservar turno'}
        dismissLabel="Elegir otro horario"
        confirmVariant="primary"
        pending={envio.isPending}
        error={envio.isError ? envio.error.message : null}
        onDismiss={cerrarConfirmacion}
        onConfirm={() => {
          if (!horario || !dia) return;
          if (aMover) {
            reprogramar.mutate(
              { appointmentId: aMover.id, date: dia, startTime: horario.startTime },
              {
                onSuccess: (turno) => {
                  setHorario(null);
                  setMovido(turno);
                },
              },
            );
            return;
          }
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

/** Ancho de una tarjeta de día más el espacio entre tarjetas, para correr la tira. */
const ANCHO_DIA = 58 + spacing.sm;

const styles = StyleSheet.create({
  diasCabecera: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  verCalendario: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  verCalendarioTexto: { fontFamily: fonts.bold, fontSize: fontSize.sm, color: colors.brandHover },
  diasScroll: { flexGrow: 0 },
  dias: { gap: spacing.sm, paddingRight: spacing.lg, alignItems: 'flex-start' },
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
  diaHoy: { borderColor: colors.brand },
  diaActivo: { backgroundColor: colors.brandDeep, borderColor: colors.brandDeep },
  diaSinLugar: { opacity: 0.4 },
  diaSemana: {
    fontFamily: fonts.semibold,
    fontSize: fontSize.xs,
    color: colors.muted,
    textTransform: 'uppercase',
  },
  diaNumero: { fontFamily: fonts.display, fontSize: fontSize.xl, color: colors.brandDeep },
  diaMes: {
    fontFamily: fonts.semibold,
    fontSize: fontSize.xs,
    color: colors.muted,
    textTransform: 'uppercase',
  },
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
    backgroundColor: colors.warm,
  },
  listoIconoOk: { backgroundColor: colors.surfaceTeal },
  listoEyebrowOk: { color: colors.brandHover },
  listoEyebrow: {
    fontFamily: fonts.bold,
    fontSize: fontSize.xs,
    letterSpacing: 1.4,
    color: colors.warmInk,
  },
  listoTitulo: {
    fontFamily: fonts.display,
    fontSize: fontSize.xl,
    color: colors.brandDeep,
    textAlign: 'center',
  },
  listoDetalle: { fontFamily: fonts.medium, fontSize: fontSize.md, color: colors.muted },
});
