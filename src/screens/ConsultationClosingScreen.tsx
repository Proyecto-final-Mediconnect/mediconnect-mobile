import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ReviewSheet } from '../features/reviews/components/ReviewSheet';
import { StarInput } from '../features/reviews/components/Stars';
import { useMyReviews } from '../features/reviews/hooks/use-reviews';
import type { RootStackParamList } from '../navigation/types';
import { Button } from '../shared/ui/Button';
import { Screen, ScreenHeader } from '../shared/ui/Screen';
import { colors, fonts, fontSize, radius, spacing } from '../shared/ui/theme';

/**
 * Pantalla de cierre al volver de la sala (ENG-190): pide la reseña ahí mismo,
 * mientras la consulta está fresca. El título pregunta y no afirma que la
 * consulta terminó: el paciente puede haber salido antes (review de web #76). Es la misma que muestra la web, con el
 * lenguaje de la app: el círculo y el título de "listo" de la reserva, y la
 * calificación en una tarjeta como la reseña del detalle del turno.
 *
 * Tocar las estrellas abre la hoja de reseña con esa calificación. "Ahora no"
 * lleva a "Turnos" sin guardar nada; el pedido sigue en la tarjeta del inicio.
 */
export function ConsultationClosingScreen(): React.JSX.Element {
  const navigation = useNavigation();
  const { params } = useRoute<RouteProp<RootStackParamList, 'CierreConsulta'>>();
  const mias = useMyReviews();
  const [rating, setRating] = useState(0);
  const [enviada, setEnviada] = useState(false);
  const yaReseno = mias.data?.some((r) => r.appointmentId === params.appointmentId) ?? false;
  const listo = enviada || yaReseno;
  const irATurnos = (): void => navigation.navigate('Paciente', { screen: 'Turnos' });
  const irAlInicio = (): void => navigation.navigate('Paciente', { screen: 'Inicio' });

  return (
    <Screen header={<ScreenHeader title="Consulta terminada" onBack={irATurnos} />}>
      <View style={styles.cabecera}>
        <View style={[styles.icono, listo && styles.iconoListo]}>
          <Ionicons
            name={listo ? 'checkmark' : 'videocam-outline'}
            size={30}
            color={listo ? colors.white : colors.brandHover}
          />
        </View>
        <Text accessibilityRole="header" style={styles.titulo}>
          {listo ? '¡Gracias!' : `¿Cómo te fue en tu consulta con ${params.professionalName}?`}
        </Text>
        <Text style={styles.detalle}>
          {enviada
            ? 'Tu reseña se publica cuando la revisemos.'
            : yaReseno
              ? 'Ya dejaste tu reseña de esta consulta.'
              : 'Tu opinión ayuda a otros pacientes a elegir.'}
        </Text>
      </View>

      {mias.isPending ? null : listo ? (
        <>
          <Button label="Ver mis turnos" variant="secondary" onPress={irATurnos} fullWidth />
          <Button label="Volver al inicio" variant="ghost" onPress={irAlInicio} fullWidth />
        </>
      ) : (
        <>
          <Text style={styles.seccion}>TU CALIFICACIÓN</Text>
          <View style={styles.card}>
            <StarInput value={rating} onChange={setRating} />
            <Text style={styles.ayuda}>Después podés sumar un comentario, si querés.</Text>
          </View>
          <Button label="Ahora no" variant="ghost" onPress={irATurnos} fullWidth />
        </>
      )}

      <ReviewSheet
        visible={rating > 0 && !enviada}
        appointmentId={params.appointmentId}
        professionalName={params.professionalName}
        initialRating={rating}
        onDismiss={() => setRating(0)}
        onSent={() => setEnviada(true)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  cabecera: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl },
  icono: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceTeal,
  },
  iconoListo: { backgroundColor: colors.brandHover },
  titulo: {
    fontFamily: fonts.display,
    fontSize: fontSize.xl,
    lineHeight: 32,
    color: colors.brandDeep,
    textAlign: 'center',
  },
  detalle: {
    fontFamily: fonts.medium,
    fontSize: fontSize.md,
    lineHeight: 22,
    color: colors.muted,
    textAlign: 'center',
  },
  seccion: {
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
    padding: spacing.lg,
  },
  ayuda: { fontFamily: fonts.medium, fontSize: fontSize.sm, color: colors.muted },
});
