import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '../../../shared/ui/Button';
import { Chip } from '../../../shared/ui/Chip';
import { colors, fonts, fontSize, radius, spacing } from '../../../shared/ui/theme';
import { useMyReviews } from '../hooks/use-reviews';
import { STATUS_LABELS, STATUS_TONES } from '../lib/reviews';
import { ReviewSheet } from './ReviewSheet';
import { Stars } from './Stars';

/**
 * La reseña de una consulta que ya se hizo, en el detalle del turno (ENG-80): el
 * botón para dejarla o, si ya la dejó, en qué quedó.
 *
 * Mientras cargan las reseñas no se muestra nada, y si fallan, un aviso con
 * "Reintentar" y no el botón: ofrecer "Dejar una reseña" sin saber si ya la dejó
 * terminaría en un 409.
 */
export function AppointmentReview({
  appointmentId,
  professionalName,
}: {
  appointmentId: string;
  professionalName: string;
}): React.JSX.Element | null {
  const mias = useMyReviews();
  const [abierta, setAbierta] = useState(false);

  if (mias.isPending) return null;
  if (mias.isError) {
    return (
      <>
        <Text style={styles.seccion}>TU RESEÑA</Text>
        <View style={styles.card}>
          <Text accessibilityRole="alert" style={styles.motivo}>
            No pudimos cargar tu reseña.
          </Text>
          <Button
            label={mias.isFetching ? 'Cargando…' : 'Reintentar'}
            variant="ghost"
            disabled={mias.isFetching}
            onPress={() => void mias.refetch()}
            fullWidth
          />
        </View>
      </>
    );
  }
  const resena = mias.data.find((r) => r.appointmentId === appointmentId);

  return (
    <>
      <Text style={styles.seccion}>TU RESEÑA</Text>
      <View style={styles.card}>
        {resena ? (
          <>
            <View style={styles.encabezado}>
              <Stars value={resena.rating} size={20} />
              <Chip label={STATUS_LABELS[resena.status]} tone={STATUS_TONES[resena.status]} />
            </View>
            {resena.comment ? <Text style={styles.comentario}>“{resena.comment}”</Text> : null}
            {resena.status === 'RECHAZADA' && resena.moderationReason ? (
              <Text style={styles.motivo}>Motivo: {resena.moderationReason}</Text>
            ) : null}
          </>
        ) : (
          <>
            <Text style={styles.invitacion}>
              ¿Cómo te fue con {professionalName}? Tu reseña ayuda a otros pacientes a elegir.
            </Text>
            <Button
              label="Dejar una reseña"
              variant="secondary"
              onPress={() => setAbierta(true)}
              fullWidth
            />
          </>
        )}
      </View>

      <ReviewSheet
        visible={abierta}
        appointmentId={appointmentId}
        professionalName={professionalName}
        onDismiss={() => setAbierta(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  seccion: {
    marginTop: spacing.sm,
    marginLeft: spacing.xs,
    fontFamily: fonts.bold,
    fontSize: fontSize.xs,
    letterSpacing: 1,
    color: colors.mutedSoft,
  },
  card: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.card,
    padding: spacing.lg,
    gap: spacing.md,
  },
  encabezado: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  comentario: {
    fontFamily: fonts.regular,
    fontSize: fontSize.md,
    lineHeight: 22,
    color: colors.ink,
  },
  motivo: { fontFamily: fonts.semibold, fontSize: fontSize.sm, color: colors.danger },
  invitacion: {
    fontFamily: fonts.medium,
    fontSize: fontSize.md,
    lineHeight: 22,
    color: colors.muted,
  },
});
