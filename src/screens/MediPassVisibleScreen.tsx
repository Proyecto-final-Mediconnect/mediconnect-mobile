import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { VitalSummary } from '../features/medipass/components/VitalSummary';
import { useSaveScope, useScope, useVitalBlock } from '../features/medipass/hooks/use-medipass';
import { vitalVacio } from '../features/medipass/lib/medipass';
import { Button } from '../shared/ui/Button';
import { Screen, ScreenHeader } from '../shared/ui/Screen';
import { ErrorState, LoadingState } from '../shared/ui/StatusViews';
import { colors, fonts, fontSize, spacing } from '../shared/ui/theme';

/**
 * Lo que ve quien escanea el MediPass (ENG-103, ENG-149): los datos vitales con
 * un interruptor por bloque, y el acceso a editarlos. Se abre desde el MediPass.
 */
export function MediPassVisibleScreen(): React.JSX.Element {
  const navigation = useNavigation();
  const scope = useScope();
  const guardarScope = useSaveScope();
  const vital = useVitalBlock();

  // Al volver de editar los datos, que se vea lo recién guardado.
  const { refetch: refetchVital } = vital;
  useFocusEffect(
    useCallback(() => {
      void refetchVital();
    }, [refetchVital]),
  );

  return (
    <Screen
      tone="dark"
      header={
        <ScreenHeader
          tone="dark"
          title="Lo que ve quien lo escanea"
          onBack={() => navigation.goBack()}
        />
      }
    >
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
    </Screen>
  );
}

const styles = StyleSheet.create({
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
