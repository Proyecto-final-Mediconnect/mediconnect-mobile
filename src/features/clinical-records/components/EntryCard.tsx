import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, fontSize, radius, spacing } from '../../../shared/ui/theme';
import { authorName, formatEntryShortDate, readEntryFields } from '../lib/clinical-entry';
import { ENTRY_TYPE_LABELS, type ClinicalEntry } from '../types';

const COLOR_TIPO: Record<string, { fondo: string; tinta: string }> = {
  CORRECCION: { fondo: colors.tagCorreccion, tinta: colors.tagCorreccionInk },
  ESTUDIO: { fondo: colors.tagEstudio, tinta: colors.tagEstudioInk },
};
const COLOR_POR_DEFECTO = { fondo: colors.tagConsulta, tinta: colors.tagConsultaInk };

export function EntryTypeTag({ type }: { type: string }): React.JSX.Element {
  const color = COLOR_TIPO[type] ?? COLOR_POR_DEFECTO;
  return (
    <Text style={[styles.tag, { backgroundColor: color.fondo, color: color.tinta }]}>
      {(ENTRY_TYPE_LABELS[type] ?? type).toUpperCase()}
    </Text>
  );
}

interface EntryCardProps {
  entry: ClinicalEntry;
  /** La corrección que tiene esta entrada, si alguien la corrigió después. */
  correctedBy?: ClinicalEntry;
  /** La entrada que esta corrige, si está en la lista. */
  corrects?: ClinicalEntry;
  onOpen: (id: string) => void;
}

/**
 * Una entrada de la historia en la línea de tiempo, como las tarjetas de la HC
 * de la web: tipo, fecha, el primer campo como titular, quién la firmó y un
 * adelanto. Tocarla abre el registro completo.
 *
 * El vínculo de corrección va en los dos sentidos (ENG-100): la original avisa
 * que tiene una corrección posterior y la corrección dice qué corrige. Sin el
 * lado de la original, quien la lee no se entera de que hay otra versión.
 */
export function EntryCard({
  entry,
  correctedBy,
  corrects,
  onOpen,
}: EntryCardProps): React.JSX.Element {
  const [titular, ...resto] = readEntryFields(entry);
  const adelanto = resto[0];
  const corregida = correctedBy !== undefined;

  return (
    <View style={styles.fila}>
      <View style={styles.riel}>
        <View style={styles.linea} />
        <View style={[styles.punto, corregida && styles.puntoCorregido]} />
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${ENTRY_TYPE_LABELS[entry.entryType] ?? entry.entryType}: ${titular?.value ?? 'sin contenido legible'}`}
        onPress={() => onOpen(entry.id)}
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      >
        <View style={styles.encabezado}>
          <View style={styles.etiquetas}>
            <EntryTypeTag type={entry.entryType} />
            {corregida ? <Text style={[styles.tag, styles.tagCorregida]}>CORREGIDA</Text> : null}
          </View>
          <Text style={styles.fecha}>{formatEntryShortDate(entry.createdAt)}</Text>
        </View>

        <Text style={styles.titular}>
          {titular?.value ?? 'Esta entrada no tiene contenido legible.'}
        </Text>
        <Text style={styles.firma}>Firmada por {authorName(entry)}</Text>

        {adelanto ? (
          <Text style={styles.adelanto} numberOfLines={2}>
            <Text style={styles.adelantoRotulo}>{adelanto.label}: </Text>
            {adelanto.value}
          </Text>
        ) : null}

        {entry.correctsEntryId ? (
          <Vinculo
            texto="Corrige un registro anterior, que se conserva sin cambios."
            accion={
              corrects
                ? { label: 'Ver el original', onPress: () => onOpen(corrects.id) }
                : undefined
            }
          />
        ) : null}

        {correctedBy ? (
          <Vinculo
            texto="Tiene una corrección posterior. Este registro se conserva como se escribió."
            accion={{ label: 'Ver la corrección', onPress: () => onOpen(correctedBy.id) }}
          />
        ) : null}
      </Pressable>
    </View>
  );
}

function Vinculo({
  texto,
  accion,
}: {
  texto: string;
  accion?: { label: string; onPress: () => void };
}): React.JSX.Element {
  return (
    <View style={styles.vinculo}>
      <Text style={styles.vinculoTexto}>{texto}</Text>
      {accion ? (
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={accion.label}
          hitSlop={spacing.sm}
          onPress={accion.onPress}
        >
          <Text style={styles.vinculoAccion}>{accion.label}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fila: { flexDirection: 'row', gap: spacing.md },
  riel: { width: 12, alignItems: 'center' },
  linea: {
    position: 'absolute',
    top: 0,
    bottom: -spacing.md,
    width: 2,
    backgroundColor: colors.line,
  },
  punto: {
    marginTop: 22,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 3,
    borderColor: colors.brandHover,
    backgroundColor: colors.white,
  },
  puntoCorregido: { borderColor: colors.warmDot },
  card: {
    flex: 1,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.card,
    padding: spacing.lg,
    gap: 2,
  },
  pressed: { borderColor: colors.brand },
  encabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  etiquetas: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, flexShrink: 1 },
  tag: {
    overflow: 'hidden',
    borderRadius: 5,
    paddingHorizontal: 7,
    paddingVertical: 3,
    fontFamily: fonts.bold,
    fontSize: 10,
    letterSpacing: 0.6,
  },
  tagCorregida: { backgroundColor: colors.warm, color: colors.warmInk },
  fecha: { fontFamily: fonts.semibold, fontSize: fontSize.xs, color: colors.mutedSoft },
  titular: {
    marginTop: spacing.sm,
    fontFamily: fonts.bold,
    fontSize: fontSize.md,
    color: colors.brandDeep,
  },
  firma: { fontFamily: fonts.medium, fontSize: fontSize.xs, color: colors.muted },
  adelanto: {
    marginTop: spacing.sm,
    fontFamily: fonts.regular,
    fontSize: fontSize.sm,
    lineHeight: 19,
    color: colors.ink,
  },
  adelantoRotulo: { fontFamily: fonts.semibold, color: colors.muted },
  vinculo: {
    marginTop: spacing.md,
    borderRadius: radius.field,
    backgroundColor: colors.surface,
    padding: spacing.md,
    gap: 4,
  },
  vinculoTexto: {
    fontFamily: fonts.medium,
    fontSize: fontSize.xs,
    lineHeight: 17,
    color: colors.muted,
  },
  vinculoAccion: { fontFamily: fonts.bold, fontSize: fontSize.xs, color: colors.brandDeep },
});
