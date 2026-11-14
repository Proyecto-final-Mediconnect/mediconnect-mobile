import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Sheet } from '../../../shared/ui/Sheet';
import { colors, fonts, fontSize, spacing } from '../../../shared/ui/theme';
import { formatMonth } from '../lib/appointments';
import { freeSlots, monthGrid, monthsOf } from '../lib/booking';
import type { AvailabilityDay } from '../types';

const SEMANA = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

/**
 * El calendario para elegir el día (el mismo que "Ver calendario" de la web):
 * un mes por vez, con los días que tienen horarios libres resaltados y el resto
 * apagado. Sirve para ir directo a una fecha de dentro de un mes sin recorrer la
 * tira de días.
 */
export function DayCalendarSheet({
  visible,
  days,
  selected,
  onSelect,
  onDismiss,
}: {
  visible: boolean;
  days: AvailabilityDay[];
  selected: string | null;
  onSelect: (date: string) => void;
  onDismiss: () => void;
}): React.JSX.Element {
  const meses = monthsOf(days);
  const [mes, setMes] = useState(0);
  // Abre en el mes del día elegido.
  useEffect(() => {
    if (!visible || !selected) return;
    const i = meses.indexOf(selected.slice(0, 7));
    if (i >= 0) setMes(i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const clave = meses[mes];
  const porFecha = new Map(days.map((d) => [d.date, d]));

  return (
    <Sheet visible={visible} title="Elegí el día" onDismiss={onDismiss}>
      {clave ? (
        <View style={styles.contenido}>
          <View style={styles.cabecera}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Mes anterior"
              disabled={mes === 0}
              hitSlop={spacing.sm}
              onPress={() => setMes((m) => m - 1)}
              style={mes === 0 && styles.apagado}
            >
              <Ionicons name="chevron-back" size={20} color={colors.brandDeep} />
            </Pressable>
            <Text style={styles.mes}>{formatMonth(clave)}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Mes siguiente"
              disabled={mes === meses.length - 1}
              hitSlop={spacing.sm}
              onPress={() => setMes((m) => m + 1)}
              style={mes === meses.length - 1 && styles.apagado}
            >
              <Ionicons name="chevron-forward" size={20} color={colors.brandDeep} />
            </Pressable>
          </View>

          <View style={styles.grilla}>
            {SEMANA.map((d, i) => (
              <Text key={`${d}${i}`} style={[styles.celda, styles.semana]}>
                {d}
              </Text>
            ))}
            {monthGrid(clave).map((fecha, i) => {
              if (!fecha) return <View key={`h${i}`} style={styles.celda} />;
              const conLugar = freeSlots(porFecha.get(fecha)).length > 0;
              const activo = fecha === selected;
              const numero = String(Number(fecha.slice(8)));
              return (
                <Pressable
                  key={fecha}
                  accessibilityRole="button"
                  accessibilityLabel={`Día ${numero}${conLugar ? '' : ', sin horarios'}`}
                  aria-selected={activo}
                  disabled={!conLugar}
                  onPress={() => {
                    onSelect(fecha);
                    onDismiss();
                  }}
                  style={styles.celda}
                >
                  <View
                    style={[styles.dia, conLugar && styles.diaLibre, activo && styles.diaActivo]}
                  >
                    <Text
                      style={[
                        styles.diaTexto,
                        !conLugar && styles.diaTextoApagado,
                        activo && styles.diaTextoActivo,
                      ]}
                    >
                      {numero}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.nota}>Los días resaltados tienen horarios libres.</Text>
        </View>
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  contenido: { gap: spacing.md },
  cabecera: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  mes: { fontFamily: fonts.display, fontSize: fontSize.lg, color: colors.brandDeep },
  apagado: { opacity: 0.3 },
  grilla: { flexDirection: 'row', flexWrap: 'wrap' },
  celda: { width: `${100 / 7}%`, alignItems: 'center', paddingVertical: 3 },
  semana: { fontFamily: fonts.bold, fontSize: fontSize.xs, color: colors.mutedSoft },
  dia: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  diaLibre: { backgroundColor: colors.surfaceTeal },
  diaActivo: { backgroundColor: colors.brandDeep },
  diaTexto: { fontFamily: fonts.semibold, fontSize: fontSize.sm, color: colors.brandDeep },
  diaTextoApagado: { color: colors.mutedSoft },
  diaTextoActivo: { color: colors.white },
  nota: {
    fontFamily: fonts.medium,
    fontSize: fontSize.xs,
    color: colors.muted,
    textAlign: 'center',
  },
});
