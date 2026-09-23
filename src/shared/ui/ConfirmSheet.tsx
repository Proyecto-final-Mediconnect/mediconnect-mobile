import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from './Button';
import { colors, fonts, fontSize, radius, spacing } from './theme';

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
}: ConfirmSheetProps): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const cerrar = (): void => {
    if (!pending) onDismiss();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={cerrar}>
      <View style={styles.fondo}>
        <Pressable accessibilityLabel="Cerrar" style={StyleSheet.absoluteFill} onPress={cerrar} />
        <View
          accessibilityRole="alert"
          style={[styles.hoja, { paddingBottom: insets.bottom + spacing.xl }]}
        >
          <View style={styles.manija} />
          <Text accessibilityRole="header" style={styles.titulo}>
            {title}
          </Text>
          <Text style={styles.mensaje}>{message}</Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={styles.botones}>
            <Button
              label={confirmLabel}
              variant="danger"
              loading={pending}
              onPress={onConfirm}
              fullWidth
            />
            <Button label={dismissLabel} variant="secondary" onPress={cerrar} fullWidth />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fondo: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(4, 29, 40, 0.45)' },
  hoja: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.card * 2,
    borderTopRightRadius: radius.card * 2,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  manija: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.lineStrong,
    marginBottom: spacing.md,
  },
  titulo: { fontFamily: fonts.display, fontSize: fontSize.xl, color: colors.brandDeep },
  mensaje: { fontFamily: fonts.medium, fontSize: fontSize.md, lineHeight: 22, color: colors.muted },
  error: { fontFamily: fonts.semibold, fontSize: fontSize.sm, color: colors.danger },
  botones: { gap: spacing.sm, marginTop: spacing.lg },
});
