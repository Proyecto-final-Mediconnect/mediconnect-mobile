import { useNavigation } from '@react-navigation/native';
import { useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { AppointmentCard } from '../features/appointments/components/AppointmentCard';
import { CompactAppointmentRow } from '../features/appointments/components/CompactAppointmentRow';
import {
  useCancelAppointment,
  useMyAppointments,
} from '../features/appointments/hooks/use-appointments';
import {
  formatShortDay,
  isActive,
  professionalName,
  splitByTime,
} from '../features/appointments/lib/appointments';
import type { Appointment } from '../features/appointments/types';
import { useNow } from '../shared/hooks/use-now';
import { usePullToRefresh } from '../shared/hooks/use-pull-to-refresh';
import { ConfirmSheet } from '../shared/ui/ConfirmSheet';
import { Screen, ScreenHeader } from '../shared/ui/Screen';
import { SegmentedControl } from '../shared/ui/SegmentedControl';
import { EmptyState, ErrorState, LoadingState } from '../shared/ui/StatusViews';
import { colors, fonts, fontSize, radius, spacing } from '../shared/ui/theme';

type Vista = 'proximos' | 'pasados';

/**
 * Mis turnos (ENG-115): próximos y pasados, pull-to-refresh y cancelar con
 * confirmación. Equivalente mobile de "Mis turnos" de la web (ENG-55), con las
 * mismas reglas portadas.
 *
 * Las fechas son `date` y `startTime` del backend, que ya vienen en hora de
 * Argentina —las que eligió el paciente—, así que un turno de las 22:30 no se
 * corre al día siguiente aunque el teléfono esté en otra zona.
 */
export function AppointmentsScreen(): React.JSX.Element {
  const navigation = useNavigation();
  const turnos = useMyAppointments();
  const tirar = usePullToRefresh(turnos.refetch);
  const cancelar = useCancelAppointment();
  const ahora = useNow(60_000);
  const [vista, setVista] = useState<Vista>('proximos');
  const [aCancelar, setACancelar] = useState<Appointment | null>(null);

  const irAReservar = (): void => navigation.navigate('Paciente', { screen: 'Reservar' });

  const header = (
    <ScreenHeader
      title="Mis turnos"
      action={{ label: 'Nuevo turno', icon: 'add', onPress: irAReservar }}
    >
      <SegmentedControl
        value={vista}
        onChange={setVista}
        options={[
          { value: 'proximos', label: 'Próximos' },
          { value: 'pasados', label: 'Pasados' },
        ]}
      />
    </ScreenHeader>
  );

  if (turnos.isPending) {
    return (
      <Screen scroll={false} header={header}>
        <LoadingState label="Buscando tus turnos…" />
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

  const { upcoming, past } = splitByTime(turnos.data, ahora);
  // En "Próximos", los que ya no se van a realizar (cancelados, liberados) no
  // compiten con los vigentes: van en un grupo aparte, al final y apagados.
  const lista = vista === 'proximos' ? upcoming.filter(isActive) : past;
  const descartados = vista === 'proximos' ? upcoming.filter((t) => !isActive(t)) : [];

  const cerrarConfirmacion = (): void => {
    setACancelar(null);
    cancelar.reset();
  };

  return (
    <Screen scroll={false} padded={false} header={header}>
      <FlatList
        testID="lista-turnos"
        data={lista}
        keyExtractor={(turno) => turno.id}
        renderItem={({ item }) => (
          <AppointmentCard
            appointment={item}
            onCancel={setACancelar}
            onPay={(t) => navigation.navigate('Pago', { appointmentId: t.id })}
            now={ahora}
          />
        )}
        contentContainerStyle={styles.lista}
        refreshControl={
          <RefreshControl
            refreshing={tirar.refreshing}
            onRefresh={tirar.onRefresh}
            tintColor={colors.brand}
            colors={[colors.brand]}
          />
        }
        ListFooterComponent={
          descartados.length > 0 ? (
            <View style={styles.seccion}>
              <Text style={styles.seccionTitulo}>CANCELADOS Y LIBERADOS</Text>
              <View style={styles.grupo}>
                {descartados.map((t, i) => (
                  <CompactAppointmentRow
                    key={t.id}
                    appointment={t}
                    last={i === descartados.length - 1}
                    muted
                  />
                ))}
              </View>
            </View>
          ) : null
        }
        ListEmptyComponent={
          vista === 'proximos' ? (
            <EmptyState
              icon="calendar-outline"
              title="No tenés turnos próximos"
              description="Buscá un profesional y reservá el horario que te quede cómodo."
              action={{ label: 'Sacar un turno', onPress: irAReservar }}
            />
          ) : (
            <EmptyState
              icon="time-outline"
              title="Todavía no tuviste consultas"
              description="Acá vas a ver las consultas que ya pasaron."
            />
          )
        }
      />

      <ConfirmSheet
        visible={aCancelar !== null}
        title="¿Cancelar el turno?"
        message={
          aCancelar
            ? `Se cancela tu turno del ${formatShortDay(aCancelar.date, aCancelar.startTime)} con ${professionalName(aCancelar)}, y el horario queda libre para otro paciente.`
            : ''
        }
        confirmLabel="Cancelar turno"
        dismissLabel="Mantener el turno"
        pending={cancelar.isPending}
        error={cancelar.isError ? cancelar.error.message : null}
        onDismiss={cerrarConfirmacion}
        onConfirm={() => {
          if (aCancelar) cancelar.mutate(aCancelar.id, { onSuccess: cerrarConfirmacion });
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  lista: { flexGrow: 1, padding: spacing.lg, gap: spacing.md },
  seccion: { gap: spacing.sm, marginTop: spacing.sm },
  seccionTitulo: {
    marginLeft: spacing.xs,
    fontFamily: fonts.bold,
    fontSize: fontSize.xs,
    letterSpacing: 1,
    color: colors.mutedSoft,
  },
  grupo: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.card,
    paddingHorizontal: spacing.md,
  },
});
