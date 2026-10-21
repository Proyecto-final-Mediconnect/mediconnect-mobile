import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { formatPrice } from '../../appointments/lib/appointments';
import { Button } from '../../../shared/ui/Button';
import { FilterChip } from '../../../shared/ui/FilterChip';
import { Sheet } from '../../../shared/ui/Sheet';
import { colors, fonts, fontSize, spacing } from '../../../shared/ui/theme';
import { PRICE_CAPS } from '../lib/catalog';
import { EMPTY_FILTERS, type CatalogFilters, type Specialty } from '../types';

interface FiltersSheetProps {
  visible: boolean;
  filters: CatalogFilters;
  onChange: (filters: CatalogFilters) => void;
  onDismiss: () => void;
  specialties: Specialty[];
  /** Cuántos profesionales hay con los filtros puestos; `null` mientras carga. */
  total: number | null;
}

/**
 * Los filtros de "Sacar un turno" en una hoja desde abajo. El precio va primero:
 * son cuatro opciones, y las especialidades, muchas, quedan para hacer scroll.
 * Se aplican al
 * tocarlos —la lista de atrás ya se actualiza— y el botón dice cuántos quedan,
 * así se sabe antes de cerrar si el filtro dejó la lista vacía.
 */
export function FiltersSheet({
  visible,
  filters,
  onChange,
  onDismiss,
  specialties,
  total,
}: FiltersSheetProps): React.JSX.Element {
  const hayFiltros = filters.specialtyIds.length > 0 || filters.maxPrice !== null;

  function alternarEspecialidad(id: string): void {
    onChange({
      ...filters,
      specialtyIds: filters.specialtyIds.includes(id)
        ? filters.specialtyIds.filter((x) => x !== id)
        : [...filters.specialtyIds, id],
    });
  }

  function elegirPrecio(tope: number | null): void {
    onChange({ ...filters, maxPrice: tope });
  }

  return (
    <Sheet visible={visible} title="Filtros" onDismiss={onDismiss}>
      <ScrollView style={styles.cuerpo} contentContainerStyle={styles.cuerpoContenido}>
        <View style={styles.grupo}>
          <Text style={styles.titulo}>PRECIO DE LA CONSULTA</Text>
          <View style={styles.chips}>
            <FilterChip
              label="Cualquiera"
              selected={filters.maxPrice === null}
              onPress={() => elegirPrecio(null)}
            />
            {PRICE_CAPS.map((tope) => (
              <FilterChip
                key={tope}
                label={`Hasta ${formatPrice(tope)}`}
                selected={filters.maxPrice === tope}
                onPress={() => elegirPrecio(tope)}
              />
            ))}
          </View>
        </View>
        {specialties.length > 0 ? (
          <View style={styles.grupo}>
            <Text style={styles.titulo}>ESPECIALIDAD</Text>
            <View style={styles.chips}>
              {specialties.map((e) => (
                <FilterChip
                  key={e.id}
                  label={e.name}
                  selected={filters.specialtyIds.includes(e.id)}
                  onPress={() => alternarEspecialidad(e.id)}
                />
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.botones}>
        <Button label={verLabel(total)} onPress={onDismiss} fullWidth />
        {hayFiltros ? (
          <Button
            label="Limpiar filtros"
            variant="secondary"
            onPress={() => onChange(EMPTY_FILTERS)}
            fullWidth
          />
        ) : null}
      </View>
    </Sheet>
  );
}

function verLabel(total: number | null): string {
  if (total === null) return 'Ver profesionales';
  if (total === 0) return 'No hay profesionales';
  return total === 1 ? 'Ver 1 profesional' : `Ver ${String(total)} profesionales`;
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
