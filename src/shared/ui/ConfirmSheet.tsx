import { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from './Button';
import { Sheet } from './Sheet';
import { colors, fonts, fontSize, spacing } from './theme';

interface ConfirmSheetProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  /** El botón que no hace nada. Dice qué se conserva, no "Cancelar". */
  dismissLabel: string;
  onConfirm: () => void;
  onDismiss: () => void;
  /** Mientras se confirma no se puede cerrar ni volver a tocar. */
  pending?: boolean;
  error?: string | null;
  /** `danger` para lo que no se deshace (cancelar); `primary` para confirmar algo nuevo (reservar). */
  confirmVariant?: 'danger' | 'primary';
}

/**
 * Confirmación desde abajo, para acciones que no se deshacen.
 *
 * Se arma a mano y no con `Alert.alert`: el alerta nativo no se puede probar,
 * no muestra un error si la acción falla, y deja las dos opciones con el mismo
 * peso visual. Acá la destructiva va en rojo y la otra dice qué se conserva
 * ("Mantener el turno"), porque "Cancelar" en un diálogo para cancelar un
 * turno no se sabe qué cancela.
 */
export function ConfirmSheet({
  visible,
  title,
  message,
  confirmLabel,
  dismissLabel,
  onConfirm,
  onDismiss,
  pending = false,
  error,
  confirmVariant = 'danger',
}: ConfirmSheetProps): React.JSX.Element {
  const cerrar = (): void => {
    if (!pending) onDismiss();
  };

  // Un doble toque confirmaría dos veces: `pending` recién llega en el render
  // siguiente, y los dos toques entran antes. Se traba al primer toque y se
  // destraba cuando la acción termina (o falla y se puede reintentar).
  const confirmado = useRef(false);
  useEffect(() => {
    if (!pending) confirmado.current = false;
  }, [pending, visible]);
  const confirmar = (): void => {
    if (confirmado.current) return;
    confirmado.current = true;
    onConfirm();
  };

  return (
    <Sheet visible={visible} title={title} onDismiss={cerrar} role="alert">
      <Text style={styles.mensaje}>{message}</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.botones}>
        <Button
          label={confirmLabel}
          variant={confirmVariant}
          loading={pending}
          onPress={confirmar}
          fullWidth
        />
        <Button label={dismissLabel} variant="secondary" onPress={cerrar} fullWidth />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  mensaje: { fontFamily: fonts.medium, fontSize: fontSize.md, lineHeight: 22, color: colors.muted },
  error: { fontFamily: fonts.semibold, fontSize: fontSize.sm, color: colors.danger },
  botones: { gap: spacing.sm, marginTop: spacing.lg },
});
