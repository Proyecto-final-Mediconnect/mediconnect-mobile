import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { DateBadge } from '../../appointments/components/DateBadge';
import { colors, fonts, fontSize, radius, spacing } from '../../../shared/ui/theme';
import { authorName, readEntryFields } from '../lib/clinical-entry';
import { entryDay } from '../lib/record-view';
import { ENTRY_TYPE_LABELS, type ClinicalEntry } from '../types';

/**
 * Color de cada tipo de registro, igual que en la web: una píldora con un punto,
 * y el mismo color para el punto del riel. El ámbar queda para "Corregida", que
 * es una advertencia y no un tipo.
 */
const TONO_TIPO: Record<string, { fondo: string; tinta: string; punto: string }> = {
  CONSULTA: { fondo: colors.surfaceTeal, tinta: colors.brandHover, punto: colors.brand },
  DIAGNOSTICO: { fondo: colors.tagConsulta, tinta: colors.tagConsultaInk, punto: colors.brandDeep },
  PRESCRIPCION: {
    fondo: colors.tagCorreccion,
    tinta: colors.tagCorreccionInk,
    punto: colors.tagCorreccionInk,
  },
  ESTUDIO: { fondo: colors.tagEstudio, tinta: colors.tagEstudioInk, punto: colors.tagEstudioInk },
  CORRECCION: { fondo: colors.lineSoft, tinta: colors.muted, punto: colors.mutedSoft },
};
const TONO_POR_DEFECTO = { fondo: colors.lineSoft, tinta: colors.muted, punto: colors.mutedSoft };

/** El tipo de un registro en una píldora con su punto de color. */
export function EntryTypeTag({ type }: { type: string }): React.JSX.Element {
  const tono = TONO_TIPO[type] ?? TONO_POR_DEFECTO;
  return (
    <View style={[styles.pill, { backgroundColor: tono.fondo }]}>
      <View style={[styles.pillPunto, { backgroundColor: tono.punto }]} />
      <Text style={[styles.pillTexto, { color: tono.tinta }]}>
        {ENTRY_TYPE_LABELS[type] ?? type}
      </Text>
    </View>
  );
}

/** "Corregida": hay un registro posterior que la corrige. */
export function CorrectedTag(): React.JSX.Element {
  return (
    <View style={[styles.pill, { backgroundColor: colors.warm }]}>
      <View style={[styles.pillPunto, { backgroundColor: colors.warmDot }]} />
      <Text style={[styles.pillTexto, { color: colors.warmInk }]}>Corregida</Text>
    </View>
  );
}

interface EntryCardProps {
  entry: ClinicalEntry;
  /** Si una entrada posterior la corrige. */
  corrected: boolean;
  /** La última de su mes: el riel no sigue más abajo. */
  last: boolean;
  onOpen: (id: string) => void;
}

/**
 * Un registro en la línea de tiempo de la historia clínica, como en la web: el
 * riel con un punto del color del tipo (ámbar si tiene una corrección) y al lado
 * una tarjeta compacta con el día en un bloque, el titular, quién lo firmó y el
 * tipo al costado. Todo el detalle va en la pantalla de la entrada.
 *
 * **El titular es el primer campo del contenido.** Las entradas no tienen campo
 * título; el primer campo de cada tipo es el que la resume.
 */
export function EntryCard({ entry, corrected, last, onOpen }: EntryCardProps): React.JSX.Element {
  const titular = readEntryFields(entry)[0]?.value ?? 'Esta entrada no tiene contenido legible.';
  const tono = TONO_TIPO[entry.entryType] ?? TONO_POR_DEFECTO;
  const hora = new Date(entry.createdAt).toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Argentina/Buenos_Aires',
  });

  return (
    <View style={styles.fila}>
      <View style={styles.riel}>
        <View style={[styles.linea, last && styles.lineaFinal]} />
        <View
          style={[styles.punto, { backgroundColor: corrected ? colors.warmDot : tono.punto }]}
        />
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${ENTRY_TYPE_LABELS[entry.entryType] ?? entry.entryType}: ${titular}`}
        onPress={() => onOpen(entry.id)}
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      >
        <DateBadge date={entryDay(entry)} muted={corrected} />
        <View style={styles.textos}>
          <Text style={[styles.titular, corrected && styles.titularApagado]} numberOfLines={1}>
            {titular}
          </Text>
          {/* "Firmada por" y no el nombre suelto: debajo de un titular clínico,
              el nombre solo se lee como si fuera el paciente. */}
          <Text style={styles.firma} numberOfLines={1}>
            Firmada por {authorName(entry)} · {hora}
          </Text>
          <View style={styles.etiquetas}>
            <EntryTypeTag type={entry.entryType} />
            {corrected ? <CorrectedTag /> : null}
          </View>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.mutedSoft} />
      </Pressable>
    </View>
  );
}

const PUNTO = 14;

const styles = StyleSheet.create({
  fila: { flexDirection: 'row', gap: spacing.md },
  riel: { width: PUNTO, alignItems: 'center' },
  linea: {
    position: 'absolute',
    top: 0,
    bottom: -spacing.sm,
    width: 2,
    backgroundColor: colors.line,
  },
  lineaFinal: { bottom: '50%' },
  punto: {
    marginTop: 30,
    width: PUNTO,
    height: PUNTO,
    borderRadius: PUNTO / 2,
    borderWidth: 3,
    borderColor: colors.surface,
  },
  card: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  pressed: { borderColor: colors.brand },
  textos: { flex: 1, gap: 3 },
  titular: { fontFamily: fonts.semibold, fontSize: fontSize.md, color: colors.brandDeep },
  titularApagado: { color: colors.muted },
  firma: { fontFamily: fonts.medium, fontSize: fontSize.xs, color: colors.mutedSoft },
  etiquetas: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 3 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  pillPunto: { width: 6, height: 6, borderRadius: 3 },
  pillTexto: { fontFamily: fonts.semibold, fontSize: 11 },
});
