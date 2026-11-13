import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, fontSize, radius, spacing } from '../../../shared/ui/theme';
import { ProfessionalAvatar } from '../../catalog/components/ProfessionalAvatar';
import { useDismissPendingReview, usePendingReviews } from '../hooks/use-reviews';
import type { PendingReview } from '../types';
import { ReviewSheet } from './ReviewSheet';
import { StarInput } from './Stars';

const FECHA = new Intl.DateTimeFormat('es-AR', {
  timeZone: 'America/Argentina/Buenos_Aires',
  day: 'numeric',
  month: 'short',
});

/**
 * "Calificá tu consulta" en el inicio (ENG-190): una tarjeta por turno que falta
 * reseñar, con el mismo lenguaje que el resto del inicio —rótulo de sección,
 * tarjeta blanca, avatar del profesional—. Las estrellas abren la hoja de
 * reseña con esa calificación; la cruz la descarta y no vuelve, tampoco en la
 * web.
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
    <View style={styles.seccion}>
      <Text style={styles.seccionTitulo}>CALIFICÁ TU CONSULTA</Text>
      {lista.map((p) => {
        const nombre = `${p.professional.firstName} ${p.professional.lastName}`;
        return (
          <View key={p.appointmentId} style={styles.card}>
            <View style={styles.fila}>
              <ProfessionalAvatar professional={p.professional} size={44} />
              <View style={styles.textos}>
                <Text style={styles.nombre} numberOfLines={1}>
                  {nombre}
                </Text>
                <Text style={styles.detalle}>
                  ¿Cómo te fue? · {FECHA.format(new Date(p.scheduledAt)).replace('.', '')}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`No calificar la consulta con ${nombre}`}
                hitSlop={spacing.sm}
                disabled={descartar.isPending}
                onPress={() => descartar.mutate(p.appointmentId)}
                style={({ pressed }) => [styles.cerrar, pressed && styles.cerrarPresionado]}
              >
                <Ionicons name="close" size={18} color={colors.mutedSoft} />
              </Pressable>
            </View>
            <View style={styles.estrellas}>
              <StarInput value={0} onChange={(rating) => setAbierta({ review: p, rating })} />
            </View>
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
  seccion: { gap: spacing.sm, marginTop: spacing.sm },
  seccionTitulo: {
    marginLeft: spacing.xs,
    fontFamily: fonts.bold,
    fontSize: fontSize.xs,
    letterSpacing: 1,
    color: colors.mutedSoft,
  },
  card: {
    gap: spacing.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.card,
    padding: spacing.md,
  },
  fila: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  textos: { flex: 1, gap: 2 },
  nombre: { fontFamily: fonts.bold, fontSize: fontSize.md, color: colors.brandDeep },
  detalle: { fontFamily: fonts.medium, fontSize: fontSize.sm, color: colors.muted },
  cerrar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cerrarPresionado: { backgroundColor: colors.surface },
  estrellas: {
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
});
