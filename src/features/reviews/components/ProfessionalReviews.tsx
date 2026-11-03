import { StyleSheet, Text, View } from 'react-native';

import { Button } from '../../../shared/ui/Button';
import { colors, fonts, fontSize, radius, spacing } from '../../../shared/ui/theme';
import { useProfessionalReviews } from '../hooks/use-reviews';
import { formatAverage, formatReviewDate, reviewsCount } from '../lib/reviews';
import type { PublicReview } from '../types';
import { Stars } from './Stars';

/**
 * Las reseñas aprobadas en el perfil público (ENG-82), con el promedio arriba.
 * Sin reseñas, el estado vacío se queda: que no haya es información en sí, y
 * explica por qué no cualquiera puede dejar una.
 */
export function ProfessionalReviews({
  professionalId,
}: {
  professionalId: string;
}): React.JSX.Element {
  const resenas = useProfessionalReviews(professionalId);
  const { reviews, rating } = resenas;

  let contenido: React.JSX.Element;
  if (resenas.isPending) {
    contenido = <Text style={styles.nota}>Cargando reseñas…</Text>;
  } else if (resenas.isError && reviews.length === 0) {
    contenido = (
      <Text accessibilityRole="alert" style={styles.error}>
        {resenas.error.message}
      </Text>
    );
  } else if (reviews.length === 0) {
    contenido = (
      <View style={styles.vacio}>
        <Text style={styles.vacioTitulo}>Todavía no tiene reseñas</Text>
        <Text style={styles.nota}>
          Solo puede dejar una reseña quien haya tenido una consulta con este profesional.
        </Text>
      </View>
    );
  } else {
    contenido = (
      <>
        {rating && rating.count > 0 ? (
          <View style={styles.resumen}>
            <Text style={styles.promedio}>{formatAverage(rating.average)}</Text>
            <View style={styles.resumenTextos}>
              <Stars value={rating.average} size={18} />
              <Text style={styles.nota}>{reviewsCount(rating.count)} de pacientes atendidos</Text>
            </View>
          </View>
        ) : null}
        {reviews.map((r, i) => (
          <Resena key={r.id} resena={r} separada={i > 0} />
        ))}
        {/* Si falla "Ver más", que se sepa: si no, parece que no hay más. */}
        {resenas.isError && !resenas.isFetchingNextPage ? (
          <Text accessibilityRole="alert" style={styles.error}>
            No pudimos cargar más reseñas.
          </Text>
        ) : null}
        {resenas.hasNextPage ? (
          <Button
            label={
              resenas.isFetchingNextPage
                ? 'Cargando…'
                : resenas.isError
                  ? 'Reintentar'
                  : 'Ver más reseñas'
            }
            variant="ghost"
            disabled={resenas.isFetchingNextPage}
            onPress={() => void resenas.fetchNextPage()}
            fullWidth
          />
        ) : null}
      </>
    );
  }

  return (
    <View style={styles.seccion}>
      <Text style={styles.seccionTitulo}>Reseñas</Text>
      {contenido}
    </View>
  );
}

/** Una reseña: estrellas, quién, cuándo, qué dijo y, si contestó, el profesional. */
function Resena({
  resena,
  separada,
}: {
  resena: PublicReview;
  /** Una línea arriba la separa de la anterior; la primera ya la tiene el promedio. */
  separada: boolean;
}): React.JSX.Element {
  return (
    <View style={[styles.resena, separada && styles.separada]}>
      <View style={styles.resenaEncabezado}>
        <View style={styles.quien}>
          <Stars value={resena.rating} size={14} />
          <Text style={styles.autor}>{resena.author}</Text>
        </View>
        <Text style={styles.fecha}>{formatReviewDate(resena.createdAt)}</Text>
      </View>
      {resena.comment ? <Text style={styles.comentario}>{resena.comment}</Text> : null}
      {resena.response ? (
        <View style={styles.respuesta}>
          <Text style={styles.respuestaRotulo}>RESPUESTA DEL PROFESIONAL</Text>
          <Text style={styles.respuestaTexto}>{resena.response.content}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // La misma tarjeta que "Sobre mí" y "Formación" en el perfil.
  seccion: {
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.card,
    padding: spacing.lg,
  },
  seccionTitulo: { fontFamily: fonts.display, fontSize: fontSize.lg, color: colors.brandDeep },
  nota: { fontFamily: fonts.medium, fontSize: fontSize.sm, lineHeight: 19, color: colors.muted },
  error: { fontFamily: fonts.semibold, fontSize: fontSize.sm, color: colors.danger },
  vacio: { gap: spacing.xs, paddingVertical: spacing.sm },
  vacioTitulo: { fontFamily: fonts.semibold, fontSize: fontSize.md, color: colors.brandDeep },
  resumen: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.lineSoft,
  },
  promedio: {
    fontFamily: fonts.display,
    fontSize: 40,
    lineHeight: 44,
    color: colors.brandDeep,
  },
  resumenTextos: { flex: 1, gap: spacing.xs },
  resena: { gap: spacing.sm, paddingVertical: spacing.sm },
  separada: { paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.lineSoft },
  resenaEncabezado: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  quien: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  autor: { fontFamily: fonts.semibold, fontSize: fontSize.sm, color: colors.brandDeep },
  fecha: { fontFamily: fonts.medium, fontSize: fontSize.xs, color: colors.mutedSoft },
  comentario: {
    fontFamily: fonts.regular,
    fontSize: fontSize.md,
    lineHeight: 22,
    color: colors.ink,
  },
  respuesta: {
    gap: spacing.xs,
    marginLeft: spacing.md,
    paddingLeft: spacing.md,
    borderLeftWidth: 2,
    borderLeftColor: colors.brand,
  },
  respuestaRotulo: {
    fontFamily: fonts.bold,
    fontSize: fontSize.xs,
    letterSpacing: 1,
    color: colors.brandHover,
  },
  respuestaTexto: {
    fontFamily: fonts.medium,
    fontSize: fontSize.sm,
    lineHeight: 19,
    color: colors.muted,
  },
});
