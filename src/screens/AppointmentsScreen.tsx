import { useNavigation } from '@react-navigation/native';
import { useMemo, useState } from 'react';
import { RefreshControl, SectionList, StyleSheet, Text, View } from 'react-native';

import { AppointmentCard } from '../features/appointments/components/AppointmentCard';
import { CompactAppointmentRow } from '../features/appointments/components/CompactAppointmentRow';
import {
  useCancelAppointment,
  useMyAppointments,
} from '../features/appointments/hooks/use-appointments';
import {
  agendaSections,
  EMPTY_AGENDA_FILTERS,
  filterAgenda,
  PERIOD_LABELS,
  STATUS_FILTER_LABELS,
  type AgendaFilters,
  type Period,
  type StatusFilter,
} from '../features/appointments/lib/agenda';
import {
  formatShortDay,
  isActive,
  professionalName,
} from '../features/appointments/lib/appointments';
import type { Appointment } from '../features/appointments/types';
import { useNow } from '../shared/hooks/use-now';
import { usePullToRefresh } from '../shared/hooks/use-pull-to-refresh';
import { ConfirmSheet } from '../shared/ui/ConfirmSheet';
import { FilterSheet } from '../shared/ui/FilterSheet';
import { Screen, ScreenHeader } from '../shared/ui/Screen';
import { SearchFilterBar, type ActiveFilter } from '../shared/ui/SearchFilterBar';
import { EmptyState, ErrorState, LoadingState } from '../shared/ui/StatusViews';
import { colors, fonts, fontSize, radius, spacing } from '../shared/ui/theme';

