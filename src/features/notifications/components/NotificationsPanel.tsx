import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { useNow } from '../../../shared/hooks/use-now';
import { colors, fonts, fontSize, radius, spacing } from '../../../shared/ui/theme';
import { iconOf, relativeTime } from '../lib/notifications';
import type { InAppInbox, InAppNotification } from '../types';

interface NotificationsPanelProps {
  visible: boolean;
  /**
   * La campanita en coordenadas de la ventana: dónde termina (el panel baja
   * desde ahí) y su centro (adonde apunta la punta).
   */
  anchor: { top: number; centerX: number };
  inbox: InAppInbox | undefined;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onOpen: (n: InAppNotification) => void;
  onDismiss: () => void;
}

/**
 * El desplegable de la campanita, como el de la web (ENG-69): baja desde la
 * campanita sobre un fondo oscurecido, con la punta señalándola. Tocar afuera
 * o "Volver" del sistema lo cierra.
 *
 * Como `Sheet`, la animación es propia: el fondo aparece con un fundido y el
 * panel crece desde la campanita, los dos a la vez.
 */
export function NotificationsPanel({
  visible,
  anchor,
  inbox,
  loading,
  error,
  onRetry,
  onOpen,
  onDismiss,
}: NotificationsPanelProps): React.JSX.Element {
  const { width, height } = useWindowDimensions();
  const ahora = useNow(60_000);

  // Sigue montado mientras se cierra: si se desmontara apenas `visible` pasa a
  // false, la salida no se vería.
  const [montado, setMontado] = useState(visible);
  const progreso = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setMontado(true);
      Animated.timing(progreso, {
        toValue: 1,
        duration: ENTRADA_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: DRIVER_NATIVO,
      }).start();
    } else {
      Animated.timing(progreso, {
        toValue: 0,
        duration: SALIDA_MS,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: DRIVER_NATIVO,
      }).start(({ finished }) => {
        if (finished) setMontado(false);
      });
    }
  }, [visible, progreso]);

  const avisos = Array.isArray(inbox?.notifications) ? inbox.notifications : [];
  const sinLeer = typeof inbox?.unreadCount === 'number' ? inbox.unreadCount : 0;
  // Centrado, con el mismo margen a los dos lados; la punta sí sigue a la campanita.
  const ancho = Math.min(width - MARGEN * 2, ANCHO_MAX);
  const left = (width - ancho) / 2;
  const top = anchor.top + PUNTA;
  const altoMax = Math.max(240, Math.min(height * ALTO_MAX, height - top - spacing.xl * 2));
  const puntaLeft = Math.min(
    Math.max(anchor.centerX - left - PUNTA, radius.card),
    ancho - radius.card - PUNTA * 2,
  );

  return (
    <Modal visible={montado} transparent animationType="none" onRequestClose={onDismiss}>
      <Animated.View style={[styles.fondo, { opacity: progreso }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cerrar avisos"
          style={styles.fill}
          onPress={onDismiss}
        />
      </Animated.View>

      <Animated.View
        accessibilityViewIsModal
        style={[
          styles.panel,
          { top, left, width: ancho, maxHeight: altoMax },
          {
            opacity: progreso,
            transform: [
              {
                translateY: progreso.interpolate({ inputRange: [0, 1], outputRange: [-10, 0] }),
              },
              { scale: progreso.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) },
            ],
          },
        ]}
      >
        <View style={[styles.punta, { left: puntaLeft }]} />

        <View style={styles.cabecera}>
          <Text accessibilityRole="header" style={styles.titulo}>
            Avisos
          </Text>
          {sinLeer > 0 ? <Text style={styles.contador}>{sinLeer} sin leer</Text> : null}
        </View>

        {loading ? (
          <Text accessibilityRole="text" style={styles.estado}>
            Buscando tus avisos…
          </Text>
        ) : error ? (
          <View style={styles.errorCaja}>
            <Text style={styles.error}>{error}</Text>
            <Pressable accessibilityRole="button" hitSlop={spacing.sm} onPress={onRetry}>
              <Text style={styles.link}>Reintentar</Text>
            </Pressable>
          </View>
        ) : avisos.length === 0 ? (
          <View style={styles.vacio}>
            <Text style={styles.vacioTitulo}>No tenés avisos todavía</Text>
            <Text style={styles.estado}>
              Acá te avisamos cuando se acredita un pago, se acerca un turno o alguien abre tu
              MediPass.
            </Text>
          </View>
        ) : (
          <ScrollView style={styles.lista} bounces={false}>
            {avisos.map((n, i) => {
              const noLeido = n.readAt === null;
              return (
                <Pressable
                  key={n.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${noLeido ? 'Sin leer: ' : ''}${n.title}. ${n.body}`}
                  onPress={() => onOpen(n)}
                  style={({ pressed }) => [
                    styles.fila,
                    noLeido && styles.filaSinLeer,
                    i < avisos.length - 1 && styles.filaBorde,
                    pressed && styles.presionada,
                  ]}
                >
                  <View style={[styles.icono, noLeido && styles.iconoSinLeer]}>
                    <Ionicons
                      name={iconOf(n.type)}
                      size={16}
                      color={noLeido ? colors.white : colors.brandHover}
                    />
                  </View>
                  <View style={styles.flex}>
                    <View style={styles.filaArriba}>
                      <Text style={[styles.avisoTitulo, styles.flex]} numberOfLines={1}>
                        {n.title}
                      </Text>
                      <Text style={styles.hora}>{relativeTime(ahora, n.createdAt)}</Text>
                    </View>
                    <Text style={styles.cuerpo} numberOfLines={3}>
                      {n.body}
                    </Text>
                  </View>
                  {noLeido ? <View style={styles.punto} /> : null}
                </Pressable>
              );
            })}
          </ScrollView>
        )}
      </Animated.View>
    </Modal>
  );
}

const ENTRADA_MS = 200;
const SALIDA_MS = 150;
const ANCHO_MAX = 400;
/** Lo más que ocupa el panel, en fracción del alto de la pantalla. */
const ALTO_MAX = 0.6;
const MARGEN = spacing.md;
/** Lado de la punta que señala la campanita. */
const PUNTA = 8;
/** En la web (tests) el driver nativo no existe y solo dejaría una advertencia. */
const DRIVER_NATIVO = Platform.OS !== 'web';

const styles = StyleSheet.create({
  fill: { flex: 1 },
  flex: { flex: 1 },
  fondo: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: colors.scrim,
  },
  panel: {
    position: 'absolute',
    backgroundColor: colors.white,
    borderRadius: radius.card,
    // La sombra solo se ve en iOS y en la web; en Android la da `elevation`.
    shadowColor: colors.night,
    shadowOpacity: 0.22,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
    transformOrigin: 'top right',
  },
  punta: {
    position: 'absolute',
    top: -PUNTA,
    width: PUNTA * 2,
    height: PUNTA * 2,
    backgroundColor: colors.white,
    transform: [{ rotate: '45deg' }],
    borderRadius: 3,
  },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  titulo: { fontFamily: fonts.display, fontSize: fontSize.lg, color: colors.brandDeep },
  contador: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: colors.surfaceTeal,
  },
  contadorTexto: { fontFamily: fonts.bold, fontSize: fontSize.xs, color: colors.brandHover },
  lista: { borderBottomLeftRadius: radius.card, borderBottomRightRadius: radius.card },
  fila: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
  },
  icono: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceTeal,
  },
  iconoSinLeer: { backgroundColor: colors.brandHover },
  filaSinLeer: { backgroundColor: colors.surfaceTeal },
  filaBorde: { borderBottomWidth: 1, borderBottomColor: colors.lineSoft },
  presionada: { backgroundColor: colors.surfaceTeal },
  filaArriba: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  avisoTitulo: { fontFamily: fonts.bold, fontSize: fontSize.sm + 1, color: colors.brandDeep },
  punto: { width: 8, height: 8, borderRadius: 4, marginTop: 6, backgroundColor: colors.brand },
  cuerpo: {
    marginTop: 2,
    fontFamily: fonts.regular,
    fontSize: fontSize.sm,
    lineHeight: 18,
    color: colors.ink,
  },
  hora: { fontFamily: fonts.medium, fontSize: fontSize.xs, color: colors.mutedSoft },
  estado: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    fontFamily: fonts.medium,
    fontSize: fontSize.sm,
    color: colors.muted,
  },
  vacio: { paddingTop: spacing.md },
  vacioTitulo: {
    paddingHorizontal: spacing.md,
    fontFamily: fonts.bold,
    fontSize: fontSize.md,
    color: colors.brandDeep,
  },
  errorCaja: { gap: spacing.sm, padding: spacing.md },
  error: { fontFamily: fonts.medium, fontSize: fontSize.sm, color: colors.danger },
  link: { fontFamily: fonts.bold, fontSize: fontSize.sm, color: colors.brandHover },
});
