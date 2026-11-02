import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '../../../shared/ui/theme';
import { formatAverage, ratingSummaryText, reviewsCount } from '../lib/reviews';
import type { RatingSummary } from '../types';

/**
 * "★ 4,7 · 12 reseñas", en una píldora con la forma de `Chip` pero con la
 * estrella en lugar del punto: no es un estado, es la calificación. El lector
 * de pantalla lo lee con palabras ("4,7 de 5, 12 reseñas") y no "estrella".
 */
export function RatingPill({ rating }: { rating: RatingSummary }): React.JSX.Element {
  return (
    <View
      accessible
      accessibilityLabel={`${formatAverage(rating.average)} de 5, ${reviewsCount(rating.count)}`}
      style={styles.pill}
    >
      <Ionicons name="star" size={12} color={colors.warmDot} />
      <Text style={styles.texto}>{ratingSummaryText(rating)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    paddingLeft: 8,
    paddingRight: 10,
    paddingVertical: 4,
    backgroundColor: colors.warm,
  },
  texto: { fontFamily: fonts.semibold, fontSize: 12, color: colors.warmInk },
});