/**
 * Mis turnos (ENG-115), en una sola lista: arriba los próximos con sus acciones,
 * y bajando, la historia agrupada por mes. Se busca por profesional y se filtra
 * por fecha y estado; tocar un turno abre su detalle.
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
  const [filtros, setFiltros] = useState<AgendaFilters>(EMPTY_AGENDA_FILTERS);
  const [verFiltros, setVerFiltros] = useState(false);
  const [aCancelar, setACancelar] = useState<Appointment | null>(null);

  const irAReservar = (): void => navigation.navigate('Paciente', { screen: 'Reservar' });
  const abrir = (t: Appointment): void => navigation.navigate('Turno', { appointmentId: t.id });

  // Arriba de los `return` tempranos (reglas de hooks): recalcular sólo si
  // cambian los turnos, los filtros o el minuto, no en cada render.
  const filtrados = useMemo(
    () => filterAgenda(turnos.data ?? [], filtros, ahora),
    [turnos.data, filtros, ahora],
  );
  const secciones = useMemo(() => agendaSections(filtrados, ahora), [filtrados, ahora]);

  const header = (
    <ScreenHeader
      title="Mis turnos"
      action={{ label: 'Nuevo turno', icon: 'add', onPress: irAReservar }}
    />
  );

  const activos: ActiveFilter[] = [
    ...(filtros.period !== 'todos'
      ? [
          {
            key: 'periodo',
            label: PERIOD_LABELS[filtros.period],
            onRemove: () => setFiltros((f) => ({ ...f, period: 'todos' })),
          },
        ]
      : []),
    ...(filtros.status !== 'todos'
      ? [
          {
            key: 'estado',
            label: STATUS_FILTER_LABELS[filtros.status],
            onRemove: () => setFiltros((f) => ({ ...f, status: 'todos' })),
          },
        ]
      : []),
  ];

  const barra = (
    <SearchFilterBar
      search={filtros.search}
      onSearch={(search) => setFiltros((f) => ({ ...f, search }))}
      placeholder="Buscar por profesional"
      searchLabel="Buscar turno por profesional"
      onOpenFilters={() => setVerFiltros(true)}
      active={activos}
    />
  );

  if (turnos.isPending) {
    return (
      <Screen scroll={false} padded={false} header={header}>
        <LoadingState label="Buscando tus turnos…" />
      </Screen>
    );
  }

  if (turnos.isError) {
    return (
      <Screen scroll={false} padded={false} header={header}>
        <ErrorState message={turnos.error.message} onRetry={() => void turnos.refetch()} />
      </Screen>
    );
  }

  const hayFiltros = filtros.search.trim() !== '' || activos.length > 0;

  const cerrarConfirmacion = (): void => {
    setACancelar(null);
    cancelar.reset();
  };

  const opcion = <T extends string>(
    valor: T,
    actual: T,
    etiqueta: string,
    elegir: (v: T) => void,
  ): { key: string; label: string; selected: boolean; onPress: () => void } => ({
    key: valor,
    label: etiqueta,
    selected: valor === actual,
    onPress: () => elegir(valor),
  });

  return (
    <Screen scroll={false} padded={false} header={header}>
      {turnos.data.length > 0 ? barra : null}
      <SectionList
        testID="lista-turnos"
        sections={secciones}
        keyExtractor={(turno) => turno.id}
        stickySectionHeadersEnabled={false}
        // Los títulos de sección cuentan como filas: con el valor por defecto
        // (10) la historia quedaba sin dibujar hasta hacer scroll.
        initialNumToRender={24}
        renderSectionHeader={({ section }) => (
          <Text style={styles.seccionTitulo}>{section.title.toUpperCase()}</Text>
        )}
        renderItem={({ item, index, section }) =>
          section.kind === 'card' ? (
            <View style={styles.tarjeta}>
              <AppointmentCard
                appointment={item}
                onCancel={setACancelar}
                onPay={(t) => navigation.navigate('Pago', { appointmentId: t.id })}
                onOpen={abrir}
                now={ahora}
              />
            </View>
          ) : (
            <View
              style={[
                styles.grupo,
                index === 0 && styles.grupoArriba,
                index === section.data.length - 1 && styles.grupoAbajo,
              ]}
            >
              <CompactAppointmentRow
                appointment={item}
                last={index === section.data.length - 1}
                muted={!isActive(item)}
                onPress={() => abrir(item)}
              />
            </View>
          )
        }
        contentContainerStyle={styles.lista}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={
          <RefreshControl
            refreshing={tirar.refreshing}
            onRefresh={tirar.onRefresh}
            tintColor={colors.brand}
            colors={[colors.brand]}
          />
        }
        ListEmptyComponent={
          hayFiltros ? (
            <EmptyState
              icon="search-outline"
              title="No hay turnos con esos filtros"
              description="Probá con otra fecha, otro estado u otro nombre."
              action={{ label: 'Limpiar filtros', onPress: () => setFiltros(EMPTY_AGENDA_FILTERS) }}
            />
          ) : (
            <EmptyState
              icon="calendar-outline"
              title="Todavía no tenés turnos"
              description="Buscá un profesional y reservá el horario que te quede cómodo."
              action={{ label: 'Sacar un turno', onPress: irAReservar }}
            />
          )
        }
      />

      <FilterSheet
        visible={verFiltros}
        onDismiss={() => setVerFiltros(false)}
        groups={[
          {
            title: 'Fecha',
            options: (Object.keys(PERIOD_LABELS) as Period[]).map((p) =>
              opcion(p, filtros.period, PERIOD_LABELS[p], (period) =>
                setFiltros((f) => ({ ...f, period })),
              ),
            ),
          },
          {
            title: 'Estado',
            options: (Object.keys(STATUS_FILTER_LABELS) as StatusFilter[]).map((e) =>
              opcion(e, filtros.status, STATUS_FILTER_LABELS[e], (status) =>
                setFiltros((f) => ({ ...f, status })),
              ),
            ),
          },
        ]}
        resultLabel={verTurnos(filtrados.length)}
        onClear={
          activos.length > 0
            ? () => setFiltros((f) => ({ ...f, period: 'todos', status: 'todos' }))
            : undefined
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

function verTurnos(total: number): string {
  if (total === 0) return 'No hay turnos';
  return total === 1 ? 'Ver 1 turno' : `Ver ${String(total)} turnos`;
}

const styles = StyleSheet.create({
  lista: { flexGrow: 1, paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  seccionTitulo: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
    fontFamily: fonts.bold,
    fontSize: fontSize.xs,
    letterSpacing: 1,
    color: colors.mutedSoft,
  },
  tarjeta: { marginBottom: spacing.md },
  // Las filas de un mes forman una sola tarjeta: cada una pone sus lados y la
  // primera y la última, las esquinas.
  grupo: {
    backgroundColor: colors.white,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: spacing.md,
  },
  grupoArriba: {
    borderTopWidth: 1,
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
  },
  grupoAbajo: {
    borderBottomWidth: 1,
    borderBottomLeftRadius: radius.card,
    borderBottomRightRadius: radius.card,
  },
});
