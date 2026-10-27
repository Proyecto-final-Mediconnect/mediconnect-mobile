import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { useState, type ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  useCancelAppointment,
  useMyAppointments,
} from '../features/appointments/hooks/use-appointments';
import {
  canCancel,
  formatLongDay,
  formatPrice,
  formatShortDay,
  isActive,
  professionalName,
  statusLabel,
  statusTone,
} from '../features/appointments/lib/appointments';
import { joinStateOf } from '../features/appointments/lib/join-window';
import { appointmentTimeline, type TimelineStep } from '../features/appointments/lib/timeline';
import { ProfessionalAvatar } from '../features/catalog/components/ProfessionalAvatar';
import { getPaymentStatus } from '../features/payments/api';
import { canPay } from '../features/payments/lib/payment';
import { JoinConsultationButton } from '../features/video/components/JoinConsultationButton';
import type { RootStackParamList } from '../navigation/types';
import { refundOutcomeText } from '../features/cancellation-policy/policy';
import { useRefundNotice } from '../features/cancellation-policy/use-refund-notice';
import { useNow } from '../shared/hooks/use-now';
import { Button } from '../shared/ui/Button';
import { Chip } from '../shared/ui/Chip';
import { ConfirmSheet } from '../shared/ui/ConfirmSheet';
import { Notice } from '../shared/ui/Notice';
import { Screen, ScreenHeader } from '../shared/ui/Screen';
import { EmptyState, ErrorState, LoadingState } from '../shared/ui/StatusViews';
import { colors, fonts, fontSize, radius, spacing } from '../shared/ui/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

/**
 * El detalle de un turno: con quién, cuándo, cuánto, qué pasó desde que se
 * reservó y qué se puede hacer ahora (pagar, entrar a la sala, cancelar o volver
 * a reservar con el mismo profesional).
 *
 * El turno sale de la lista de "Mis turnos", que ya está en caché; el pago se
 * consulta aparte y, si falla, la historia se arma igual sin ese dato.
 */
export function AppointmentDetailScreen(): React.JSX.Element {
  const navigation = useNavigation();
  const { params } = useRoute<RouteProp<RootStackParamList, 'Turno'>>();
  const turnos = useMyAppointments();
  const cancelar = useCancelAppointment();
  const ahora = useNow(60_000);
  const [confirmando, setConfirmando] = useState(false);

  const turno = turnos.data?.find((t) => t.id === params.appointmentId) ?? null;
  const devolucion = useRefundNotice(confirmando ? turno : null, ahora);
  /** Qué pasó con la devolución al cancelar desde acá (ENG-65). */
  const [resultadoDevolucion, setResultadoDevolucion] = useState<string | null>(null);
  const pago = useQuery({
    queryKey: ['payment', params.appointmentId, 'detalle'],
    queryFn: () => getPaymentStatus(params.appointmentId),
    enabled: turno !== null,
    retry: false,
  });

  const header = <ScreenHeader title="Tu turno" onBack={() => navigation.goBack()} />;

  if (turnos.isPending) {
    return (
      <Screen scroll={false} header={header}>
        <LoadingState label="Buscando el turno…" />
      </Screen>
    );
  }
  if (turnos.isError) {
    return (
      <Screen scroll={false} header={header}>
        <ErrorState message={turnos.error.message} onRetry={() => void turnos.refetch()} />
      </Screen>
    );
  }
  if (!turno) {
    return (
      <Screen scroll={false} header={header}>
        <EmptyState
          icon="calendar-outline"
          title="No encontramos ese turno"
          description="Puede que se haya borrado o que no sea tuyo."
        />
      </Screen>
    );
  }

  const pasos = appointmentTimeline(turno, pago.data ?? null, ahora);
  const salaAbierta = joinStateOf(turno, ahora).kind === 'OPEN';
  const profesional = turno.professional;

  return (
    <Screen header={header}>
      {resultadoDevolucion ? <Notice icon="cash-outline" message={resultadoDevolucion} /> : null}

      <View style={styles.card}>
        <View style={styles.quien}>
          {profesional ? (
            <ProfessionalAvatar professional={{ ...profesional, photoUrl: null }} size={52} />
          ) : null}
          <View style={styles.quienTextos}>
            <Text style={styles.nombre}>{professionalName(turno)}</Text>
            <Chip label={statusLabel(turno.status)} tone={statusTone(turno.status)} />
          </View>
        </View>

        <View style={styles.datos}>
          <Dato icon="calendar-outline" texto={capitalizar(formatLongDay(turno.date))} />
          <Dato
            icon="time-outline"
            texto={`${turno.startTime} hs · ${String(turno.durationMinutes)} minutos`}
          />
          <Dato icon="videocam-outline" texto="Videoconsulta" />
          <Dato icon="card-outline" texto={formatPrice(turno.price)} />
        </View>

        {salaAbierta || canPay(turno, ahora) ? (
          <View style={styles.accion}>
            {salaAbierta ? (
              <JoinConsultationButton appointmentId={turno.id} />
            ) : (
              <Button
                label="Pagar el turno"
                variant="accent"
                onPress={() => navigation.navigate('Pago', { appointmentId: turno.id })}
                fullWidth
              />
            )}
          </View>
        ) : null}
      </View>

      <Text style={styles.seccion}>QUÉ PASÓ</Text>
      <View style={[styles.card, styles.historia]}>
        {pasos.map((paso, i) => (
          <Paso key={paso.key} paso={paso} ultimo={i === pasos.length - 1} />
        ))}
      </View>

      <View style={styles.botones}>
        {!isActive(turno) && profesional ? (
          <Button
            label={`Volver a reservar con ${profesional.firstName}`}
            onPress={() => navigation.navigate('Profesional', { id: profesional.id })}
            fullWidth
          />
        ) : null}
        {canCancel(turno, ahora) ? (
          <Button
            label="Cancelar el turno"
            variant="secondary"
            onPress={() => setConfirmando(true)}
            fullWidth
          />
        ) : null}
      </View>

      <ConfirmSheet
        visible={confirmando}
        title="¿Cancelar el turno?"
        message={`Se cancela tu turno del ${formatShortDay(turno.date, turno.startTime)} con ${professionalName(turno)}, y el horario queda libre para otro paciente.${devolucion.texto ? `\n\n${devolucion.texto}` : ''}`}
        confirmLabel="Cancelar turno"
        dismissLabel="Mantener el turno"
        pending={cancelar.isPending}
        confirmDisabled={devolucion.cargando}
        error={cancelar.isError ? cancelar.error.message : null}
        onDismiss={() => {
          setConfirmando(false);
          cancelar.reset();
        }}
        onConfirm={() =>
          cancelar.mutate(turno.id, {
            onSuccess: (cancelado) => {
              setResultadoDevolucion(refundOutcomeText(cancelado.refund));
              setConfirmando(false);
              void pago.refetch();
            },
          })
        }
      />
    </Screen>
  );
}

