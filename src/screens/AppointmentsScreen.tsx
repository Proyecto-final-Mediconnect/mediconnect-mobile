import { useState } from 'react';
import { FlatList, RefreshControl, StyleSheet } from 'react-native';

import { AppointmentCard } from '../features/appointments/components/AppointmentCard';
import {
  useCancelAppointment,
  useMyAppointments,
} from '../features/appointments/hooks/use-appointments';
import {
  formatShortDay,
  professionalName,
  splitByTime,
} from '../features/appointments/lib/appointments';
import type { Appointment } from '../features/appointments/types';
import { useNow } from '../shared/hooks/use-now';
import { ConfirmSheet } from '../shared/ui/ConfirmSheet';
import { Screen, ScreenHeader } from '../shared/ui/Screen';
import { SegmentedControl } from '../shared/ui/SegmentedControl';
import { EmptyState, ErrorState, LoadingState } from '../shared/ui/StatusViews';
import { colors, spacing } from '../shared/ui/theme';

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
  const turnos = useMyAppointments();
  const cancelar = useCancelAppointment();
  const ahora = useNow(60_000);
  const [vista, setVista] = useState<Vista>('proximos');
  const [aCancelar, setACancelar] = useState<Appointment | null>(null);

  const header = (
    <ScreenHeader title="Mis turnos">
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
  const lista = vista === 'proximos' ? upcoming : past;

  const cerrarConfirmacion = (): void => {
    setACancelar(null);
    cancelar.reset();
  };

  return (
    <Screen scroll={false} padded={false} header={header}>
      <FlatList
        data={lista}
        keyExtractor={(turno) => turno.id}
        renderItem={({ item }) => (
          <AppointmentCard appointment={item} onCancel={setACancelar} now={ahora} />
        )}
        contentContainerStyle={styles.lista}
        refreshControl={
          <RefreshControl
            refreshing={turnos.isRefetching}
            onRefresh={() => void turnos.refetch()}
            tintColor={colors.brand}
            colors={[colors.brand]}
          />
        }
        ListEmptyComponent={
          vista === 'proximos' ? (
            <EmptyState
              icon="calendar-outline"
              title="No tenés turnos próximos"
              description="Reservá con un profesional desde MediConnect en la web y lo vas a ver acá."
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
});
