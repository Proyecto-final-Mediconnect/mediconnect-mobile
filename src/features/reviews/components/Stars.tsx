import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, fontSize, spacing } from '../../../shared/ui/theme';
import { ratingLabel } from '../lib/reviews';

const CINCO = [1, 2, 3, 4, 5] as const;

/**
 * Estrellas de solo lectura, en el naranja cálido del theme. Un promedio de 4,6
 * se dibuja como 5: media estrella a 14 px no se distingue de una entera, y el
 * número exacto va al lado cuando importa.
 */
export function Stars({ value, size = 16 }: { value: number; size?: number }): React.JSX.Element {
  const llenas = Math.round(value);
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`${String(llenas)} de 5 estrellas`}
      style={styles.fila}
    >
      {CINCO.map((n) => (
        <Ionicons
          key={n}
          name="star"
          size={size}
          color={n <= llenas ? colors.warmDot : colors.lineStrong}
        />
      ))}
    </View>
  );
}

/**
 * Elegir de 1 a 5 estrellas. Cada una es un radio, así el lector de pantalla
 * dice "3 estrellas, Buena" y cuál está elegida; la etiqueta también se ve al
 * lado, porque el número solo no dice si 3 es bueno o malo.
 */
export function StarInput({
  value,
  onChange,
  disabled = false,
}: {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}): React.JSX.Element {
  return (
    <View style={styles.input}>
      <View accessibilityRole="radiogroup" accessibilityLabel="Calificación" style={styles.fila}>
        {CINCO.map((n) => (
          <Pressable
            key={n}
            accessibilityRole="radio"
            accessibilityLabel={`${String(n)} ${n === 1 ? 'estrella' : 'estrellas'}, ${ratingLabel(n)}`}
            aria-checked={value === n}
            disabled={disabled}
            hitSlop={4}
            onPress={() => onChange(n)}
            style={({ pressed }) => [styles.boton, pressed && styles.presionada]}
          >
            <Ionicons
              name={n <= value ? 'star' : 'star-outline'}
              size={34}
              color={n <= value ? colors.warmDot : colors.lineStrong}
            />
          </Pressable>
        ))}
      </View>
      {value > 0 ? <Text style={styles.etiqueta}>{ratingLabel(value)}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  input: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  boton: { padding: 2 },
  presionada: { transform: [{ scale: 0.9 }] },
  etiqueta: { fontFamily: fonts.semibold, fontSize: fontSize.md, color: colors.warmInk },
});
