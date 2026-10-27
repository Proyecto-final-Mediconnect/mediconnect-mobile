import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState, type ComponentProps } from 'react';
import { AppState, StyleSheet, Text, View } from 'react-native';

import {
  MY_APPOINTMENTS_KEY,
  useMyAppointments,
} from '../features/appointments/hooks/use-appointments';
import {
  formatPrice,
  formatShortDay,
  professionalName,
} from '../features/appointments/lib/appointments';
import {
  openCheckout,
  POLL_CHECKOUT_INTERVAL_MS,
  POLL_INTERVAL_MS,
  usePaymentStatus,
  useStartCheckout,
} from '../features/payments/hooks/use-payment';
import { canPay, paymentOutcomeOf, type PaymentOutcome } from '../features/payments/lib/payment';
import type { PaymentStatus } from '../features/payments/types';
import type { RootStackParamList } from '../navigation/types';
import { Button } from '../shared/ui/Button';
import { Screen, ScreenHeader } from '../shared/ui/Screen';
import { ErrorState, LoadingState } from '../shared/ui/StatusViews';
import { colors, fonts, fontSize, radius, spacing } from '../shared/ui/theme';

/** Cuánto se espera el webhook después de que el paciente vuelve, antes de dejar de preguntar. */
export const ESPERA_MAXIMA_MS = 60_000;

/**
 * En qué parte del pago está el paciente:
 * - `inicio`: todavía no abrió MercadoPago.
 * - `checkout`: abrió MercadoPago y no volvió. Se consulta igual: si el webhook
 *   llega antes de que vuelva, al volver ya está el resultado.
 * - `volvio`: cerró el navegador. Se espera el webhook hasta {@link ESPERA_MAXIMA_MS}.
 */
type Fase = 'inicio' | 'checkout' | 'volvio';

/**
 * Pagar un turno con MercadoPago desde la app (ENG-168). Equivalente mobile de
 * la pantalla de pago de la web (ENG-63).
 *
 * El checkout se abre en el navegador dentro de la app; la tarjeta se carga del
 * lado de MercadoPago (ADR-013). **La vuelta no confirma nada**: el turno lo
 * confirma el webhook (ENG-64), y esta pantalla solo consulta el estado.
 */
