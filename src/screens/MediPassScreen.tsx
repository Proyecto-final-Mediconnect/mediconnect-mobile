import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useCallback, useState, type ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { cuandoAcceso } from '../features/medipass/components/AccessHistory';
import { AccessList } from '../features/medipass/components/AccessList';
import { MediPassCode } from '../features/medipass/components/MediPassCode';
import { useFullBrightness } from '../features/medipass/hooks/use-full-brightness';
import {
  useAccesses,
  useEmergencyCard,
  useHistory,
  useRevokeAccess,
  useScope,
  useVitalBlock,
} from '../features/medipass/hooks/use-medipass';
import { bloquesVisibles, estadoDeAcceso, vitalVacio } from '../features/medipass/lib/medipass';
import type { MediPassAccess } from '../features/medipass/types';
import { useNow } from '../shared/hooks/use-now';
import { ConfirmSheet } from '../shared/ui/ConfirmSheet';
import { Screen, ScreenHeader } from '../shared/ui/Screen';
import { ErrorState, LoadingState } from '../shared/ui/StatusViews';
import { colors, fonts, fontSize, radius, spacing } from '../shared/ui/theme';

/**
 * Mi MediPass (ENG-117), sobre el azul noche del canvas: el código para
 * mostrar y quién está mirando ahora, que es lo que se usa en el momento. El
 * historial, lo que ve quien escanea y la tarjeta de emergencia tienen su
 * pantalla, a un toque desde acá: la pantalla entra sin bajar demasiado.
 *
 * Es la razón de ser de la app mobile —un QR en una pantalla de escritorio no
 * sirve en una guardia—, así que el código va primero y grande, con el brillo al
 * máximo mientras la pantalla está abierta.
 */
export function MediPassScreen(): React.JSX.Element {
  useFullBrightness();
  const navigation = useNavigation();
  const scope = useScope();
  const vital = useVitalBlock();
  const historial = useHistory();
  const estadoTarjeta = useEmergencyCard();
  const accesos = useAccesses();
  const revocar = useRevokeAccess();
  const ahora = useNow(1000);
  const [aRevocar, setARevocar] = useState<MediPassAccess | null>(null);

  // La pestaña queda montada al cambiar de pestaña: sin esto, lo que el
  // paciente acaba de editar en su perfil no aparecería acá hasta reabrir la app.
  const { refetch: refetchVital } = vital;
  const { refetch: refetchAccesos } = accesos;
  useFocusEffect(
    useCallback(() => {
      void refetchVital();
      void refetchAccesos();
    }, [refetchVital, refetchAccesos]),
  );

  // Lo que dice cada acceso debajo del título: lo último, sin entrar.
  const primero = historial.data?.pages[0]?.accesos[0];
  const ultimoAcceso = historial.data
    ? primero
      ? `Último: ${primero.consultante.nombre ?? 'alguien sin identificarse'} · ${cuandoAcceso(primero.inicio)}`
      : 'Nadie lo abrió todavía'
    : ' ';
  const visibilidad =
    vital.data && vitalVacio(vital.data)
      ? 'Todavía no cargaste tus datos de emergencia'
      : scope.data
        ? (({ visibles, total }) => `${visibles} de ${total} datos visibles`)(
            bloquesVisibles(scope.data),
          )
        : ' ';
  const tarjeta = estadoTarjeta.data ? (estadoTarjeta.data.activa ? 'Activa' : 'Sin tarjeta') : ' ';

  const cerrar = (): void => {
    setARevocar(null);
    revocar.reset();
  };

  return (
    <Screen
      tone="dark"
      header={
        <ScreenHeader
          tone="dark"
          title="Mi MediPass"
          subtitle="Mostralo o dictá el código: quien lo abre ve solo lo que elegís abajo."
        />
      }
    >
      <MediPassCode />

      <Seccion
        icon="eye-outline"
        titulo="Accediendo ahora"
        enVivo={
          accesos.data?.filter((a) => estadoDeAcceso(a, ahora).estado === 'VIGENTE').length ?? 0
        }
      />
      {accesos.data ? (
        <AccessList accesses={accesos.data} now={ahora} onRevoke={setARevocar} />
      ) : accesos.isError ? (
        <ErrorState
          tone="dark"
          message={accesos.error.message}
          onRetry={() => void accesos.refetch()}
        />
      ) : (
        <View style={styles.cargando}>
          <LoadingState tone="dark" />
        </View>
      )}

      <View style={styles.accesos}>
        <Acceso
          icon="time-outline"
          titulo="Quién abrió tu MediPass"
          detalle={ultimoAcceso}
          onPress={() => navigation.navigate('MediPassHistorial')}
        />
        <Acceso
          icon="options-outline"
          titulo="Lo que ve quien lo escanea"
          detalle={visibilidad}
          onPress={() => navigation.navigate('MediPassVisible')}
        />
        <Acceso
          icon="card-outline"
          titulo="Tarjeta de emergencia"
          detalle={tarjeta}
          onPress={() => navigation.navigate('TarjetaEmergencia')}
          ultimo
        />
      </View>

      <ConfirmSheet
        visible={aRevocar !== null}
        title="¿Revocar el acceso?"
        message={
          aRevocar
            ? `${aRevocar.consultante} deja de ver tu MediPass en este momento. Si lo necesita de nuevo, vas a tener que mostrarle el código otra vez.`
            : ''
        }
        confirmLabel="Revocar acceso"
        dismissLabel="Dejar que siga viendo"
        pending={revocar.isPending}
        error={revocar.isError ? revocar.error.message : null}
        onDismiss={cerrar}
        onConfirm={() => {
          if (aRevocar) revocar.mutate(aRevocar.id, { onSuccess: cerrar });
        }}
      />
    </Screen>
  );
}