function capitalizar(texto: string): string {
  return `${texto.charAt(0).toUpperCase()}${texto.slice(1)}`;
}

function Dato({ icon, texto }: { icon: IconName; texto: string }): React.JSX.Element {
  return (
    <View style={styles.dato}>
      <Ionicons name={icon} size={18} color={colors.brandHover} />
      <Text style={styles.datoTexto}>{texto}</Text>
    </View>
  );
}

const PUNTO: Record<TimelineStep['tone'], string> = {
  done: colors.brand,
  current: colors.warmDot,
  pending: colors.lineStrong,
  bad: colors.danger,
};

/** Un paso de la historia: un punto, la línea que lo une con el siguiente y el texto. */
function Paso({ paso, ultimo }: { paso: TimelineStep; ultimo: boolean }): React.JSX.Element {
  return (
    <View style={styles.paso}>
      <View style={styles.guia}>
        <View
          style={[
            styles.punto,
            { borderColor: PUNTO[paso.tone] },
            paso.tone !== 'pending' && { backgroundColor: PUNTO[paso.tone] },
          ]}
        />
        {ultimo ? null : <View style={styles.linea} />}
      </View>
      <View style={[styles.pasoTextos, !ultimo && styles.pasoSeparado]}>
        <Text style={[styles.pasoTitulo, paso.tone === 'pending' && styles.pasoPendiente]}>
          {paso.title}
        </Text>
        {paso.when ? <Text style={styles.pasoCuando}>{paso.when}</Text> : null}
      </View>
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
    gap: spacing.lg,
  },
  quien: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  quienTextos: { flex: 1, gap: 6 },
  nombre: { fontFamily: fonts.bold, fontSize: fontSize.lg, color: colors.brandDeep },
  datos: {
    gap: spacing.md,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.lineSoft,
  },
  dato: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  datoTexto: { fontFamily: fonts.medium, fontSize: fontSize.md, color: colors.ink },
  accion: { marginTop: -spacing.xs },
  seccion: {
    marginTop: spacing.sm,
    marginLeft: spacing.xs,
    fontFamily: fonts.bold,
    fontSize: fontSize.xs,
    letterSpacing: 1,
    color: colors.mutedSoft,
  },
  historia: { gap: 0 },
  paso: { flexDirection: 'row', gap: spacing.md },
  guia: { alignItems: 'center', width: 14 },
  punto: { width: 12, height: 12, borderRadius: 6, borderWidth: 2, marginTop: 3 },
  linea: { flex: 1, width: 2, marginVertical: 2, backgroundColor: colors.line },
  pasoTextos: { flex: 1, gap: 2 },
  pasoSeparado: { paddingBottom: spacing.lg },
  pasoTitulo: { fontFamily: fonts.semibold, fontSize: fontSize.md, color: colors.ink },
  pasoPendiente: { color: colors.muted },
  pasoCuando: { fontFamily: fonts.medium, fontSize: fontSize.sm, color: colors.muted },
  botones: { gap: spacing.sm, marginTop: spacing.sm },
});