export function PaymentScreen(): React.JSX.Element {
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const { params } = useRoute<RouteProp<RootStackParamList, 'Pago'>>();
  const turnos = useMyAppointments();
  const turno = turnos.data?.find((t) => t.id === params.appointmentId) ?? null;

  const iniciar = useStartCheckout();
  // `isPending` recién cambia en el próximo render: dos toques seguidos lo leen
  // en false y pedirían dos links. El ref corta el segundo en el acto.
  const pidiendo = useRef(false);
  const [fase, setFase] = useState<Fase>('inicio');
  const [estadoPrevio, setEstadoPrevio] = useState<PaymentStatus | null>(null);
  const [errorApertura, setErrorApertura] = useState<string | null>(null);
  const [agotado, setAgotado] = useState(false);
  const [intento, setIntento] = useState(0);

  const estado = usePaymentStatus(
    params.appointmentId,
    fase !== 'inicio' && !agotado,
    estadoPrevio,
    fase === 'checkout' ? POLL_CHECKOUT_INTERVAL_MS : POLL_INTERVAL_MS,
  );
  const resultado: PaymentOutcome | null =
    fase !== 'inicio' && estado.data ? paymentOutcomeOf(estado.data, estadoPrevio) : null;

  // Android no avisa cuándo se cierra el navegador in-app: el paciente volvió
  // cuando la app vuelve al primer plano.
  useEffect(() => {
    if (fase !== 'checkout') return;
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') setFase('volvio');
    });
    return () => sub.remove();
  }, [fase]);

  // Desde que vuelve, se espera el webhook un rato y después se deja de preguntar.
  useEffect(() => {
    if (fase !== 'volvio') return;
    const timer = setTimeout(() => setAgotado(true), ESPERA_MAXIMA_MS);
    return () => clearTimeout(timer);
  }, [fase, intento]);

  // Confirmado: "Mis turnos" y el inicio tienen que dejar de mostrarlo impago.
  useEffect(() => {
    if (resultado === 'CONFIRMADO') {
      void queryClient.invalidateQueries({ queryKey: MY_APPOINTMENTS_KEY });
    }
  }, [resultado, queryClient]);

  function pagar(): void {
    if (pidiendo.current) return;
    pidiendo.current = true;
    setErrorApertura(null);
    setAgotado(false);
    iniciar.mutate(params.appointmentId, {
      onSettled: () => {
        pidiendo.current = false;
      },
      onSuccess: (link) => {
        setEstadoPrevio(link.status);
        setFase('checkout');
        openCheckout(link.checkoutUrl)
          .then((cerrado) => {
            if (cerrado) setFase('volvio');
          })
          .catch(() => {
            setFase('inicio');
            setErrorApertura('No pudimos abrir MercadoPago. Probá de nuevo.');
          });
      },
    });
  }

  function volverAConsultar(): void {
    setAgotado(false);
    setIntento((n) => n + 1);
    void estado.refetch();
  }

  const header = <ScreenHeader title="Pagar el turno" onBack={() => navigation.goBack()} />;

  if (turnos.isPending) {
    return (
      <Screen scroll={false} header={header}>
        <LoadingState label="Buscando tu turno…" />
      </Screen>
    );
  }

  // Un refetch en segundo plano que falla no tapa el pago si el turno ya está cargado.
  if (!turno) {
    return (
      <Screen scroll={false} header={header}>
        <ErrorState
          message={turnos.isError ? turnos.error.message : 'No encontramos ese turno.'}
          onRetry={() => void turnos.refetch()}
        />
      </Screen>
    );
  }

  const detalle = (
    <View style={styles.card}>
      <Text style={styles.cuando}>{formatShortDay(turno.date, turno.startTime).toUpperCase()}</Text>
      <Text style={styles.nombre}>{professionalName(turno)}</Text>
      <Text style={styles.detalleTexto}>Videoconsulta · {turno.durationMinutes} min</Text>
      <View style={styles.total}>
        <Text style={styles.totalRotulo}>Total</Text>
        <Text style={styles.totalMonto}>{formatPrice(turno.price)}</Text>
      </View>
    </View>
  );

  if (resultado === 'CONFIRMADO') {
    return (
      <Screen header={header}>
        <Resultado icono="checkmark" tono="ok" titulo="¡Listo, tu turno está confirmado!">
          MercadoPago acreditó el pago. Te vamos a recordar la consulta antes de que empiece.
        </Resultado>
        {detalle}
        <Button
          label="Ver mis turnos"
          onPress={() => navigation.navigate('Paciente', { screen: 'Turnos' })}
          fullWidth
        />
      </Screen>
    );
  }

  if (resultado === 'TURNO_VENCIDO' || resultado === 'SIN_TURNO') {
    return (
      <Screen header={header}>
        <Resultado icono="time-outline" tono="warning" titulo="El turno ya no está reservado">
          {resultado === 'TURNO_VENCIDO'
            ? 'Se liberó porque no se pagó a tiempo, y el horario volvió a estar disponible. Podés reservar otro cuando quieras.'
            : 'El pago se acreditó, pero el turno se canceló o se liberó mientras pagabas. Te devolvemos el pago entero por MercadoPago, al mismo medio con el que pagaste; puede tardar unos días en verse.'}
        </Resultado>
        <Button
          label="Reservar otro turno"
          onPress={() => navigation.navigate('Paciente', { screen: 'Reservar' })}
          fullWidth
        />
      </Screen>
    );
  }

  // Antes de abrir MercadoPago, o de vuelta sin un resultado definitivo.
  const sePuedePagar = canPay(turno);
  const esperando = fase !== 'inicio' && resultado !== 'RECHAZADO';

  return (
    <Screen header={header}>
      {detalle}

      {resultado === 'RECHAZADO' ? (
        <Resultado icono="close" tono="error" titulo="MercadoPago rechazó el pago">
          Tu turno sigue reservado. Podés intentar de nuevo con otro medio de pago.
        </Resultado>
      ) : null}

      {esperando ? (
        <View accessibilityRole="summary" style={styles.esperando}>
          <Text style={styles.esperandoTitulo}>
            {fase === 'checkout'
              ? 'Completá el pago en MercadoPago'
              : agotado
                ? 'Todavía no nos llegó la confirmación'
                : 'Consultando el estado de tu pago…'}
          </Text>
          <Text style={styles.esperandoTexto}>
            {fase === 'checkout'
              ? 'Cuando termines, cerrá la ventana y volvé a la app: el turno se confirma solo cuando MercadoPago nos avisa.'
              : agotado
                ? estadoPrevio === 'RECHAZADO'
                  ? 'Puede que MercadoPago haya rechazado el pago de nuevo, o que todavía esté en camino. Si se confirma, lo vas a ver en Mis turnos.'
                  : 'Puede tardar unos minutos. El turno se confirma solo y lo vas a ver en Mis turnos.'
                : 'En unos segundos nos llega el aviso de MercadoPago.'}
          </Text>
          {agotado ? (
            <Button
              label="Volver a consultar"
              variant="secondary"
              onPress={volverAConsultar}
              fullWidth
            />
          ) : null}
        </View>
      ) : null}

      {!esperando && sePuedePagar ? (
        <>
          <Text style={styles.aviso}>
            Tenés 15 minutos desde que reservaste para pagarlo: después el horario se libera para
            otro paciente. Los datos de tu tarjeta se cargan en MercadoPago; MediConnect nunca los
            ve.
          </Text>
          {iniciar.isError || errorApertura ? (
            <Text accessibilityRole="alert" style={styles.error}>
              {errorApertura ?? iniciar.error?.message}
            </Text>
          ) : null}
          <Button
            label={resultado === 'RECHAZADO' ? 'Reintentar el pago' : 'Pagar con MercadoPago'}
            variant="accent"
            onPress={pagar}
            loading={iniciar.isPending}
            fullWidth
          />
        </>
      ) : null}

      {!esperando && !sePuedePagar ? (
        <Text accessibilityRole="alert" style={styles.error}>
          Este turno ya no admite un pago.
        </Text>
      ) : null}
    </Screen>
  );
}

