import { useNavigation } from '@react-navigation/native';
import { useCallback, useDeferredValue, useMemo, useState } from 'react';
import { RefreshControl, SectionList, StyleSheet, Text, View } from 'react-native';

import { EntryCard } from '../features/clinical-records/components/EntryCard';
import { useMyClinicalRecord } from '../features/clinical-records/hooks/use-clinical-record';
import {
  byMonth,
  correctionLinks,
  filterByPeriod,
  newestFirst,
  periodLabel,
  searchEntries,
  searchIndex,
  typesPresent,
  yearsPresent,
  type Period,
} from '../features/clinical-records/lib/record-view';
import { usePullToRefresh } from '../shared/hooks/use-pull-to-refresh';
import { Screen, ScreenHeader } from '../shared/ui/Screen';
import { FilterSheet } from '../shared/ui/FilterSheet';
import { SearchFilterBar, type ActiveFilter } from '../shared/ui/SearchFilterBar';
import { EmptyState, ErrorState, LoadingState } from '../shared/ui/StatusViews';
import { colors, fonts, fontSize, spacing } from '../shared/ui/theme';

/** Cuántas entradas se dibujan por tanda. La historia llega entera del backend;
 *  lo que se pagina es el dibujo, que en una historia larga es lo que pesa. */
const TANDA = 6;

const FILTRO_LABELS: Record<string, string> = {
  TODAS: 'Todas',
  CONSULTA: 'Consultas',
  DIAGNOSTICO: 'Diagnósticos',
  PRESCRIPCION: 'Prescripciones',
  ESTUDIO: 'Estudios',
  CORRECCION: 'Correcciones',
};

/**
 * Mi historia clínica (ENG-116): la línea de tiempo de la web en el celular.
 *
 * Solo lectura: no hay nada que cree ni edite entradas. Lo más reciente
 * primero y agrupado por mes, con el riel del color de cada tipo; la búsqueda y
 * los filtros por tipo y por fecha en la misma franja que "Mis turnos"; y el dibujo por
 * tandas al llegar al final. El detalle de cada registro (con las correcciones
 * vinculadas) va en su pantalla.
 */
