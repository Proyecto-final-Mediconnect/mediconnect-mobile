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
import { PaymentReceiptCard } from '../features/payments/components/PaymentReceiptCard';
import { canPay, paymentOutcomeOf, type PaymentOutcome } from '../features/payments/lib/payment';
import { formatRestante, restanteParaPagar } from '../features/payments/lib/receipt';
import { DeviceCheckButton } from '../features/video/components/DeviceCheckButton';
import { useNow } from '../shared/hooks/use-now';
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
 *
 * Mientras el paciente paga, la pantalla espera en una tarjeta oscura con el
 * tiempo que le queda; al acreditarse muestra el comprobante (ENG-199), como la
 * web.
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
  // El link abierto, para volver a abrirlo si el paciente cerró MercadoPago sin pagar.
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const ahora = useNow(1_000);

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
        setCheckoutUrl(link.checkoutUrl);
        abrir(link.checkoutUrl);
      },
    });
  }

  function abrir(url: string): void {
    setFase('checkout');
    openCheckout(url)
      .then((cerrado) => {
        if (cerrado) setFase('volvio');
      })
      .catch(() => {
        setFase('inicio');
        setErrorApertura('No pudimos abrir MercadoPago. Probá de nuevo.');
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
    const receipt = estado.data?.receipt ?? null;
    return (
      <Screen header={header}>
        <View style={styles.hero}>
          <View style={styles.heroEyebrow}>
            <View style={styles.heroCheck}>
              <Ionicons name="checkmark" size={18} color={colors.inkDeep} />
            </View>
            <Text style={styles.heroEyebrowTexto}>
              {receipt ? 'PAGO ACREDITADO' : 'TURNO CONFIRMADO'}
            </Text>
          </View>
          <Text accessibilityRole="header" style={styles.heroTitulo}>
            Tu turno está confirmado.
          </Text>
          <Text style={styles.heroTexto}>
            {receipt ? `Recibimos tu pago de ${formatPrice(receipt.amount)}. ` : ''}
            {professionalName(turno)} te espera el {formatShortDay(turno.date, turno.startTime)}.
          </Text>
        </View>

        {receipt ? (
          <PaymentReceiptCard receipt={receipt} confirmedAt={estado.data?.confirmedAt} />
        ) : null}

        <Text style={styles.seccion}>QUÉ SIGUE</Text>
        <View style={styles.sigue}>
          <Sigue icono="videocam-outline" titulo="La sala se abre antes">
            Podés entrar a la videoconsulta 10 minutos antes, desde el turno.
          </Sigue>
          <Sigue icono="mic-outline" titulo="Probá cámara y micrófono">
            Hacelo antes del día, así no perdés tiempo de la consulta.
          </Sigue>
          <DeviceCheckButton />
          <Sigue icono="calendar-clear-outline" titulo="Si no podés ir">
            Cancelalo o reprogramalo desde el turno. Lo que se devuelve depende de la anticipación.
          </Sigue>
        </View>

        <Button
          label="Ver mi turno"
          variant="accent"
          onPress={() => navigation.navigate('Turno', { appointmentId: turno.id })}
          fullWidth
        />
        <Button
          label="Ir a Mis turnos"
          variant="secondary"
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
  const restante = restanteParaPagar(turno.createdAt, ahora);

  return (
    <Screen header={header}>
      {detalle}

      {resultado === 'RECHAZADO' ? (
        <Resultado icono="close" tono="error" titulo="MercadoPago rechazó el pago">
          Tu turno sigue reservado. Podés intentar de nuevo con otro medio de pago.
        </Resultado>
      ) : null}

      {esperando ? (
        <View accessibilityRole="summary" style={styles.espera}>
          <View style={styles.heroEyebrow}>
            <View style={styles.punto} />
            <Text style={styles.heroEyebrowTexto}>
              {agotado ? 'TODAVÍA SIN CONFIRMAR' : 'ESPERANDO EL PAGO'}
            </Text>
          </View>
          <Text accessibilityRole="header" style={styles.esperaTitulo}>
            {fase === 'checkout'
              ? 'Completá el pago en MercadoPago.'
              : agotado
                ? 'Todavía no nos llegó la confirmación.'
                : 'Consultando tu pago…'}
          </Text>
          <Text style={styles.heroTexto}>
            {agotado
              ? estadoPrevio === 'RECHAZADO'
                ? 'Puede que MercadoPago haya rechazado el pago de nuevo, o que todavía esté en camino. Si se confirma, lo vas a ver en Mis turnos.'
                : 'Puede tardar unos minutos. El turno se confirma solo y lo vas a ver en Mis turnos.'
              : `Apenas MercadoPago nos avise que se acreditó ${formatPrice(turno.price)}, esta pantalla pasa sola a la confirmación.`}
          </Text>
          {restante !== null && !agotado ? (
            <Text style={styles.restante}>
              {restante > 0
                ? `Te quedan ${formatRestante(restante)} para pagar antes de que se libere el horario.`
                : 'Se terminó el tiempo para pagar: si no llegaste, el horario se libera en breve.'}
            </Text>
          ) : null}
          {agotado ? (
            <Button
              label="Volver a consultar"
              variant="accent"
              onPress={volverAConsultar}
              fullWidth
            />
          ) : checkoutUrl ? (
            <Button
              label="Volver a abrir MercadoPago"
              variant="accent"
              onPress={() => abrir(checkoutUrl)}
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

function Sigue({
  icono,
  titulo,
  children,
}: {
  icono: ComponentProps<typeof Ionicons>['name'];
  titulo: string;
  children: string;
}): React.JSX.Element {
  return (
    <View style={styles.sigueFila}>
      <View style={styles.sigueIcono}>
        <Ionicons name={icono} size={18} color={colors.brandHover} />
      </View>
      <View style={styles.sigueTextos}>
        <Text style={styles.sigueTitulo}>{titulo}</Text>
        <Text style={styles.sigueTexto}>{children}</Text>
      </View>
    </View>
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
  hero: {
    gap: spacing.md,
    backgroundColor: colors.night,
    borderRadius: radius.card,
    padding: spacing.xl,
  },
  espera: {
    gap: spacing.md,
    backgroundColor: colors.night,
    borderRadius: radius.card,
    padding: spacing.xl,
  },
  heroEyebrow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  heroCheck: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brand,
  },
  punto: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.brandBright },
  heroEyebrowTexto: {
    fontFamily: fonts.bold,
    fontSize: 10,
    letterSpacing: 1.6,
    color: colors.brandBright,
  },
  heroTitulo: {
    fontFamily: fonts.display,
    fontSize: fontSize.xxl,
    lineHeight: 34,
    color: colors.white,
  },
  esperaTitulo: {
    fontFamily: fonts.display,
    fontSize: fontSize.xl,
    lineHeight: 31,
    color: colors.white,
  },
  heroTexto: {
    fontFamily: fonts.medium,
    fontSize: fontSize.sm,
    lineHeight: 20,
    color: colors.onNight,
  },
  restante: { fontFamily: fonts.semibold, fontSize: fontSize.sm, color: colors.white },
  seccion: {
    marginLeft: spacing.xs,
    marginTop: spacing.xs,
    fontFamily: fonts.bold,
    fontSize: fontSize.xs,
    letterSpacing: 1,
    color: colors.mutedSoft,
  },
  sigue: {
    gap: spacing.lg,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.card,
    padding: spacing.lg,
  },
  sigueFila: { flexDirection: 'row', gap: spacing.md },
  sigueIcono: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceTeal,
  },
  sigueTextos: { flex: 1, gap: 2 },
  sigueTitulo: { fontFamily: fonts.bold, fontSize: fontSize.sm, color: colors.brandDeep },
  sigueTexto: {
    fontFamily: fonts.medium,
    fontSize: fontSize.sm,
    lineHeight: 19,
    color: colors.muted,
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
