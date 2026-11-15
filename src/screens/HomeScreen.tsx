import { useNavigation } from '@react-navigation/native';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Polyline } from 'react-native-svg';

import { useSessionUser } from '../features/auth/session';
import { CompactAppointmentRow } from '../features/appointments/components/CompactAppointmentRow';
import { NextAppointmentCard } from '../features/appointments/components/NextAppointmentCard';
import { useMyAppointments } from '../features/appointments/hooks/use-appointments';
import {
  formatSentenceDay,
  nextAppointment,
  professionalName,
  splitByTime,
} from '../features/appointments/lib/appointments';
import { greeting, laterAppointments, pastProfessionals } from '../features/appointments/lib/home';
import type { Appointment } from '../features/appointments/types';
import type { MediPassAccess } from '../features/medipass/types';
import { PastProfessionalCard } from '../features/catalog/components/PastProfessionalCard';
import { useAccesses } from '../features/medipass/hooks/use-medipass';
import { estadoDeAcceso } from '../features/medipass/lib/medipass';
import { NotificationsBell } from '../features/notifications/components/NotificationsBell';
import { PatientSummaryTiles } from '../features/patient-summary/components/PatientSummaryTiles';
import { PendingReviewCards } from '../features/reviews/components/PendingReviewCards';
import { useConversations, useInboxRealtime } from '../features/chat/hooks/use-chat';
import { totalUnread } from '../features/chat/lib/chat';
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
 * 5. Su historia clínica, su MediPass y los mensajes con sus profesionales.
 * 6. Su resumen del período: consultas, pagos y accesos (ENG-198).
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
  const accesos = useAccesses();
  const bandeja = useConversations();
  useInboxRealtime();
  const sinLeer = bandeja.data ? totalUnread(bandeja.data.conversaciones) : 0;
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
  const abrirTurno = (t: Appointment): void =>
    navigation.navigate('Turno', { appointmentId: t.id });

  return (
    <Screen
      hero={
        <ScreenHeader
          hero
          tone="dark"
          backdrop={<Latido />}
          title={firstName ? `${greeting(ahora)}, ${firstName}` : greeting(ahora)}
          subtitle={alertaMediPass(accesos.data, ahora)}
          trailing={<NotificationsBell />}
        />
      }
    >
      {turnos.isPending ? (
        <View style={styles.cargando}>
          <LoadingState label="Buscando tu próximo turno…" />
        </View>
      ) : turnos.isError ? (
        // Sin los turnos no se sabe si hay una consulta: decir "no tenés turnos"
        // sería mentir justo cuando puede estar por empezar una.
        <ErrorState message={turnos.error.message} onRetry={() => void turnos.refetch()} />
      ) : (
        <NextAppointmentCard
          appointment={proxima}
          now={ahora}
          onBook={irAReservar}
          onOpen={proxima ? () => abrirTurno(proxima) : undefined}
          onPay={
            proxima ? () => navigation.navigate('Pago', { appointmentId: proxima.id }) : undefined
          }
        />
      )}

      {/* Si el que falta pagar es el próximo, el botón ya está en la tarjeta. */}
      {sinPagar && sinPagar.id !== proxima?.id ? (
        <Notice
          icon="time-outline"
          message={`Tu turno del ${formatSentenceDay(sinPagar.date, sinPagar.startTime)} con ${professionalName(sinPagar)} todavía no está pagado.`}
          action={{
            label: 'Pagar',
            onPress: () => navigation.navigate('Pago', { appointmentId: sinPagar.id }),
          }}
        />
      ) : null}

      <PendingReviewCards />

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
                onPress={() => abrirTurno(t)}
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
          <QuickTile
            icon={sinLeer > 0 ? 'chatbubbles' : 'chatbubbles-outline'}
            title="Mensajes"
            caption={
              sinLeer > 0
                ? `${sinLeer} ${sinLeer === 1 ? 'mensaje sin leer' : 'mensajes sin leer'}`
                : 'Escribile a tu profesional'
            }
            onPress={() => navigation.navigate('Mensajes')}
          />
        </View>
      </View>

      <PatientSummaryTiles />
    </Screen>
  );
}

/**
 * El trazo del corazón del logo, como en el ingreso: de fondo en la franja,
 * tenue y abajo, para que el inicio tenga la identidad de la marca sin
 * competir con el saludo.
 */
function Latido(): React.JSX.Element {
  return (
    <View
      style={styles.latido}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Svg width="100%" height={40} viewBox="0 0 320 56" preserveAspectRatio="none">
        <Polyline
          points="0,30 170,30 182,30 192,8 206,50 216,22 224,30 320,30"
          fill="none"
          stroke={colors.brandBright}
          strokeOpacity={0.18}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}

/**
 * Debajo del saludo, solo lo urgente que no está en otro lado del inicio: que
 * alguien esté viendo el MediPass ahora. Lo del próximo turno ya lo dice la
 * tarjeta de abajo; repetirlo acá sobraba.
 */
function alertaMediPass(accesos: MediPassAccess[] | undefined, ahora: Date): string | undefined {
  const vigentes = (accesos ?? []).filter((a) => estadoDeAcceso(a, ahora).estado === 'VIGENTE');
  if (vigentes.length === 0) return undefined;
  if (vigentes.length === 1) return `${vigentes[0]!.consultante} está viendo tu MediPass ahora.`;
  return `${vigentes.length} personas están viendo tu MediPass ahora.`;
}

const styles = StyleSheet.create({
  // Entre el saludo y la tarjeta que se monta encima, sin cruzar el texto.
  latido: { position: 'absolute', left: 0, right: 0, bottom: 34 },
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
