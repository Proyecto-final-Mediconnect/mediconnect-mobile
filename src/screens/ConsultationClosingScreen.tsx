import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ReviewSheet } from '../features/reviews/components/ReviewSheet';
import { StarInput } from '../features/reviews/components/Stars';
import { useMyReviews } from '../features/reviews/hooks/use-reviews';
import type { RootStackParamList } from '../navigation/types';
import { Button } from '../shared/ui/Button';
import { Screen, ScreenHeader } from '../shared/ui/Screen';
import { colors, fonts, fontSize, spacing } from '../shared/ui/theme';

/**
 * Pantalla de cierre al volver de la sala (ENG-190): pide la reseña ahí mismo,
 * mientras la consulta está fresca. Es la misma que muestra la web.
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
  const irATurnos = (): void => navigation.navigate('Paciente', { screen: 'Turnos' });

  return (
    <Screen header={<ScreenHeader title="Consulta terminada" onBack={irATurnos} />}>
      <View style={styles.cuerpo}>
        <Text accessibilityRole="header" style={styles.titulo}>
          Tu consulta con {params.professionalName} terminó
        </Text>

        {mias.isPending ? null : enviada || yaReseno ? (
          <>
            <Text accessibilityRole="alert" style={styles.texto}>
              {enviada
                ? '¡Gracias! Tu reseña se publica cuando la revisemos.'
                : 'Ya dejaste tu reseña de esta consulta. ¡Gracias!'}
            </Text>
            <Button label="Ir a mis turnos" onPress={irATurnos} fullWidth />
          </>
        ) : (
          <>
            <Text style={styles.texto}>
              ¿Cómo te fue? Tu opinión ayuda a otros pacientes a elegir.
            </Text>
            <StarInput value={rating} onChange={setRating} />
            <Button label="Ahora no" variant="secondary" onPress={irATurnos} fullWidth />
          </>
        )}
      </View>

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
  cuerpo: { gap: spacing.lg, paddingTop: spacing.lg },
  titulo: { fontFamily: fonts.bold, fontSize: fontSize.xl, lineHeight: 30, color: colors.ink },
  texto: { fontFamily: fonts.medium, fontSize: fontSize.md, lineHeight: 22, color: colors.muted },
});
