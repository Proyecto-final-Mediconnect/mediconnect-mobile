import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from './Button';
import { FilterChip } from './FilterChip';
import { Sheet } from './Sheet';
import { colors, fonts, fontSize, spacing } from './theme';

export interface FilterGroup {
  title: string;
  options: { key: string; label: string; selected: boolean; onPress: () => void }[];
}

interface FilterSheetProps {
  visible: boolean;
  onDismiss: () => void;
  groups: FilterGroup[];
  /** El botón principal: dice qué se va a ver ("Ver 3 profesionales"). */
  resultLabel: string;
  /** Sin filtros puestos no se ofrece limpiar. */
  onClear?: () => void;
}

/**
 * Los filtros de una lista en una hoja desde abajo. Se aplican al tocarlos —la
 * lista de atrás ya se actualiza— y el botón dice cuántos resultados quedan, así
 * se sabe antes de cerrar si el filtro dejó la lista vacía. Los grupos cortos
 * van primero: los largos quedan para hacer scroll.
 */
export function FilterSheet({
  visible,
  onDismiss,
  groups,
  resultLabel,
  onClear,
}: FilterSheetProps): React.JSX.Element {
  return (
    <Sheet visible={visible} title="Filtros" onDismiss={onDismiss}>
      <ScrollView style={styles.cuerpo} contentContainerStyle={styles.cuerpoContenido}>
        {groups.map((g) => (
          <View key={g.title} style={styles.grupo}>
            <Text style={styles.titulo}>{g.title.toUpperCase()}</Text>
            <View style={styles.chips}>
              {g.options.map((o) => (
                <FilterChip key={o.key} label={o.label} selected={o.selected} onPress={o.onPress} />
              ))}
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.botones}>
        <Button label={resultLabel} onPress={onDismiss} fullWidth />
        {onClear ? (
          <Button label="Limpiar filtros" variant="secondary" onPress={onClear} fullWidth />
        ) : null}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  cuerpo: { maxHeight: 380 },
  cuerpoContenido: { gap: spacing.xl, paddingTop: spacing.sm },
  grupo: { gap: spacing.sm },
  titulo: {
    fontFamily: fonts.bold,
    fontSize: fontSize.xs,
    letterSpacing: 1,
    color: colors.mutedSoft,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  botones: { gap: spacing.sm, marginTop: spacing.lg },
});
