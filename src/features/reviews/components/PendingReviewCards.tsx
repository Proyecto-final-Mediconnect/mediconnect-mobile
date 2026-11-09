import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, fontSize, radius, spacing } from '../../../shared/ui/theme';
import { useDismissPendingReview, usePendingReviews } from '../hooks/use-reviews';
import type { PendingReview } from '../types';
import { ReviewSheet } from './ReviewSheet';
import { StarInput } from './Stars';

const FECHA = new Intl.DateTimeFormat('es-AR', {
  timeZone: 'America/Argentina/Buenos_Aires',
  day: 'numeric',
  month: 'long',
});

/**
 * "¿Cómo fue tu consulta con…?" en el inicio (ENG-190), una tarjeta por turno
 * que falta reseñar. Las estrellas abren la hoja de reseña con esa
 * calificación; la cruz la descarta y no vuelve, tampoco en la web.
 *
 * Si la lista no carga no muestra nada: es una invitación, no algo que el
 * paciente esté esperando.
 */
export function PendingReviewCards(): React.JSX.Element | null {
  const pendientes = usePendingReviews();
  const descartar = useDismissPendingReview();
  const [abierta, setAbierta] = useState<{ review: PendingReview; rating: number } | null>(null);

  const lista = pendientes.data ?? [];
  if (lista.length === 0) return null;

  return (
    <View style={styles.lista}>
      {lista.map((p) => {
        const nombre = `${p.professional.firstName} ${p.professional.lastName}`;
        return (
          <View key={p.appointmentId} style={styles.tarjeta}>
            <View style={styles.cabecera}>
              <View style={styles.textos}>
                <Text style={styles.titulo}>¿Cómo fue tu consulta con {nombre}?</Text>
                <Text style={styles.fecha}>{FECHA.format(new Date(p.scheduledAt))}</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`No calificar la consulta con ${nombre}`}
                hitSlop={spacing.sm}
                disabled={descartar.isPending}
                onPress={() => descartar.mutate(p.appointmentId)}
              >
                <Ionicons name="close" size={20} color={colors.muted} />
              </Pressable>
            </View>
            <StarInput value={0} onChange={(rating) => setAbierta({ review: p, rating })} />
          </View>
        );
      })}

      <ReviewSheet
        visible={abierta !== null}
        appointmentId={abierta?.review.appointmentId ?? ''}
        professionalName={
          abierta
            ? `${abierta.review.professional.firstName} ${abierta.review.professional.lastName}`
            : ''
        }
        initialRating={abierta?.rating ?? 0}
        onDismiss={() => setAbierta(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  lista: { gap: spacing.sm },
  tarjeta: {
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.md,
  },
  cabecera: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  textos: { flex: 1, gap: 2 },
  titulo: { fontFamily: fonts.semibold, fontSize: fontSize.md, color: colors.ink },
  fecha: { fontFamily: fonts.medium, fontSize: fontSize.xs, color: colors.muted },
});
