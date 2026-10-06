import { useNavigation } from '@react-navigation/native';
import { Alert, StyleSheet, View } from 'react-native';

import { useSessionUser } from '../features/auth/session';
import { NextAppointmentCard } from '../features/appointments/components/NextAppointmentCard';
import { useMyAppointments } from '../features/appointments/hooks/use-appointments';
import {
  formatShortDay,
  nextAppointment,
  professionalName,
  splitByTime,
} from '../features/appointments/lib/appointments';
import { joinStateOf, timeUntilOpen } from '../features/appointments/lib/join-window';
import type { Appointment } from '../features/appointments/types';
import { useNow } from '../shared/hooks/use-now';
import { Notice } from '../shared/ui/Notice';
import { QuickTile } from '../shared/ui/QuickTile';
import { Screen, ScreenHeader } from '../shared/ui/Screen';
import { ErrorState, LoadingState } from '../shared/ui/StatusViews';
import { spacing } from '../shared/ui/theme';

/**
 * Inicio: responde "¿qué tengo que hacer ahora?" antes que "¿adónde voy?".
 *
 * La franja oscura del canvas con el saludo y, montada encima, la próxima
 * consulta —con el botón para entrar a la sala cuando está abierta—. Debajo, lo
 * pendiente y los accesos rápidos.
 *
 * La historia clínica queda como acceso, sin su última entrada ni cuántas tiene:
 * cada lectura de la HC deja un registro de acceso en la auditoría (Ley 26.529),
 * y abrir la app no es consultar la historia.
 */
export function HomeScreen(): React.JSX.Element {
  const navigation = useNavigation();
  const { firstName } = useSessionUser();
  const turnos = useMyAppointments();
  // Cada 15 segundos: alcanza para que el botón de la sala aparezca a tiempo
  // sin redibujar la pantalla a cada segundo.
  const ahora = useNow(15_000);

  const proxima = turnos.data ? nextAppointment(turnos.data, ahora) : null;
  const proximos = turnos.data ? splitByTime(turnos.data, ahora).upcoming : null;
  // `upcoming` viene ordenado: con más de un turno impago, se avisa del más cercano.
  const sinPagar = proximos?.find(
    (t) => t.status === 'RESERVADO_SIN_PAGAR' && Date.parse(t.scheduledAt) > ahora.getTime(),
  );
  const cantidadProximos = proximos
    ? proximos.filter((t) => t.status !== 'CANCELADO').length
    : null;

  const irATurnos = (): void => navigation.navigate('Paciente', { screen: 'Turnos' });

  return (
    <Screen
      hero={
        <ScreenHeader
          hero
          tone="dark"
          title={firstName ? `Hola, ${firstName}` : 'Hola'}
          subtitle={turnos.data ? subtitulo(proxima, ahora) : ' '}
        />
      }
    >
      {turnos.isPending ? (
        <View style={styles.cargando}>
          <LoadingState label="Buscando tu próxima consulta…" />
        </View>
      ) : turnos.isError ? (
        // Sin los turnos no se sabe si hay una consulta: decir "no tenés turnos"
        // sería mentir justo cuando puede estar por empezar una.
        <ErrorState message={turnos.error.message} onRetry={() => void turnos.refetch()} />
      ) : (
        <NextAppointmentCard
          appointment={proxima}
          now={ahora}
          onJoin={() =>
            Alert.alert(
              'Videoconsulta',
              'En la versión conectada, este botón abre la sala de la consulta con tu profesional.',
            )
          }
        />
      )}

      {sinPagar ? (
        <Notice
          icon="time-outline"
          message={`Tu turno del ${formatShortDay(sinPagar.date, sinPagar.startTime)} con ${professionalName(sinPagar)} todavía no está pagado.`}
          action={{ label: 'Ver', onPress: irATurnos }}
        />
      ) : null}

      <View style={styles.accesos}>
        <QuickTile
          icon="calendar-outline"
          title="Turnos"
          caption={
            cantidadProximos === null
              ? 'Próximos y pasados'
              : cantidadProximos === 1
                ? '1 próximo'
                : `${cantidadProximos} próximos`
          }
          onPress={irATurnos}
        />
        <QuickTile
          icon="document-text-outline"
          title="Historia"
          caption="Tu historia clínica"
          onPress={() => navigation.navigate('HistoriaClinica')}
        />
        <QuickTile
          icon="qr-code-outline"
          title="MediPass"
          caption="Tu código de emergencia"
          onPress={() => navigation.navigate('Paciente', { screen: 'MediPass' })}
        />
      </View>
    </Screen>
  );
}

/** Lo que dice la franja debajo del saludo. */
function subtitulo(proxima: Appointment | null, ahora: Date): string {
  if (!proxima) return 'No tenés turnos próximos.';

  const sala = joinStateOf(proxima, ahora);
  if (sala.kind === 'OPEN') {
    return Date.parse(proxima.scheduledAt) > ahora.getTime()
      ? `Tu consulta con ${professionalName(proxima)} empieza pronto.`
      : `Tu consulta con ${professionalName(proxima)} está en curso.`;
  }

  const cuando = timeUntilOpen(new Date(proxima.scheduledAt), ahora);
  return cuando === 'mañana'
    ? 'Tu próxima consulta es mañana.'
    : `Tu próxima consulta es ${cuando}.`;
}

const styles = StyleSheet.create({
  cargando: { minHeight: 160 },
  accesos: { flexDirection: 'row', gap: spacing.sm },
});
