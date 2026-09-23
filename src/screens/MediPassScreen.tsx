import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AccessList } from '../features/medipass/components/AccessList';
import { MediPassCode } from '../features/medipass/components/MediPassCode';
import { VitalSummary } from '../features/medipass/components/VitalSummary';
import { useFullBrightness } from '../features/medipass/hooks/use-full-brightness';
import {
  useAccesses,
  useRevokeAccess,
  useVitalBlock,
} from '../features/medipass/hooks/use-medipass';
import type { MediPassAccess } from '../features/medipass/types';
import { useNow } from '../shared/hooks/use-now';
import { ConfirmSheet } from '../shared/ui/ConfirmSheet';
import { Screen, ScreenHeader } from '../shared/ui/Screen';
import { LoadingState } from '../shared/ui/StatusViews';
import { colors, fonts, fontSize, spacing } from '../shared/ui/theme';

/**
 * Mi MediPass (ENG-117), sobre el azul noche del canvas: el código para
 * mostrar, lo que ve quien lo escanea y quién está mirando ahora.
 *
 * Es la razón de ser de la app mobile —un QR en una pantalla de escritorio no
 * sirve en una guardia—, así que el código va primero y grande, con el brillo al
 * máximo mientras la pantalla está abierta.
 */
export function MediPassScreen(): React.JSX.Element {
  useFullBrightness();
  const vital = useVitalBlock();
  const accesos = useAccesses();
  const revocar = useRevokeAccess();
  const ahora = useNow(1000);
  const [aRevocar, setARevocar] = useState<MediPassAccess | null>(null);

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
          subtitle="Mostrale este código a un profesional: ve solo lo que figura abajo."
        />
      }
    >
      <MediPassCode />

      <Text style={styles.seccion}>Accediendo ahora</Text>
      {accesos.data ? (
        <AccessList accesses={accesos.data} now={ahora} onRevoke={setARevocar} />
      ) : (
        <View style={styles.cargando}>
          <LoadingState />
        </View>
      )}

      <Text style={styles.seccion}>Lo que ve quien lo escanea</Text>
      {vital.data ? (
        <VitalSummary vital={vital.data} />
      ) : (
        <View style={styles.cargando}>
          <LoadingState />
        </View>
      )}

      <ConfirmSheet
        visible={aRevocar !== null}
        title="¿Revocar el acceso?"
        message={
          aRevocar
            ? `${aRevocar.quien} deja de ver tu MediPass en este momento. Si lo necesita de nuevo, vas a tener que mostrarle el código otra vez.`
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

const styles = StyleSheet.create({
  seccion: {
    marginTop: spacing.lg,
    fontFamily: fonts.display,
    fontSize: fontSize.lg + 3,
    color: colors.white,
  },
  cargando: { minHeight: 120 },
});
