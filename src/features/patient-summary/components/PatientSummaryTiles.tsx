import { useNavigation } from '@react-navigation/native';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, fontSize, radius, spacing } from '../../../shared/ui/theme';
import { formatPrice } from '../../appointments/lib/appointments';
import { usePatientSummary } from '../hooks/use-patient-summary';
import {
  detallePagos,
  PERIOD_LABELS,
  periodRange,
  sinActividad,
  type SummaryPeriod,
} from '../lib/summary';

const PERIODOS: SummaryPeriod[] = ['30D', 'ANIO'];

/**
 * "Tu resumen" en el inicio (ENG-198): consultas, lo que pagó, lo que le
 * devolvieron y quién accedió a su información, con los mismos números que la
 * web. Cada tarjeta lleva a su detalle: los turnos o los accesos del MediPass.
 *
 * Son conteos: no lee la historia clínica, así que abrir el inicio no deja un
 * acceso en la auditoría.
 */
export function PatientSummaryTiles(): React.JSX.Element {
  const navigation = useNavigation();
  const [periodo, setPeriodo] = useState<SummaryPeriod>('30D');
  const { from, to } = periodRange(periodo);
  const resumen = usePatientSummary(from, to);

  const irATurnos = (): void => navigation.navigate('Paciente', { screen: 'Turnos' });
  const irAMediPass = (): void => navigation.navigate('Paciente', { screen: 'MediPass' });

  return (
    <View style={styles.seccion}>
      <View style={styles.cabecera}>
        <Text style={styles.titulo}>TU RESUMEN</Text>
        <View style={styles.pills} accessibilityRole="radiogroup">
          {PERIODOS.map((p) => {
            const activo = p === periodo;
            return (
              <Pressable
                key={p}
                accessibilityRole="radio"
                accessibilityState={{ checked: activo }}
                hitSlop={spacing.xs}
                onPress={() => setPeriodo(p)}
                style={[styles.pill, activo && styles.pillActiva]}
              >
                <Text style={[styles.pillTexto, activo && styles.pillTextoActiva]}>
                  {PERIOD_LABELS[p]}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {resumen.isPending ? (
        <View
          style={styles.grilla}
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel="Cargando tu resumen"
        >
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={[styles.tile, styles.esqueleto]} />
          ))}
        </View>
      ) : resumen.isError && !resumen.data ? (
        <View style={styles.aviso}>
          <Text style={styles.avisoTexto}>{resumen.error.message}</Text>
          <Pressable accessibilityRole="button" onPress={() => void resumen.refetch()}>
            <Text style={styles.link}>Reintentar</Text>
          </Pressable>
        </View>
      ) : sinActividad(resumen.data) ? (
        <View style={styles.aviso}>
          <Text style={styles.avisoTexto}>
            Sin actividad en {PERIOD_LABELS[periodo].toLowerCase()}: no tuviste consultas, pagos ni
            accesos a tu información.
          </Text>
        </View>
      ) : (
        <View style={styles.grilla}>
          <Tile
            valor={String(resumen.data.consultas.realizadas)}
            etiqueta="Consultas realizadas"
            detalle={
              resumen.data.consultas.profesionales === 1
                ? 'Con 1 profesional'
                : `Con ${resumen.data.consultas.profesionales} profesionales`
            }
            onPress={irATurnos}
          />
          <Tile
            valor={formatPrice(resumen.data.pagos.pagado)}
            etiqueta="Pagaste"
            detalle={detallePagos(resumen.data.pagos)}
            onPress={irATurnos}
          />
          <Tile
            valor={formatPrice(resumen.data.pagos.reembolsado)}
            etiqueta="Te reembolsaron"
            detalle="Por turnos cancelados"
            onPress={irATurnos}
          />
          <Tile
            valor={String(resumen.data.accesos.total)}
            etiqueta="Accesos a tu información"
            detalle={`${resumen.data.accesos.medipass} al MediPass · ${resumen.data.accesos.historiaClinica} a tu historia`}
            onPress={irAMediPass}
          />
        </View>
      )}
    </View>
  );
}

function Tile({
  valor,
  etiqueta,
  detalle,
  onPress,
}: {
  valor: string;
  etiqueta: string;
  detalle: string;
  onPress: () => void;
}): React.JSX.Element {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${etiqueta}: ${valor}`}
      accessibilityHint={detalle}
      onPress={onPress}
      style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
    >
      <Text style={styles.valor} numberOfLines={1} adjustsFontSizeToFit>
        {valor}
      </Text>
      <Text style={styles.etiqueta}>{etiqueta}</Text>
      <Text style={styles.detalle} numberOfLines={2}>
        {detalle}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  seccion: { gap: spacing.sm, marginTop: spacing.sm },
  cabecera: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  titulo: {
    marginLeft: spacing.xs,
    fontFamily: fonts.bold,
    fontSize: fontSize.xs,
    letterSpacing: 1,
    color: colors.mutedSoft,
  },
  pills: { flexDirection: 'row', gap: spacing.xs },
  pill: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 999,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  pillActiva: { backgroundColor: colors.night, borderColor: colors.night },
  pillTexto: { fontFamily: fonts.semibold, fontSize: fontSize.xs, color: colors.muted },
  pillTextoActiva: { color: colors.white },
  grilla: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tile: {
    flexBasis: '47%',
    flexGrow: 1,
    minHeight: 104,
    gap: 2,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.card,
    padding: spacing.md,
  },
  esqueleto: { backgroundColor: colors.lineSoft, borderColor: colors.lineSoft },
  pressed: { borderColor: colors.brand },
  valor: { fontFamily: fonts.display, fontSize: fontSize.xl, color: colors.brandDeep },
  etiqueta: {
    marginTop: spacing.xs,
    fontFamily: fonts.bold,
    fontSize: fontSize.sm,
    color: colors.brandDeep,
  },
  detalle: { fontFamily: fonts.medium, fontSize: fontSize.xs, color: colors.muted, lineHeight: 15 },
  aviso: {
    gap: spacing.xs,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.card,
    padding: spacing.md,
  },
  avisoTexto: { fontFamily: fonts.medium, fontSize: fontSize.sm, color: colors.muted },
  link: { fontFamily: fonts.bold, fontSize: fontSize.sm, color: colors.brandHover },
});
