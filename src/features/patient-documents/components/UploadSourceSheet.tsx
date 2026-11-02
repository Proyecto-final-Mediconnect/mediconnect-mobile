import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Sheet } from '../../../shared/ui/Sheet';
import { colors, fonts, fontSize, spacing } from '../../../shared/ui/theme';
import type { PickSource } from '../lib/pick-file';

const OPCIONES: {
  source: PickSource;
  icon: ComponentProps<typeof Ionicons>['name'];
  title: string;
  caption: string;
}[] = [
  {
    source: 'camera',
    icon: 'camera-outline',
    title: 'Sacar una foto',
    caption: 'Para un estudio o una receta en papel',
  },
  {
    source: 'gallery',
    icon: 'images-outline',
    title: 'Elegir de la galería',
    caption: 'Una foto que ya tenés en el teléfono',
  },
  {
    source: 'pdf',
    icon: 'document-attach-outline',
    title: 'Elegir un PDF',
    caption: 'El que te mandó el laboratorio o la clínica',
  },
];

/**
 * De dónde sale el documento (ENG-164): cámara, galería o PDF. Es la hoja que
 * abre "Subir documento" en la historia clínica, el equivalente del diálogo de
 * la web; el formulario viene después, en su propia pantalla modal.
 */
export function UploadSourceSheet({
  visible,
  onDismiss,
  onPick,
}: {
  visible: boolean;
  onDismiss: () => void;
  onPick: (source: PickSource) => void;
}): React.JSX.Element {
  return (
    <Sheet visible={visible} title="Subir un documento" onDismiss={onDismiss}>
      <Text style={styles.bajada}>
        Un estudio, informe o receta que traés de otro lugar. Lo ven los profesionales que te
        atienden.
      </Text>
      <View accessibilityLabel="Cómo querés subirlo">
        {OPCIONES.map((opcion, i) => (
          <Pressable
            key={opcion.source}
            accessibilityRole="button"
            accessibilityLabel={opcion.title}
            accessibilityHint={opcion.caption}
            onPress={() => onPick(opcion.source)}
            style={({ pressed }) => [
              styles.opcion,
              i < OPCIONES.length - 1 && styles.opcionBorde,
              pressed && styles.presionada,
            ]}
          >
            <View style={styles.icono}>
              <Ionicons name={opcion.icon} size={20} color={colors.brandHover} />
            </View>
            <View style={styles.textos}>
              <Text style={styles.titulo}>{opcion.title}</Text>
              <Text style={styles.detalle}>{opcion.caption}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.mutedSoft} />
          </Pressable>
        ))}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  bajada: {
    fontFamily: fonts.medium,
    fontSize: fontSize.sm,
    lineHeight: 19,
    color: colors.muted,
    marginBottom: spacing.sm,
  },
  opcion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  opcionBorde: { borderBottomWidth: 1, borderBottomColor: colors.lineSoft },
  presionada: { opacity: 0.6 },
  icono: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceTeal,
  },
  textos: { flex: 1, gap: 2 },
  titulo: { fontFamily: fonts.bold, fontSize: fontSize.md, color: colors.brandDeep },
  detalle: { fontFamily: fonts.medium, fontSize: fontSize.sm, color: colors.muted },
});
