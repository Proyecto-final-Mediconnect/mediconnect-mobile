import { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, View } from 'react-native';
import { colors, spacing } from '../../../shared/ui/theme';

const PUNTOS = 3;
/** Desfase entre un punto y el siguiente, como en la web (0, 150 y 300 ms). */
const DESFASE_MS = 150;
const SUBIDA_MS = 300;

/**
 * Los tres puntos de "está escribiendo", en una burbuja como la de los mensajes
 * del otro. Es el mismo indicador que la web, así se ve igual de los dos lados.
 *
 * Con "reducir movimiento" activado los puntos quedan quietos: el anuncio para
 * el lector de pantalla lo hace `useTypingAnnouncement`, no este componente.
 */
export function TypingDots() {
  const valores = useRef(Array.from({ length: PUNTOS }, () => new Animated.Value(0))).current;

  useEffect(() => {
    let animacion: Animated.CompositeAnimation | null = null;
    let cancelado = false;

    void AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((reducir) => {
        if (cancelado || reducir) return;
        animacion = Animated.loop(
          Animated.stagger(
            DESFASE_MS,
            valores.map((v) =>
              Animated.sequence([
                Animated.timing(v, {
                  toValue: 1,
                  duration: SUBIDA_MS,
                  easing: Easing.out(Easing.quad),
                  useNativeDriver: true,
                }),
                Animated.timing(v, {
                  toValue: 0,
                  duration: SUBIDA_MS,
                  easing: Easing.in(Easing.quad),
                  useNativeDriver: true,
                }),
              ]),
            ),
          ),
        );
        animacion.start();
      });

    return () => {
      cancelado = true;
      animacion?.stop();
    };
  }, [valores]);

  return (
    <View
      style={styles.fila}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View style={styles.burbuja} testID="escribiendo">
        {valores.map((v, i) => (
          <Animated.View
            key={i}
            style={[
              styles.punto,
              {
                transform: [
                  { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) },
                ],
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fila: {
    flexDirection: 'row',
    marginTop: spacing.sm,
  },
  burbuja: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
  },
  punto: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.muted,
  },
});
