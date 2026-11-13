import { useEffect, useRef, useState } from 'react';
import { Animated, Platform, StyleSheet, Text, View } from 'react-native';

import { useKeyboardHeight } from '../../../shared/hooks/use-keyboard-height';
import { Button } from '../../../shared/ui/Button';
import { Sheet } from '../../../shared/ui/Sheet';
import { TextField } from '../../../shared/ui/TextField';
import { colors, fonts, fontSize, spacing } from '../../../shared/ui/theme';
import { useCreateReview } from '../hooks/use-reviews';
import { MAX_COMMENT } from '../lib/reviews';
import { StarInput } from './Stars';

interface ReviewSheetProps {
  visible: boolean;
  appointmentId: string;
  professionalName: string;
  onDismiss: () => void;
  /** Las estrellas que ya tocó en la tarjeta del inicio o en el cierre (ENG-190). */
  initialRating?: number;
  /** Si se pasa, se llama al enviar bien en lugar de `onDismiss`. */
  onSent?: () => void;
}

/**
 * Dejar la reseña de una consulta (ENG-80): las estrellas y, si quiere, un
 * comentario. Se publica recién cuando la aprueba un moderador, y la hoja lo
 * dice antes de mandar, no después: que no aparezca enseguida no es un error.
 */
export function ReviewSheet({
  visible,
  appointmentId,
  professionalName,
  onDismiss,
  initialRating = 0,
  onSent,
}: ReviewSheetProps): React.JSX.Element {
  const crear = useCreateReview(appointmentId);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [falta, setFalta] = useState(false);
  const { margen } = useKeyboardHeight();

  // Cada vez que se abre arranca en blanco: lo que quedó de una vez anterior
  // que se cerró sin mandar no es lo que el paciente quiere decir ahora.
  useEffect(() => {
    if (!visible) return;
    setRating(initialRating);
    setComment('');
    setFalta(false);
    crear.reset();
    // `crear` cambia en cada render; solo importa la apertura.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Un doble toque mandaría dos veces y el segundo volvería con 409: se traba
  // al primer toque, como en `ConfirmSheet`.
  const enviando = useRef(false);
  useEffect(() => {
    if (!crear.isPending) enviando.current = false;
  }, [crear.isPending]);

  const cerrar = (): void => {
    if (!crear.isPending) onDismiss();
  };

  const enviar = (): void => {
    if (!rating) {
      setFalta(true);
      return;
    }
    if (enviando.current) return;
    enviando.current = true;
    crear.mutate({ rating, comment }, { onSuccess: onSent ?? onDismiss });
  };

  return (
    <Sheet visible={visible} title="Dejar una reseña" onDismiss={cerrar}>
      {/* En iOS el teclado tapa la hoja: el margen la sube junto con él. En
          Android el `Modal` ya achica la ventana (adjustResize) y sumarlo la
          subiría dos veces. */}
      <Animated.View style={[styles.cuerpo, Platform.OS === 'ios' && { marginBottom: margen }]}>
        <Text style={styles.sobre}>Sobre tu consulta con {professionalName}.</Text>

        <View style={styles.estrellas}>
          <StarInput
            value={rating}
            onChange={(v) => {
              setRating(v);
              setFalta(false);
            }}
            disabled={crear.isPending}
          />
          {falta ? (
            <Text accessibilityRole="alert" style={styles.error}>
              Elegí de 1 a 5 estrellas.
            </Text>
          ) : null}
        </View>

        <View style={styles.comentario}>
          <TextField
            label="Comentario (opcional)"
            value={comment}
            onChangeText={setComment}
            maxLength={MAX_COMMENT}
            multiline
            placeholder={`¿Cómo fue la consulta con ${professionalName}?`}
            editable={!crear.isPending}
          />
          <Text style={styles.contador}>
            {String(comment.length)}/{String(MAX_COMMENT)}
          </Text>
        </View>

        <Text style={styles.aclaracion}>
          Se publica en su perfil cuando la revise un moderador. Va con tu nombre y la inicial de tu
          apellido.
        </Text>

        {crear.isError ? (
          <Text accessibilityRole="alert" style={styles.error}>
            {crear.error.message}
          </Text>
        ) : null}

        <View style={styles.botones}>
          <Button
            label={crear.isPending ? 'Enviando…' : 'Enviar reseña'}
            disabled={crear.isPending}
            onPress={enviar}
            fullWidth
          />
          <Button label="Ahora no" variant="secondary" onPress={cerrar} fullWidth />
        </View>
      </Animated.View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  cuerpo: { gap: spacing.lg },
  sobre: { fontFamily: fonts.medium, fontSize: fontSize.md, lineHeight: 22, color: colors.muted },
  estrellas: { gap: spacing.sm },
  comentario: { gap: spacing.xs },
  contador: {
    alignSelf: 'flex-end',
    fontFamily: fonts.medium,
    fontSize: fontSize.xs,
    color: colors.mutedSoft,
  },
  aclaracion: {
    fontFamily: fonts.medium,
    fontSize: fontSize.sm,
    lineHeight: 19,
    color: colors.muted,
  },
  error: { fontFamily: fonts.semibold, fontSize: fontSize.sm, color: colors.danger },
  botones: { gap: spacing.sm, marginTop: spacing.xs },
});