export function ClinicalRecordScreen(): React.JSX.Element {
  const navigation = useNavigation();
  const historia = useMyClinicalRecord();
  const tirar = usePullToRefresh(historia.refetch);
  const [filtro, setFiltro] = useState('TODAS');
  const [periodo, setPeriodo] = useState<Period>('TODO');
  const [busqueda, setBusqueda] = useState('');
  const [verFiltros, setVerFiltros] = useState(false);
  const [visibles, setVisibles] = useState(TANDA);

  const entradas = useMemo(
    () => (historia.data ? newestFirst(historia.data) : []),
    [historia.data],
  );
  const vinculos = useMemo(() => correctionLinks(entradas), [entradas]);
  const tipos = useMemo(() => typesPresent(entradas), [entradas]);
  const anios = useMemo(() => yearsPresent(entradas), [entradas]);
  // El texto normalizado de cada entrada se arma una vez por historia, y la
  // búsqueda se aplica diferida: el input responde en cada tecla y la lista se
  // recalcula cuando React tiene tiempo, sin trabar el tipeo en una historia larga.
  const indice = useMemo(() => searchIndex(entradas), [entradas]);
  const busquedaAplicada = useDeferredValue(busqueda);
  const filtradas = useMemo(
    () =>
      searchEntries(
        filterByPeriod(
          filtro === 'TODAS' ? entradas : entradas.filter((e) => e.entryType === filtro),
          periodo,
        ),
        busquedaAplicada,
        indice,
      ),
    [entradas, filtro, periodo, busquedaAplicada, indice],
  );
  const secciones = useMemo(() => byMonth(filtradas.slice(0, visibles)), [filtradas, visibles]);
  const hayFiltros = filtro !== 'TODAS' || periodo !== 'TODO' || busqueda.trim() !== '';
  const elegirTipo = (tipo: string): void => {
    setFiltro(tipo);
    setVisibles(TANDA);
  };
  const elegirPeriodo = (p: Period): void => {
    setPeriodo(p);
    setVisibles(TANDA);
  };
  // Los años se ofrecen recién cuando hay más de uno: con un solo año, "Último
  // año" ya dice lo mismo.
  const periodos: Period[] = [
    'TODO',
    'MES',
    'SEMESTRE',
    'ANIO',
    ...(anios.length > 1 ? anios.map((a): Period => `A${a}`) : []),
  ];
  const activos: ActiveFilter[] = [
    ...(filtro !== 'TODAS'
      ? [
          {
            key: 'tipo',
            label: FILTRO_LABELS[filtro] ?? filtro,
            onRemove: () => elegirTipo('TODAS'),
          },
        ]
      : []),
    ...(periodo !== 'TODO'
      ? [{ key: 'fecha', label: periodLabel(periodo), onRemove: () => elegirPeriodo('TODO') }]
      : []),
  ];

  // Estable entre renders para que `EntryCard` (memo) no se redibuje al tipear o
  // al cargar otra tanda.
  const abrir = useCallback(
    (id: string): void => navigation.navigate('EntradaHC', { id }),
    [navigation],
  );

  const header = <ScreenHeader title="Mi historia clínica" onBack={() => navigation.goBack()} />;

  if (historia.isPending) {
    return (
      <Screen scroll={false} header={header}>
        <LoadingState label="Abriendo tu historia clínica…" />
      </Screen>
    );
  }

  if (historia.isError) {
    return (
      <Screen scroll={false} header={header}>
        <ErrorState message={historia.error.message} onRetry={() => void historia.refetch()} />
      </Screen>
    );
  }

  return (
    <Screen scroll={false} padded={false} header={header}>
      {entradas.length > 0 ? (
        <SearchFilterBar
          search={busqueda}
          onSearch={(texto) => {
            setBusqueda(texto);
            setVisibles(TANDA);
          }}
          placeholder="Diagnóstico, remedio, profesional…"
          searchLabel="Buscar en la historia clínica"
          onOpenFilters={() => setVerFiltros(true)}
          active={activos}
        />
      ) : null}
      <SectionList
        sections={secciones}
        keyExtractor={(entrada) => entrada.id}
        stickySectionHeadersEnabled={false}
        initialNumToRender={TANDA + 4}
        renderSectionHeader={({ section }) => (
          <Text style={styles.seccionTitulo}>{section.title.toUpperCase()}</Text>
        )}
        renderItem={({ item, index, section }) => (
          <View style={styles.item}>
            <EntryCard
              entry={item}
              corrected={vinculos.correctedBy.has(item.id)}
              last={index === section.data.length - 1}
              onOpen={abrir}
            />
          </View>
        )}
        contentContainerStyle={styles.lista}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (visibles < filtradas.length) setVisibles((v) => v + TANDA);
        }}
        refreshControl={
          <RefreshControl
            refreshing={tirar.refreshing}
            onRefresh={tirar.onRefresh}
            tintColor={colors.brand}
            colors={[colors.brand]}
          />
        }
        ListHeaderComponent={
          entradas.length > 0 ? (
            <Text style={styles.aclaracion}>
              Cada entrada queda sellada y no se puede modificar. Si un profesional necesita
              corregir algo, agrega una corrección vinculada al registro original.
            </Text>
          ) : undefined
        }
        ListFooterComponent={
          visibles < filtradas.length ? (
            <Text style={styles.mas}>Cargando más entradas…</Text>
          ) : undefined
        }
        ListEmptyComponent={
          entradas.length === 0 ? (
            <EmptyState
              icon="document-text-outline"
              title="Todavía no hay entradas en tu historia"
              description="Cuando un profesional registre una consulta, un diagnóstico o un estudio, lo vas a ver acá."
            />
          ) : (
            <EmptyState
              icon="search-outline"
              title="No hay registros con esos filtros"
              description="Probá con otras palabras, otro tipo de registro u otras fechas."
              action={
                hayFiltros
                  ? {
                      label: 'Limpiar filtros',
                      onPress: () => {
                        setBusqueda('');
                        elegirTipo('TODAS');
                        elegirPeriodo('TODO');
                      },
                    }
                  : undefined
              }
            />
          )
        }
      />

      <FilterSheet
        visible={verFiltros}
        onDismiss={() => setVerFiltros(false)}
        groups={[
          ...(tipos.length > 1
            ? [
                {
                  title: 'Tipo de registro',
                  options: ['TODAS', ...tipos].map((t) => ({
                    key: t,
                    label: FILTRO_LABELS[t] ?? t,
                    selected: filtro === t,
                    onPress: () => elegirTipo(t),
                  })),
                },
              ]
            : []),
          {
            title: 'Fecha',
            options: periodos.map((p) => ({
              key: p,
              label: periodLabel(p),
              selected: periodo === p,
              onPress: () => elegirPeriodo(p),
            })),
          },
        ]}
        resultLabel={
          filtradas.length === 1 ? 'Ver 1 registro' : `Ver ${filtradas.length} registros`
        }
        onClear={
          filtro !== 'TODAS' || periodo !== 'TODO'
            ? () => {
                elegirTipo('TODAS');
                elegirPeriodo('TODO');
              }
            : undefined
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  lista: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  item: { paddingBottom: spacing.sm },
  seccionTitulo: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    fontFamily: fonts.bold,
    fontSize: 11,
    letterSpacing: 1.2,
    color: colors.muted,
  },
  aclaracion: {
    fontFamily: fonts.medium,
    fontSize: fontSize.xs,
    lineHeight: 17,
    color: colors.muted,
    marginBottom: spacing.xs,
  },
  mas: {
    textAlign: 'center',
    fontFamily: fonts.medium,
    fontSize: fontSize.xs,
    color: colors.mutedSoft,
    paddingVertical: spacing.md,
  },
});
