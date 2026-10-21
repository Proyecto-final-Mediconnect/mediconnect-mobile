import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fonts, fontSize, radius, spacing } from './theme';

interface SheetProps {
  visible: boolean;
  title: string;
  onDismiss: () => void;
  children: ReactNode;
  /** `alert` para las confirmaciones: el lector de pantalla las anuncia. */
  role?: 'alert';
}

/**
 * Hoja que sube desde abajo: la base de `ConfirmSheet` y de los filtros de
 * "Sacar un turno".
 *
 * La animación es propia y no la del `Modal` (`animationType="slide"`), que
 * subía el fondo oscuro junto con la hoja: la pantalla se oscurecía recién
 * cuando la hoja terminaba de llegar. Acá el fondo aparece con un fundido y la
 * hoja sube encima, las dos a la vez.
 */
export function Sheet({
  visible,
  title,
  onDismiss,
  children,
  role,
}: SheetProps): React.JSX.Element {
  const insets = useSafeAreaInsets();

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
    <Modal visible={montado} transparent animationType="none" onRequestClose={onDismiss}>
      <View style={styles.contenedor}>
        <Animated.View style={[styles.fondo, { opacity: progreso }]}>
          <Pressable
            accessibilityLabel="Cerrar"
            style={StyleSheet.absoluteFill}
            onPress={onDismiss}
          />
        </Animated.View>
        <Animated.View
          accessibilityRole={role}
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
          {children}
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
});
