import { useNavigation } from '@react-navigation/native';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useSessionUser } from '../features/auth/session';
import { CompactAppointmentRow } from '../features/appointments/components/CompactAppointmentRow';
import { NextAppointmentCard } from '../features/appointments/components/NextAppointmentCard';
import { useMyAppointments } from '../features/appointments/hooks/use-appointments';
import {
  formatShortDay,
  nextAppointment,
  professionalName,
  splitByTime,
} from '../features/appointments/lib/appointments';
import { greeting, laterAppointments, pastProfessionals } from '../features/appointments/lib/home';
import { joinStateOf, timeUntilOpen } from '../features/appointments/lib/join-window';
import type { Appointment } from '../features/appointments/types';
import { PastProfessionalCard } from '../features/catalog/components/PastProfessionalCard';
import { useNow } from '../shared/hooks/use-now';
import { Notice } from '../shared/ui/Notice';
import { QuickTile } from '../shared/ui/QuickTile';
import { Screen, ScreenHeader } from '../shared/ui/Screen';
import { ErrorState, LoadingState } from '../shared/ui/StatusViews';
import { colors, fonts, fontSize, radius, spacing } from '../shared/ui/theme';

/**
 * Inicio: responde "¿qué tengo que hacer ahora?" antes que "¿adónde voy?".
 *
 * De arriba abajo, de lo urgente a lo útil:
 * 1. La franja con el saludo y, montada encima, la próxima consulta —con el
 *    botón para entrar a la sala cuando está abierta—.
 * 2. Lo pendiente: el turno que falta pagar.
 * 3. Los turnos que siguen, en una línea cada uno.
 * 4. Los profesionales con los que ya se atendió, para volver a reservar.
 * 5. Su historia clínica y su MediPass.
 *
 * Reservar no está acá como botón: es la tab central, a un toque desde
 * cualquier pantalla.
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
  const siguientes = turnos.data ? laterAppointments(turnos.data, proxima, ahora) : [];
  const profesionales = turnos.data ? pastProfessionals(turnos.data, ahora) : [];

  const irATurnos = (): void => navigation.navigate('Paciente', { screen: 'Turnos' });
  const irAReservar = (): void => navigation.navigate('Paciente', { screen: 'Reservar' });

  return (
    <Screen
      hero={
        <ScreenHeader
          hero
          tone="dark"
          title={firstName ? `${greeting(ahora)}, ${firstName}` : greeting(ahora)}
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
        <NextAppointmentCard appointment={proxima} now={ahora} onBook={irAReservar} />
      )}

      {sinPagar ? (
        <Notice
          icon="time-outline"
          message={`Tu turno del ${formatShortDay(sinPagar.date, sinPagar.startTime)} con ${professionalName(sinPagar)} todavía no está pagado.`}
          action={{
            label: 'Pagar',
            onPress: () => navigation.navigate('Pago', { appointmentId: sinPagar.id }),
          }}
        />
      ) : null}

      {siguientes.length > 0 ? (
        <View style={styles.seccion}>
          <View style={styles.seccionCabecera}>
            <Text style={styles.seccionTitulo}>DESPUÉS</Text>
            <Pressable accessibilityRole="button" hitSlop={spacing.sm} onPress={irATurnos}>
              <Text style={styles.link}>Ver todos</Text>
            </Pressable>
          </View>
          <View style={styles.grupo}>
            {siguientes.map((t, i) => (
              <CompactAppointmentRow
                key={t.id}
                appointment={t}
                last={i === siguientes.length - 1}
              />
            ))}
          </View>
        </View>
      ) : null}

      {profesionales.length > 0 ? (
        <View style={styles.seccion}>
          <Text style={styles.seccionTitulo}>VOLVER A CONSULTAR</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.carrusel}
            // Llega hasta el borde de la pantalla: se nota que hay más para el costado.
            style={styles.carruselFuera}
          >
            {profesionales.map((p) => (
              <PastProfessionalCard
                key={p.id}
                professional={p}
                onPress={() => navigation.navigate('Profesional', { id: p.id })}
              />
            ))}
          </ScrollView>
        </View>
      ) : null}

      <View style={styles.seccion}>
        <Text style={styles.seccionTitulo}>TU SALUD</Text>
        <View style={styles.accesos}>
          <QuickTile
            icon="document-text-outline"
            title="Historia clínica"
            caption="Tus consultas, estudios y recetas"
            onPress={() => navigation.navigate('HistoriaClinica')}
          />
          <QuickTile
            icon="qr-code-outline"
            title="MediPass"
            caption="Tu código para una emergencia"
            onPress={() => navigation.navigate('Paciente', { screen: 'MediPass' })}
          />
        </View>
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
  seccion: { gap: spacing.sm, marginTop: spacing.sm },
  seccionCabecera: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  seccionTitulo: {
    marginLeft: spacing.xs,
    fontFamily: fonts.bold,
    fontSize: fontSize.xs,
    letterSpacing: 1,
    color: colors.mutedSoft,
  },
  link: { fontFamily: fonts.bold, fontSize: fontSize.sm, color: colors.brandHover },
  grupo: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.card,
    paddingHorizontal: spacing.md,
  },
  carruselFuera: { marginHorizontal: -spacing.lg },
  carrusel: { gap: spacing.sm, paddingHorizontal: spacing.lg },
  accesos: { flexDirection: 'row', gap: spacing.sm },
});
