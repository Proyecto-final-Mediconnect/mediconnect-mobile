import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { Sheet } from '../../../shared/ui/Sheet';
import { colors, fonts, fontSize, spacing } from '../../../shared/ui/theme';
import { formatMonth } from '../lib/appointments';
import { esHoy, freeSlots, monthWeeks, monthsOf } from '../lib/booking';
import type { AvailabilityDay } from '../types';

/** Dos letras y no una: con una sola, martes y miércoles quedaban los dos "M". */
const SEMANA = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];

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
            <View style={styles.fila}>
              {SEMANA.map((d) => (
                <Text key={d} style={[styles.celda, styles.semana]}>
                  {d}
                </Text>
              ))}
            </View>
            {monthWeeks(clave).map((semana, s) => (
              <View key={`s${s}`} style={styles.fila}>
                {semana.map((fecha, i) => {
                  if (!fecha) return <View key={`h${i}`} style={styles.celda} />;
                  const conLugar = freeSlots(porFecha.get(fecha)).length > 0;
                  const activo = fecha === selected;
                  const hoy = esHoy(fecha);
                  const numero = String(Number(fecha.slice(8)));
                  return (
                    <Pressable
                      key={fecha}
                      accessibilityRole="button"
                      accessibilityLabel={`Día ${numero}${conLugar ? '' : ', sin horarios'}${hoy ? ', hoy' : ''}`}
                      aria-selected={activo}
                      disabled={!conLugar}
                      onPress={() => {
                        onSelect(fecha);
                        onDismiss();
                      }}
                      style={styles.celda}
                    >
                      <View
                        style={[
                          styles.dia,
                          conLugar && styles.diaLibre,
                          hoy && !activo && styles.diaHoy,
                          activo && styles.diaActivo,
                        ]}
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
            ))}
          </View>
          <View style={styles.leyenda}>
            <Referencia estilo={styles.diaLibre} texto="Con horarios libres" />
            <Referencia estilo={styles.diaActivo} texto="Elegido" />
            <Referencia estilo={styles.diaHoy} texto="Hoy" />
          </View>
        </View>
      ) : null}
    </Sheet>
  );
}

function Referencia({
  estilo,
  texto,
}: {
  estilo: StyleProp<ViewStyle>;
  texto: string;
}): React.JSX.Element {
  return (
    <View style={styles.referencia}>
      <View style={[styles.muestra, estilo]} />
      <Text style={styles.nota}>{texto}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  contenido: { gap: spacing.md },
  cabecera: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  mes: { fontFamily: fonts.display, fontSize: fontSize.lg, color: colors.brandDeep },
  apagado: { opacity: 0.3 },
  grilla: { gap: 2 },
  fila: { flexDirection: 'row' },
  celda: { flex: 1, alignItems: 'center', paddingVertical: 3 },
  semana: {
    fontFamily: fonts.bold,
    fontSize: fontSize.xs,
    color: colors.mutedSoft,
    textAlign: 'center',
  },
  dia: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  diaLibre: { backgroundColor: colors.surfaceTeal },
  diaActivo: { backgroundColor: colors.brandDeep },
  diaHoy: { borderWidth: 1.5, borderColor: colors.brand },
  diaTexto: { fontFamily: fonts.semibold, fontSize: fontSize.sm, color: colors.brandDeep },
  diaTextoApagado: { color: colors.mutedSoft },
  diaTextoActivo: { color: colors.white },
  leyenda: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.md },
  referencia: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  muestra: { width: 12, height: 12, borderRadius: 6 },
  nota: { fontFamily: fonts.medium, fontSize: fontSize.xs, color: colors.muted },
});