/** El título de cada parte, con su ícono; "Accediendo ahora" dice cuántos hay en vivo. */
function Seccion({
  icon,
  titulo,
  enVivo = 0,
}: {
  icon: ComponentProps<typeof Ionicons>['name'];
  titulo: string;
  enVivo?: number;
}): React.JSX.Element {
  return (
    <View style={styles.seccion}>
      <View style={styles.seccionIcono}>
        <Ionicons name={icon} size={16} color={colors.brandBright} />
      </View>
      <Text accessibilityRole="header" style={styles.seccionTitulo}>
        {titulo}
      </Text>
      {enVivo > 0 ? (
        <View style={styles.enVivo}>
          <View style={styles.enVivoPunto} />
          <Text style={styles.enVivoTexto}>{enVivo} EN VIVO</Text>
        </View>
      ) : null}
    </View>
  );
}

/** Una fila que lleva a otra pantalla del MediPass, con lo último debajo del título. */
function Acceso({
  icon,
  titulo,
  detalle,
  onPress,
  ultimo = false,
}: {
  icon: ComponentProps<typeof Ionicons>['name'];
  titulo: string;
  detalle: string;
  onPress: () => void;
  ultimo?: boolean;
}): React.JSX.Element {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={titulo}
      onPress={onPress}
      style={({ pressed }) => [
        styles.acceso,
        !ultimo && styles.accesoBorde,
        pressed && styles.accesoPresionado,
      ]}
    >
      <View style={styles.seccionIcono}>
        <Ionicons name={icon} size={16} color={colors.brandBright} />
      </View>
      <View style={styles.accesoTextos}>
        <Text style={styles.accesoTitulo}>{titulo}</Text>
        <Text style={styles.accesoDetalle} numberOfLines={1}>
          {detalle}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.onNight} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  accesos: {
    marginTop: spacing.lg,
    backgroundColor: colors.nightCard,
    borderRadius: radius.card,
    overflow: 'hidden',
  },
  acceso: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
  },
  accesoBorde: { borderBottomWidth: 1, borderBottomColor: colors.nightBorder },
  accesoPresionado: { backgroundColor: colors.nightIcon },
  accesoTextos: { flex: 1, gap: 2 },
  accesoTitulo: { fontFamily: fonts.bold, fontSize: fontSize.md, color: colors.white },
  accesoDetalle: { fontFamily: fonts.medium, fontSize: fontSize.xs, color: colors.onNight },
  seccion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  seccionIcono: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.nightIcon,
  },
  seccionTitulo: {
    flex: 1,
    fontFamily: fonts.display,
    fontSize: fontSize.lg + 2,
    color: colors.white,
  },
  enVivo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: colors.brandBrightSoft,
  },
  enVivoPunto: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.brandBright },
  enVivoTexto: {
    fontFamily: fonts.bold,
    fontSize: fontSize.micro,
    letterSpacing: 0.8,
    color: colors.brandBright,
  },
  cargando: { minHeight: 120 },
  accion: { alignItems: 'flex-start' },
  ayuda: {
    fontFamily: fonts.medium,
    fontSize: fontSize.xs,
    lineHeight: 17,
    color: colors.onNightSoft,
  },
  error: { fontFamily: fonts.semibold, fontSize: fontSize.xs, color: colors.danger },
  scopeError: { gap: spacing.sm, alignItems: 'flex-start' },
});