function Resultado({
  icono,
  tono,
  titulo,
  children,
}: {
  icono: ComponentProps<typeof Ionicons>['name'];
  tono: 'ok' | 'warning' | 'error';
  titulo: string;
  children: string;
}): React.JSX.Element {
  const fondo =
    tono === 'ok' ? colors.brandDeep : tono === 'warning' ? colors.warmInk : colors.danger;
  return (
    <View style={styles.resultado}>
      <View style={[styles.resultadoIcono, { backgroundColor: fondo }]}>
        <Ionicons name={icono} size={28} color={colors.white} />
      </View>
      <Text accessibilityRole="header" style={styles.resultadoTitulo}>
        {titulo}
      </Text>
      <Text style={styles.resultadoTexto}>{children}</Text>
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
    gap: 2,
  },
  cuando: { fontFamily: fonts.bold, fontSize: fontSize.sm, color: colors.brandDeep },
  nombre: {
    marginTop: spacing.sm,
    fontFamily: fonts.bold,
    fontSize: fontSize.md,
    color: colors.brandDeep,
  },
  detalleTexto: { fontFamily: fonts.medium, fontSize: fontSize.sm, color: colors.muted },
  total: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.lineSoft,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  totalRotulo: { fontFamily: fonts.semibold, fontSize: fontSize.sm, color: colors.muted },
  totalMonto: { fontFamily: fonts.bold, fontSize: fontSize.lg, color: colors.brandDeep },
  aviso: {
    fontFamily: fonts.medium,
    fontSize: fontSize.sm,
    lineHeight: 19,
    color: colors.muted,
  },
  error: { fontFamily: fonts.semibold, fontSize: fontSize.sm, color: colors.danger },
  esperando: {
    gap: spacing.sm,
    backgroundColor: colors.surfaceTeal,
    borderRadius: radius.card,
    padding: spacing.lg,
  },
  esperandoTitulo: { fontFamily: fonts.bold, fontSize: fontSize.md, color: colors.brandDeep },
  esperandoTexto: {
    fontFamily: fonts.medium,
    fontSize: fontSize.sm,
    lineHeight: 19,
    color: colors.ink,
  },
  resultado: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.lg },
  resultadoIcono: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultadoTitulo: {
    fontFamily: fonts.display,
    fontSize: 24,
    lineHeight: 30,
    color: colors.brandDeep,
    textAlign: 'center',
  },
  resultadoTexto: {
    fontFamily: fonts.medium,
    fontSize: fontSize.sm,
    lineHeight: 19,
    color: colors.ink,
    textAlign: 'center',
  },
});
