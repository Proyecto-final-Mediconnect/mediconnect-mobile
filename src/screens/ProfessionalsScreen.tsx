import { useNavigation } from '@react-navigation/native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet } from 'react-native';

import { ProfessionalRow } from '../features/catalog/components/ProfessionalRow';
import { useProfessionalsCatalog, useSpecialties } from '../features/catalog/hooks/use-catalog';
import { matchesSearch, PRICE_CAPS } from '../features/catalog/lib/catalog';
import { EMPTY_FILTERS, type CatalogFilters } from '../features/catalog/types';
import { formatPrice } from '../features/appointments/lib/appointments';
import { FilterSheet } from '../shared/ui/FilterSheet';
import { Screen, ScreenHeader } from '../shared/ui/Screen';
import { SearchFilterBar, type ActiveFilter } from '../shared/ui/SearchFilterBar';
import { EmptyState, ErrorState, LoadingState } from '../shared/ui/StatusViews';
import { colors, spacing } from '../shared/ui/theme';

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

  const [verFiltros, setVerFiltros] = useState(false);
  const cantidadFiltros = filtros.specialtyIds.length + (filtros.maxPrice === null ? 0 : 1);
  function alternarEspecialidad(id: string): void {
    setFiltros((f) => ({
      ...f,
      specialtyIds: f.specialtyIds.includes(id)
        ? f.specialtyIds.filter((x) => x !== id)
        : [...f.specialtyIds, id],
    }));
  }
  const nombreDe = (id: string): string =>
    especialidades.data?.find((e) => e.id === id)?.name ?? 'Especialidad';

  function limpiar(): void {
    setBusqueda('');
    setFiltros(EMPTY_FILTERS);
  }

  const header = <ScreenHeader title="Sacar un turno" subtitle="Elegí con quién atenderte." />;

  const activos: ActiveFilter[] = [
    ...filtros.specialtyIds.map((id) => ({
      key: id,
      label: nombreDe(id),
      onRemove: () =>
        setFiltros((f) => ({ ...f, specialtyIds: f.specialtyIds.filter((x) => x !== id) })),
    })),
    ...(filtros.maxPrice !== null
      ? [
          {
            key: 'precio',
            label: `Hasta ${formatPrice(filtros.maxPrice)}`,
            onRemove: () => setFiltros((f) => ({ ...f, maxPrice: null })),
          },
        ]
      : []),
  ];

  const barra = (
    <SearchFilterBar
      search={busqueda}
      onSearch={setBusqueda}
      placeholder="Nombre o especialidad"
      searchLabel="Buscar profesional"
      onOpenFilters={() => setVerFiltros(true)}
      active={activos}
    />
  );

  const total = catalogo.isFetching && !catalogo.isFetchingNextPage ? null : catalogo.total;
  const hoja = (
    <FilterSheet
      visible={verFiltros}
      onDismiss={() => setVerFiltros(false)}
      groups={[
        {
          title: 'Precio de la consulta',
          options: [
            {
              key: 'cualquiera',
              label: 'Cualquiera',
              selected: filtros.maxPrice === null,
              onPress: () => setFiltros((f) => ({ ...f, maxPrice: null })),
            },
            ...PRICE_CAPS.map((tope) => ({
              key: String(tope),
              label: `Hasta ${formatPrice(tope)}`,
              selected: filtros.maxPrice === tope,
              onPress: () => setFiltros((f) => ({ ...f, maxPrice: tope })),
            })),
          ],
        },
        {
          title: 'Especialidad',
          options: (especialidades.data ?? []).map((e) => ({
            key: e.id,
            label: e.name,
            selected: filtros.specialtyIds.includes(e.id),
            onPress: () => alternarEspecialidad(e.id),
          })),
        },
      ]}
      resultLabel={verProfesionales(total)}
      onClear={cantidadFiltros > 0 ? () => setFiltros(EMPTY_FILTERS) : undefined}
    />
  );

  if (catalogo.isPending) {
    return (
      <Screen scroll={false} padded={false} header={header}>
        {barra}
        <LoadingState label="Buscando profesionales…" />
        {hoja}
      </Screen>
    );
  }

  if (catalogo.isError) {
    return (
      <Screen scroll={false} padded={false} header={header}>
        {barra}
        <ErrorState message={catalogo.error.message} onRetry={() => void catalogo.refetch()} />
        {hoja}
      </Screen>
    );
  }

  return (
    <Screen scroll={false} padded={false} header={header}>
      {barra}
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
      {hoja}
    </Screen>
  );
}

function verProfesionales(total: number | null): string {
  if (total === null) return 'Ver profesionales';
  if (total === 0) return 'No hay profesionales';
  return total === 1 ? 'Ver 1 profesional' : `Ver ${String(total)} profesionales`;
}

const styles = StyleSheet.create({
  lista: { flexGrow: 1, padding: spacing.lg, gap: spacing.md },
  masCarga: { paddingVertical: spacing.lg },
});
