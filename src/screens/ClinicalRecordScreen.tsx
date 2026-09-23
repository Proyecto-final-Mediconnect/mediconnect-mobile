import { useNavigation } from '@react-navigation/native';
import { useMemo, useState } from 'react';
import { FlatList, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { EntryCard } from '../features/clinical-records/components/EntryCard';
import { useMyClinicalRecord } from '../features/clinical-records/hooks/use-clinical-record';
import {
  correctionLinks,
  newestFirst,
  typesPresent,
} from '../features/clinical-records/lib/record-view';
import { Screen, ScreenHeader } from '../shared/ui/Screen';
import { SegmentedControl } from '../shared/ui/SegmentedControl';
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
 * primero, filtro por tipo, las correcciones vinculadas en los dos sentidos y
 * el dibujo por tandas al llegar al final.
 */
export function ClinicalRecordScreen(): React.JSX.Element {
  const navigation = useNavigation();
  const historia = useMyClinicalRecord();
  const [filtro, setFiltro] = useState('TODAS');
  const [visibles, setVisibles] = useState(TANDA);

  const entradas = useMemo(
    () => (historia.data ? newestFirst(historia.data) : []),
    [historia.data],
  );
  const vinculos = useMemo(() => correctionLinks(entradas), [entradas]);
  const tipos = useMemo(() => typesPresent(entradas), [entradas]);
  const filtradas = filtro === 'TODAS' ? entradas : entradas.filter((e) => e.entryType === filtro);

  const header = (
    <ScreenHeader title="Mi historia clínica" onBack={() => navigation.goBack()}>
      {tipos.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtros}>
          <SegmentedControl
            value={filtro}
            onChange={(valor) => {
              setFiltro(valor);
              setVisibles(TANDA);
            }}
            options={['TODAS', ...tipos].map((t) => ({ value: t, label: FILTRO_LABELS[t] ?? t }))}
          />
        </ScrollView>
      ) : null}
    </ScreenHeader>
  );

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

  const abrir = (id: string): void => navigation.navigate('EntradaHC', { id });

  return (
    <Screen scroll={false} padded={false} header={header}>
      <FlatList
        data={filtradas.slice(0, visibles)}
        keyExtractor={(entrada) => entrada.id}
        renderItem={({ item }) => (
          <EntryCard
            entry={item}
            correctedBy={vinculos.correctedBy.get(item.id)}
            corrects={vinculos.corrects.get(item.id)}
            onOpen={abrir}
          />
        )}
        contentContainerStyle={styles.lista}
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (visibles < filtradas.length) setVisibles((v) => v + TANDA);
        }}
        refreshControl={
          <RefreshControl
            refreshing={historia.isRefetching}
            onRefresh={() => void historia.refetch()}
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
          ) : null
        }
        ListFooterComponent={
          visibles < filtradas.length ? (
            <Text style={styles.mas}>Cargando más entradas…</Text>
          ) : null
        }
        ListEmptyComponent={
          entradas.length === 0 ? (
            <EmptyState
              icon="document-text-outline"
              title="Todavía no hay entradas en tu historia"
              description="Cuando un profesional registre una consulta, un diagnóstico o un estudio, lo vas a ver acá."
            />
          ) : (
            <View style={styles.sinCoincidencias}>
              <Text style={styles.aclaracion}>No hay entradas de este tipo.</Text>
            </View>
          )
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  filtros: { marginHorizontal: -spacing.xl, paddingHorizontal: spacing.xl },
  lista: { flexGrow: 1, padding: spacing.lg, gap: spacing.md },
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
  sinCoincidencias: { paddingVertical: spacing.xl, alignItems: 'center' },
});
