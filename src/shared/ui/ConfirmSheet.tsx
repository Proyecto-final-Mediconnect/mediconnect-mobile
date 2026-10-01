import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from './Button';
import { colors, fonts, fontSize, radius, spacing } from './theme';

interface ConfirmSheetProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  /** El botón que no hace nada. Dice qué se conserva, no "Cancelar". */
  dismissLabel: string;
  onConfirm: () => void;
  onDismiss: () => void;
  /** Mientras se confirma no se puede cerrar ni volver a tocar. */
  pending?: boolean;
  error?: string | null;
  /** `danger` para lo que no se deshace (cancelar); `primary` para confirmar algo nuevo (reservar). */
  confirmVariant?: 'danger' | 'primary';
}

/**
 * Confirmación desde abajo, para acciones que no se deshacen.
 *
 * Se arma a mano y no con `Alert.alert`: el alerta nativo no se puede probar,
 * no muestra un error si la acción falla, y deja las dos opciones con el mismo
 * peso visual. Acá la destructiva va en rojo y la otra dice qué se conserva
 * ("Mantener el turno"), porque "Cancelar" en un diálogo para cancelar un
 * turno no se sabe qué cancela.
 *
 * La animación es propia y no la del `Modal` (`animationType="slide"`), que
 * subía el fondo oscuro junto con la hoja: la pantalla se oscurecía recién
 * cuando la hoja terminaba de llegar. Acá el fondo aparece con un fundido y la
 * hoja sube encima, las dos a la vez.
 */
export function ConfirmSheet({
  visible,
  title,
  message,
  confirmLabel,
  dismissLabel,
  onConfirm,
  onDismiss,
  pending = false,
  error,
  confirmVariant = 'danger',
}: ConfirmSheetProps): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const cerrar = (): void => {
    if (!pending) onDismiss();
  };

  // Un doble toque confirmaría dos veces: `pending` recién llega en el render
  // siguiente, y los dos toques entran antes. Se traba al primer toque y se
  // destraba cuando la acción termina (o falla y se puede reintentar).
  const confirmado = useRef(false);
  useEffect(() => {
    if (!pending) confirmado.current = false;
  }, [pending, visible]);
  const confirmar = (): void => {
    if (confirmado.current) return;
    confirmado.current = true;
    onConfirm();
  };

  // El `Modal` sigue montado mientras la hoja baja: si se desmontara apenas
  // `visible` pasa a false, la salida no se vería.
  const [montado, setMontado] = useState(visible);
  const progreso = useRef(new Animated.Value(0)).current;
  const [altoHoja, setAltoHoja] = useState(ALTO_INICIAL);

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

  return (
    <Modal visible={montado} transparent animationType="none" onRequestClose={cerrar}>
      <View style={styles.contenedor}>
        <Animated.View style={[styles.fondo, { opacity: progreso }]}>
          <Pressable accessibilityLabel="Cerrar" style={StyleSheet.absoluteFill} onPress={cerrar} />
        </Animated.View>
        <Animated.View
          accessibilityRole="alert"
          onLayout={(e) => setAltoHoja(e.nativeEvent.layout.height)}
          style={[
            styles.hoja,
            { paddingBottom: insets.bottom + spacing.xl },
            {
              transform: [
                {
                  translateY: progreso.interpolate({
                    inputRange: [0, 1],
                    outputRange: [altoHoja, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.manija} />
          <Text accessibilityRole="header" style={styles.titulo}>
            {title}
          </Text>
          <Text style={styles.mensaje}>{message}</Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={styles.botones}>
            <Button
              label={confirmLabel}
              variant={confirmVariant}
              loading={pending}
              onPress={confirmar}
              fullWidth
            />
            <Button label={dismissLabel} variant="secondary" onPress={cerrar} fullWidth />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

/** Rápido al entrar, más rápido al salir: el paciente ya decidió. */
const ENTRADA_MS = 240;
const SALIDA_MS = 180;
/** Hasta medirla, la hoja arranca fuera de la pantalla con un alto razonable. */
const ALTO_INICIAL = 420;
/** En la web (tests) el driver nativo no existe y solo dejaría una advertencia. */
const DRIVER_NATIVO = Platform.OS !== 'web';

const styles = StyleSheet.create({
  contenedor: { flex: 1, justifyContent: 'flex-end' },
  fondo: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(4, 29, 40, 0.45)',
  },
  hoja: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.card * 2,
    borderTopRightRadius: radius.card * 2,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  manija: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.lineStrong,
    marginBottom: spacing.md,
  },
  titulo: { fontFamily: fonts.display, fontSize: fontSize.xl, color: colors.brandDeep },
  mensaje: { fontFamily: fonts.medium, fontSize: fontSize.md, lineHeight: 22, color: colors.muted },
  error: { fontFamily: fonts.semibold, fontSize: fontSize.sm, color: colors.danger },
  botones: { gap: spacing.sm, marginTop: spacing.lg },
});
