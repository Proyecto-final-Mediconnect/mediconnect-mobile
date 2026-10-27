import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, fonts, fontSize, radius, spacing } from './theme';

/** Largo máximo de `search` que acepta el backend. */
const MAX_SEARCH_LENGTH = 80;

export interface ActiveFilter {
  key: string;
  label: string;
  onRemove: () => void;
}

interface SearchFilterBarProps {
  search: string;
  onSearch: (texto: string) => void;
  placeholder: string;
  /** Nombre para el lector de pantalla: "Buscar profesional". */
  searchLabel: string;
  onOpenFilters: () => void;
  /** Los filtros puestos: se ven debajo y se sacan con la ✕. */
  active: ActiveFilter[];
}

/**
 * Buscar y filtrar una lista, debajo del encabezado y no adentro: el encabezado
 * dice dónde estás, esta franja es la herramienta. La usan "Mis turnos" y
 * "Sacar un turno", así se manejan igual.
 */
export function SearchFilterBar({
  search,
  onSearch,
  placeholder,
  searchLabel,
  onOpenFilters,
  active,
}: SearchFilterBarProps): React.JSX.Element {
  const cantidad = active.length;

  return (
    <View style={styles.franja}>
      <View style={styles.fila}>
        <View style={styles.buscador}>
          <Ionicons name="search" size={18} color={colors.muted} />
          <TextInput
            accessibilityLabel={searchLabel}
            placeholder={placeholder}
            placeholderTextColor={colors.mutedSoft}
            value={search}
            onChangeText={onSearch}
            autoCorrect={false}
            // El backend rechaza (400) una búsqueda de más de 80 caracteres.
            maxLength={MAX_SEARCH_LENGTH}
            returnKeyType="search"
            style={styles.input}
          />
          {search !== '' ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Borrar la búsqueda"
              hitSlop={spacing.sm}
              onPress={() => onSearch('')}
            >
              <Ionicons name="close-circle" size={18} color={colors.mutedSoft} />
            </Pressable>
          ) : null}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={cantidad > 0 ? `Filtros (${String(cantidad)} activos)` : 'Filtros'}
          onPress={onOpenFilters}
          style={({ pressed }) => [
            styles.boton,
            cantidad > 0 && styles.botonActivo,
            pressed && styles.botonPresionado,
          ]}
        >
          <Ionicons
            name="options-outline"
            size={20}
            color={cantidad > 0 ? colors.white : colors.brandDeep}
          />
          {cantidad > 0 ? (
            <View style={styles.insignia}>
              <Text style={styles.insigniaTexto}>{cantidad}</Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      {cantidad > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.activos}
          style={styles.activosFuera}
        >
          {active.map((f) => (
            <Pressable
              key={f.key}
              accessibilityRole="button"
              accessibilityLabel={`Sacar el filtro ${f.label}`}
              onPress={f.onRemove}
              style={({ pressed }) => [styles.activo, pressed && styles.activoPresionado]}
            >
              <Text style={styles.activoTexto}>{f.label}</Text>
              <Ionicons name="close" size={14} color={colors.brandHover} />
            </Pressable>
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  franja: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xs,
  },
  fila: { flexDirection: 'row', gap: spacing.sm },
  buscador: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    borderRadius: radius.field,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
  },
  input: {
    flex: 1,
    paddingVertical: spacing.sm,
    fontFamily: fonts.medium,
    fontSize: fontSize.md,
    color: colors.ink,
  },
  boton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.field,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
  },
  botonActivo: { backgroundColor: colors.brandDeep, borderColor: colors.brandDeep },
  botonPresionado: { opacity: 0.8 },
  insignia: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
    backgroundColor: colors.brand,
  },
  insigniaTexto: { fontFamily: fonts.bold, fontSize: 11, color: colors.inkDeep },
  activosFuera: { marginHorizontal: -spacing.lg },
  activos: { gap: spacing.sm, paddingHorizontal: spacing.lg },
  activo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 32,
    paddingLeft: spacing.md,
    paddingRight: spacing.sm + 2,
    borderRadius: 16,
    backgroundColor: colors.surfaceTeal,
  },
  activoPresionado: { backgroundColor: colors.line },
  activoTexto: { fontFamily: fonts.semibold, fontSize: fontSize.sm, color: colors.brandHover },
});
