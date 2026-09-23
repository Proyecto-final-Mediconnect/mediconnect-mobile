import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { EntryTypeTag } from '../features/clinical-records/components/EntryCard';
import { useMyClinicalRecord } from '../features/clinical-records/hooks/use-clinical-record';
import {
  authorName,
  formatEntryDate,
  readEntryFields,
} from '../features/clinical-records/lib/clinical-entry';
import { correctionLinks } from '../features/clinical-records/lib/record-view';
import { ENTRY_TYPE_LABELS } from '../features/clinical-records/types';
import type { RootStackParamList } from '../navigation/types';
import { Screen, ScreenHeader } from '../shared/ui/Screen';
import { ErrorState, LoadingState } from '../shared/ui/StatusViews';
import { colors, fonts, fontSize, radius, spacing } from '../shared/ui/theme';

/**
 * Una entrada de la HC completa: todos sus campos, quién la firmó y cuándo, y
 * el vínculo con su corrección o con el original.
 *
 * Lee de la misma consulta que la lista, que ya está en caché: abrir una
 * entrada no vuelve a pedir la historia ni suma otro acceso a la auditoría.
 */
export function EntryDetailScreen(): React.JSX.Element {
  const navigation = useNavigation();
  const { params } = useRoute<RouteProp<RootStackParamList, 'EntradaHC'>>();
  const historia = useMyClinicalRecord();

  const entrada = historia.data?.find((e) => e.id === params.id);
  const header = (
    <ScreenHeader
      title={entrada ? (ENTRY_TYPE_LABELS[entrada.entryType] ?? entrada.entryType) : 'Entrada'}
      onBack={() => navigation.goBack()}
    />
  );

  if (historia.isPending) {
    return (
      <Screen scroll={false} header={header}>
        <LoadingState />
      </Screen>
    );
  }

  if (!entrada) {
    return (
      <Screen scroll={false} header={header}>
        <ErrorState message="No encontramos esta entrada en tu historia clínica." />
      </Screen>
    );
  }

  const { correctedBy, corrects } = correctionLinks(historia.data ?? []);
  const correccion = correctedBy.get(entrada.id);
  const original = corrects.get(entrada.id);
  const [titular, ...campos] = readEntryFields(entrada);

  return (
    <Screen header={header}>
      <View style={styles.card}>
        <EntryTypeTag type={entrada.entryType} />
        <Text style={styles.titular}>
          {titular?.value ?? 'Esta entrada no tiene contenido legible.'}
        </Text>
        <Text style={styles.meta}>{formatEntryDate(entrada.createdAt)}</Text>
        <Text style={styles.meta}>Firmada por {authorName(entrada)}</Text>

        {campos.length > 0 ? (
          <View style={styles.campos}>
            {campos.map((campo) => (
              <View key={campo.label} style={styles.campo}>
                <Text style={styles.rotulo}>{campo.label.toUpperCase()}</Text>
                <Text style={styles.valor}>{campo.value}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>

      {correccion ? (
        <Enlace
          texto="Este registro tiene una corrección posterior. Se conserva tal como se escribió."
          accion="Ver la corrección"
          onPress={() => navigation.navigate('EntradaHC', { id: correccion.id })}
        />
      ) : null}

      {original ? (
        <Enlace
          texto="Esta entrada corrige un registro anterior, que se conserva sin cambios."
          accion="Ver el original"
          onPress={() => navigation.navigate('EntradaHC', { id: original.id })}
        />
      ) : null}

      <View style={styles.sello}>
        <Ionicons name="lock-closed-outline" size={16} color={colors.muted} />
        <Text style={styles.selloTexto}>
          Registro sellado: no se puede editar ni borrar (Ley 26.529).
        </Text>
      </View>
    </Screen>
  );
}

function Enlace({
  texto,
  accion,
  onPress,
}: {
  texto: string;
  accion: string;
  onPress: () => void;
}): React.JSX.Element {
  return (
    <View style={styles.enlace}>
      <Text style={styles.enlaceTexto}>{texto}</Text>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={accion}
        hitSlop={spacing.sm}
        onPress={onPress}
      >
        <Text style={styles.enlaceAccion}>{accion}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.card,
    padding: spacing.xl,
    gap: spacing.xs,
    alignItems: 'flex-start',
  },
  titular: {
    marginTop: spacing.md,
    fontFamily: fonts.display,
    fontSize: fontSize.xl,
    lineHeight: 32,
    color: colors.brandDeep,
  },
  meta: { fontFamily: fonts.medium, fontSize: fontSize.sm, color: colors.muted },
  campos: {
    alignSelf: 'stretch',
    marginTop: spacing.lg,
    gap: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.lineSoft,
    paddingTop: spacing.lg,
  },
  campo: { gap: 4 },
  rotulo: { fontFamily: fonts.bold, fontSize: 10, letterSpacing: 1, color: colors.mutedSoft },
  valor: { fontFamily: fonts.regular, fontSize: fontSize.md, lineHeight: 22, color: colors.ink },
  enlace: {
    backgroundColor: colors.warm,
    borderRadius: radius.card,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  enlaceTexto: {
    fontFamily: fonts.medium,
    fontSize: fontSize.sm,
    lineHeight: 19,
    color: colors.warmInk,
  },
  enlaceAccion: { fontFamily: fonts.bold, fontSize: fontSize.sm, color: colors.warmInk },
  sello: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  selloTexto: { flex: 1, fontFamily: fonts.medium, fontSize: fontSize.xs, color: colors.muted },
});
