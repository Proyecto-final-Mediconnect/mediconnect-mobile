import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useCallback, useState, type ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AccessHistory } from '../features/medipass/components/AccessHistory';
import { AccessList } from '../features/medipass/components/AccessList';
import { EmergencyCardSection } from '../features/medipass/components/EmergencyCardSection';
import { MediPassCode } from '../features/medipass/components/MediPassCode';
import { VitalSummary } from '../features/medipass/components/VitalSummary';
import { useFullBrightness } from '../features/medipass/hooks/use-full-brightness';
import {
  useAccesses,
  useRevokeAccess,
  useSaveScope,
  useScope,
  useVitalBlock,
} from '../features/medipass/hooks/use-medipass';
import { estadoDeAcceso } from '../features/medipass/lib/medipass';
import type { MediPassAccess, VitalBlock } from '../features/medipass/types';
import { useNow } from '../shared/hooks/use-now';
import { Button } from '../shared/ui/Button';
import { ConfirmSheet } from '../shared/ui/ConfirmSheet';
import { Screen, ScreenHeader } from '../shared/ui/Screen';
import { ErrorState, LoadingState } from '../shared/ui/StatusViews';
import { colors, fonts, fontSize, spacing } from '../shared/ui/theme';

/**
 * Mi MediPass (ENG-117), sobre el azul noche del canvas: el código para
 * mostrar, lo que ve quien lo escanea y quién está mirando ahora.
 *
 * Es la razón de ser de la app mobile —un QR en una pantalla de escritorio no
 * sirve en una guardia—, así que el código va primero y grande, con el brillo al
 * máximo mientras la pantalla está abierta.
 */
/** Sin nada clínico cargado: el médico solo vería el nombre y la edad (ENG-136). */
function vitalVacio(vital: VitalBlock): boolean {
  return (
    !vital.grupoSanguineo &&
    !vital.alergias?.length &&
    !vital.medicacion?.length &&
    !vital.condiciones?.length &&
    !vital.contacto
  );
}

export function MediPassScreen(): React.JSX.Element {
  useFullBrightness();
  const navigation = useNavigation();
  const scope = useScope();
  const guardarScope = useSaveScope();
  const vital = useVitalBlock();
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

      <Seccion icon="time-outline" titulo="Quién abrió tu MediPass" />
      <Text style={styles.ayuda}>
        Cada vez que alguien usa tu código o tu tarjeta queda registrado acá, con su nombre, su
        matrícula si la dio y qué información vio.
      </Text>
      <AccessHistory />

      <Seccion icon="options-outline" titulo="Lo que ve quien lo escanea" />
      {vital.data ? (
        <>
          <Text style={styles.ayuda}>
            Tu nombre y tu edad siempre se ven. Lo demás lo elegís con cada interruptor, y vale
            también para quien ya está mirando.
          </Text>
          <VitalSummary
            vital={vital.data}
            scope={scope.data}
            saving={guardarScope.isPending}
            onToggle={(bloque) => {
              if (scope.data) guardarScope.mutate({ ...scope.data, [bloque]: !scope.data[bloque] });
            }}
          />
          {/* Sin el scope no hay interruptores: que se sepa por qué, en vez de
              dejar creer que todo lo que figura arriba se puede ocultar. */}
          {scope.isError ? (
            <View style={styles.scopeError}>
              <Text accessibilityRole="alert" style={styles.error}>
                No pudimos cargar qué bloques ve quien escanea, así que por ahora no podés ocultar
                ninguno.
              </Text>
              <Button
                label={scope.isFetching ? 'Cargando…' : 'Reintentar'}
                variant="secondary"
                disabled={scope.isFetching}
                onPress={() => void scope.refetch()}
              />
            </View>
          ) : null}
          {guardarScope.isError ? (
            <Text style={styles.error}>No pudimos guardar el cambio, probá de nuevo.</Text>
          ) : null}
          {/* Lo que se edita está en el perfil (ENG-136): desde acá se llega
              directo, y si está vacío se insiste. */}
          {vitalVacio(vital.data) ? (
            <Button
              label="Cargar mis datos de emergencia"
              variant="accent"
              onPress={() => navigation.navigate('DatosEmergencia')}
              fullWidth
            />
          ) : (
            <View style={styles.accion}>
              <Button
                label="Editar mis datos"
                variant="night"
                size="sm"
                onPress={() => navigation.navigate('DatosEmergencia')}
              />
            </View>
          )}
        </>
      ) : vital.isError ? (
        <ErrorState
          tone="dark"
          message={vital.error.message}
          onRetry={() => void vital.refetch()}
        />
      ) : (
        <View style={styles.cargando}>
          <LoadingState tone="dark" />
        </View>
      )}

      <Seccion icon="card-outline" titulo="Tarjeta de emergencia" />
      <EmergencyCardSection nombre={vital.data?.nombre ?? ''} />

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

const styles = StyleSheet.create({
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
