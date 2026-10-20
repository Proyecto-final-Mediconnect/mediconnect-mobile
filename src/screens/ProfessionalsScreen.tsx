import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { ProfessionalRow } from '../features/catalog/components/ProfessionalRow';
import { useProfessionalsCatalog, useSpecialties } from '../features/catalog/hooks/use-catalog';
import { matchesSearch, PRICE_CAPS } from '../features/catalog/lib/catalog';
import { EMPTY_FILTERS, type CatalogFilters } from '../features/catalog/types';
import { formatPrice } from '../features/appointments/lib/appointments';
import { FilterChip } from '../shared/ui/FilterChip';
import { Screen, ScreenHeader } from '../shared/ui/Screen';
import { EmptyState, ErrorState, LoadingState } from '../shared/ui/StatusViews';
import { colors, fonts, fontSize, radius, spacing } from '../shared/ui/theme';

/**
 * Sacar un turno, paso 1: buscar al profesional (ENG-132). Equivalente mobile
 * del catálogo de la web (ENG-49). Es la tab central, "Reservar".
 *
 * La especialidad y el tope de precio los filtra el backend; el buscador filtra
 * por nombre o especialidad del lado de la app, como en la web, porque el backend
 * todavía no busca por nombre. Para que encuentre a alguien de la página 3, con
 * texto en el buscador se traen todas las páginas: si no, el filtro solo veía
 * las cargadas, la lista quedaba corta y el scroll infinito no pedía más.
 */
export function ProfessionalsScreen(): React.JSX.Element {
  const navigation = useNavigation();
  const [busqueda, setBusqueda] = useState('');
  const [filtros, setFiltros] = useState<CatalogFilters>(EMPTY_FILTERS);
  const catalogo = useProfessionalsCatalog(filtros);
  const especialidades = useSpecialties();

  const buscando = busqueda.trim() !== '';
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = catalogo;

  useEffect(() => {
    if (buscando && hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [buscando, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const visibles = catalogo.professionals.filter((p) => matchesSearch(p, busqueda));
  // Mientras se traen las páginas que faltan, "no hay resultados" todavía no es cierto.
  const completandoBusqueda = buscando && (hasNextPage ?? false);
  const hayFiltros =
    busqueda.trim() !== '' || filtros.specialtyIds.length > 0 || filtros.maxPrice !== null;

  function alternarEspecialidad(id: string): void {
    setFiltros((f) => ({
      ...f,
      specialtyIds: f.specialtyIds.includes(id)
        ? f.specialtyIds.filter((x) => x !== id)
        : [...f.specialtyIds, id],
    }));
  }

  function limpiar(): void {
    setBusqueda('');
    setFiltros(EMPTY_FILTERS);
  }

  const header = (
    <ScreenHeader title="Sacar un turno" subtitle="Elegí con quién atenderte.">
      <View style={styles.buscador}>
        <Ionicons name="search" size={18} color={colors.muted} />
        <TextInput
          accessibilityLabel="Buscar profesional"
          placeholder="Nombre o especialidad"
          placeholderTextColor={colors.mutedSoft}
          value={busqueda}
          onChangeText={setBusqueda}
          autoCorrect={false}
          returnKeyType="search"
          style={styles.input}
        />
      </View>
    </ScreenHeader>
  );

  const filtrosVista = (
    <View style={styles.filtros}>
      {especialidades.data && especialidades.data.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.fila}
        >
          {especialidades.data.map((e) => (
            <FilterChip
              key={e.id}
              label={e.name}
              selected={filtros.specialtyIds.includes(e.id)}
              onPress={() => alternarEspecialidad(e.id)}
            />
          ))}
        </ScrollView>
      ) : null}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.fila}
      >
        <FilterChip
          label="Cualquier precio"
          selected={filtros.maxPrice === null}
          onPress={() => setFiltros((f) => ({ ...f, maxPrice: null }))}
        />
        {PRICE_CAPS.map((tope) => (
          <FilterChip
            key={tope}
            label={`Hasta ${formatPrice(tope)}`}
            selected={filtros.maxPrice === tope}
            onPress={() => setFiltros((f) => ({ ...f, maxPrice: tope }))}
          />
        ))}
      </ScrollView>
    </View>
  );

  if (catalogo.isPending) {
    return (
      <Screen scroll={false} header={header}>
        <LoadingState label="Buscando profesionales…" />
      </Screen>
    );
  }

  if (catalogo.isError) {
    return (
      <Screen scroll={false} header={header}>
        <ErrorState message={catalogo.error.message} onRetry={() => void catalogo.refetch()} />
      </Screen>
    );
  }

  return (
    <Screen scroll={false} padded={false} header={header}>
      <FlatList
        testID="lista-profesionales"
        data={visibles}
        keyExtractor={(p) => p.id}
        renderItem={({ item }) => (
          <ProfessionalRow
            professional={item}
            onPress={() => navigation.navigate('Profesional', { id: item.id })}
          />
        )}
        ListHeaderComponent={filtrosVista}
        contentContainerStyle={styles.lista}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (catalogo.hasNextPage && !catalogo.isFetchingNextPage) void catalogo.fetchNextPage();
        }}
        ListFooterComponent={
          catalogo.isFetchingNextPage || completandoBusqueda ? (
            <ActivityIndicator color={colors.brand} style={styles.masCarga} />
          ) : null
        }
        refreshControl={
          <RefreshControl
            refreshing={catalogo.isRefetching && !catalogo.isFetchingNextPage}
            onRefresh={() => void catalogo.refetch()}
            tintColor={colors.brand}
            colors={[colors.brand]}
          />
        }
        ListEmptyComponent={
          completandoBusqueda ? null : (
            <EmptyState
              icon="search-outline"
              title="No hay profesionales con esos filtros"
              description="Probá con otra especialidad u otro precio."
              action={hayFiltros ? { label: 'Limpiar filtros', onPress: limpiar } : undefined}
            />
          )
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  buscador: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    borderRadius: radius.field,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    backgroundColor: colors.white,
  },
  input: {
    flex: 1,
    paddingVertical: spacing.sm,
    fontFamily: fonts.medium,
    fontSize: fontSize.md,
    color: colors.ink,
  },
  filtros: { gap: spacing.sm, marginBottom: spacing.sm },
  fila: { gap: spacing.sm, paddingRight: spacing.lg },
  lista: { flexGrow: 1, padding: spacing.lg, gap: spacing.md },
  masCarga: { paddingVertical: spacing.lg },
});
