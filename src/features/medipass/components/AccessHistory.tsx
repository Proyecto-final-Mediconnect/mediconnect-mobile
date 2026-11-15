import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatShortDay } from '../../appointments/lib/appointments';
import { enArgentina } from '../../../shared/lib/argentina-time';
import { ErrorState, LoadingState } from '../../../shared/ui/StatusViews';
import { colors, fonts, fontSize, radius, spacing } from '../../../shared/ui/theme';
import { useHistory } from '../hooks/use-medipass';
import type { MediPassHistoryEntry, MediPassHistoryStatus } from '../types';

/** Cuántos accesos se ven de entrada; el resto está a un toque ("Ver todos"). */
const RECIENTES = 3;

const ESTADO: Record<MediPassHistoryStatus, { label: string; fondo: string; texto: string }> = {
  ACTIVO: { label: 'ABIERTO AHORA', fondo: colors.brandBrightSoft, texto: colors.brandBright },
  VENCIDO: { label: 'CERRADO', fondo: colors.nightIcon, texto: colors.onNight },
  REVOCADO: {
    label: 'LO CORTASTE VOS',
    fondo: colors.dangerOnNightSoft,
    texto: colors.dangerOnNight,
  },
};

/** Un instante ISO en hora argentina: `lun 16 nov · 21:12`. */
export function cuandoAcceso(iso: string): string {
  const { date, time } = enArgentina(new Date(iso));
  return formatShortDay(date, time);
}

/** Solo la hora argentina: `21:12`. */
function hora(iso: string): string {
  return enArgentina(new Date(iso)).time;
}

/**
 * Quién abrió el MediPass, cuándo y qué miró (HU-38, ENG-76), como en la web.
 *
 * Es la otra mitad del control que promete el MediPass: "Accediendo ahora" dice
 * quién mira en este momento, y esto deja ver qué se hizo con el código después
 * de que el acceso se cerró. Se pliega a los últimos tres; "Ver todos" muestra
 * el resto y trae los anteriores de a páginas.
 */
export function AccessHistory(): React.JSX.Element {
  const historial = useHistory();
  const [verTodos, setVerTodos] = useState(false);

  if (historial.isPending) {
    return (
      <View style={styles.cargando}>
        <LoadingState tone="dark" />
      </View>
    );
  }
  if (historial.isError) {
    return (
      <ErrorState
        tone="dark"
        message={historial.error.message}
        onRetry={() => void historial.refetch()}
      />
    );
  }

  const accesos = historial.data.pages.flatMap((p) => p.accesos);
  if (accesos.length === 0) {
    return (
      <View style={styles.vacio}>
        <Text style={styles.vacioTexto}>Nadie abrió tu MediPass todavía.</Text>
      </View>
    );
  }

  const visibles = verTodos ? accesos : accesos.slice(0, RECIENTES);
  const hayOcultos = !verTodos && (accesos.length > RECIENTES || historial.hasNextPage);

  return (
    <View style={styles.lista}>
      {visibles.map((acceso) => (
        <Acceso key={acceso.sesionId} acceso={acceso} />
      ))}
      {hayOcultos ? (
        <Enlace label="Ver todos los accesos" onPress={() => setVerTodos(true)} />
      ) : verTodos && historial.hasNextPage ? (
        <Enlace
          label={historial.isFetchingNextPage ? 'Cargando…' : 'Ver los anteriores'}
          onPress={() => void historial.fetchNextPage()}
        />
      ) : null}
    </View>
  );
}

function Acceso({ acceso }: { acceso: MediPassHistoryEntry }): React.JSX.Element {
  const estado = ESTADO[acceso.estado];
  const quien = acceso.consultante.nombre ?? 'Alguien sin identificarse';

  return (
    <View style={styles.fila}>
      <View style={styles.arriba}>
        <Text style={[styles.quien, styles.flex]} numberOfLines={1}>
          {quien}
        </Text>
        <View style={[styles.estado, { backgroundColor: estado.fondo }]}>
          <Text style={[styles.estadoTexto, { color: estado.texto }]}>{estado.label}</Text>
        </View>
      </View>
      <Text style={styles.contexto}>
        {/* Declarada por quien escaneó, no verificada (como en la web). */}
        {acceso.consultante.matricula
          ? `Matrícula ${acceso.consultante.matricula} (declarada)`
          : 'No dio matrícula'}
        {' · '}
        {cuandoAcceso(acceso.inicio)}
        {acceso.origen === 'TARJETA' ? ' · con tu tarjeta' : ''}
      </Text>
      {acceso.vistas.length > 0 ? (
        <View accessibilityLabel={`Lo que vio ${quien}`} style={styles.vistas}>
          {acceso.vistas.map((vista, i) => (
            <View key={`${vista.el}-${i}`} style={styles.vista}>
              <Text style={styles.vistaHora}>{hora(vista.el)}</Text>
              <Text style={[styles.vistaTexto, styles.flex]}>{vista.etiqueta}</Text>
            </View>
          ))}
        </View>
      ) : null}
      {acceso.revocadoEl ? (
        <Text style={styles.cortado}>Cortaste el acceso a las {hora(acceso.revocadoEl)}.</Text>
      ) : null}
    </View>
  );
}

function Enlace({ label, onPress }: { label: string; onPress: () => void }): React.JSX.Element {
  return (
    <Pressable
      accessibilityRole="button"
      hitSlop={spacing.sm}
      onPress={onPress}
      style={styles.enlace}
    >
      <Text style={styles.enlaceTexto}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  cargando: { minHeight: 80 },
  lista: { gap: spacing.sm },
  fila: {
    gap: 4,
    backgroundColor: colors.nightCard,
    borderRadius: radius.card,
    padding: spacing.lg,
  },
  arriba: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  quien: { fontFamily: fonts.bold, fontSize: fontSize.md, color: colors.white },
  estado: { borderRadius: 999, paddingHorizontal: spacing.sm, paddingVertical: 3 },
  estadoTexto: { fontFamily: fonts.bold, fontSize: fontSize.micro, letterSpacing: 0.8 },
  contexto: { fontFamily: fonts.medium, fontSize: fontSize.xs, color: colors.onNight },
  vistas: {
    gap: 4,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.nightBorder,
  },
  vista: { flexDirection: 'row', gap: spacing.md },
  vistaHora: {
    width: 40,
    fontFamily: fonts.medium,
    fontSize: fontSize.xs,
    color: colors.onNightSoft,
    fontVariant: ['tabular-nums'],
  },
  vistaTexto: { fontFamily: fonts.medium, fontSize: fontSize.xs, color: colors.white },
  cortado: {
    marginTop: spacing.xs,
    fontFamily: fonts.semibold,
    fontSize: fontSize.xs,
    color: colors.dangerOnNight,
  },
  vacio: { backgroundColor: colors.nightCard, borderRadius: radius.card, padding: spacing.lg },
  vacioTexto: { fontFamily: fonts.medium, fontSize: fontSize.sm, color: colors.onNight },
  enlace: { alignSelf: 'flex-start', paddingVertical: spacing.xs },
  enlaceTexto: { fontFamily: fonts.bold, fontSize: fontSize.sm, color: colors.brandBright },
});
