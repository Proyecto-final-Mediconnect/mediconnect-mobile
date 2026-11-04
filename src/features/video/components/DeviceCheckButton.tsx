import { useMutation } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ApiError } from '../../../shared/lib/api-client';
import { Button } from '../../../shared/ui/Button';
import { colors, fonts, fontSize, spacing } from '../../../shared/ui/theme';
import { createTestRoom } from '../api';
import { openRoom } from '../hooks/use-join-consultation';

/** Entre dos pedidos de sala pasan al menos estos ms: cada toque pedido de más se factura. */
const COOLDOWN_MS = 10_000;

/** Un 5xx trae texto de infraestructura del backend: al paciente se le muestra esto. */
const MENSAJE_SERVIDOR = 'No pudimos preparar la prueba. Intentá de nuevo.';

function mensajeDe(error: Error): string {
  return error instanceof ApiError && error.status >= 500 ? MENSAJE_SERVIDOR : error.message;
}

/**
 * "Probar cámara y micrófono": abre una sala de Daily para una sola persona, en
 * cualquier momento y sin turno, en el mismo navegador dentro de la app que usa
 * la consulta.
 *
 * Así el paciente acepta los permisos y se ve en la cámara con tiempo, y no con
 * el profesional del otro lado esperando. La pantalla previa de Daily muestra la
 * cámara, deja elegir el micrófono y mide el volumen.
 *
 * La sala se pide recién al tocar el botón —cada una es una llamada a un
 * proveedor que factura— y la URL no queda en la caché (`gcTime: 0`): lleva el
 * token adentro.
 */
export function DeviceCheckButton(): React.JSX.Element {
  const [errorApertura, setErrorApertura] = useState<string | null>(null);
  const crear = useMutation({ mutationFn: createTestRoom, gcTime: 0 });
  const ultimoPedido = useRef<number | null>(null);

  function probar(): void {
    const ahora = Date.now();
    if (ultimoPedido.current !== null && ahora - ultimoPedido.current < COOLDOWN_MS) return;
    ultimoPedido.current = ahora;

    setErrorApertura(null);
    crear.mutate(undefined, {
      onSuccess: (sala) => {
        openRoom({ roomUrl: sala.url }).catch(() =>
          setErrorApertura('No pudimos abrir el navegador. Probá de nuevo.'),
        );
      },
    });
  }

  const error = crear.isError ? mensajeDe(crear.error) : errorApertura;

  return (
    <View style={styles.contenedor}>
      <Button
        label="Probar cámara y micrófono"
        variant="secondary"
        onPress={probar}
        loading={crear.isPending}
        fullWidth
      />
      {error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      ) : (
        <Text style={styles.ayuda}>Una sala solo para vos, para revisar que todo ande.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { gap: spacing.xs },
  ayuda: {
    fontFamily: fonts.medium,
    fontSize: fontSize.xs,
    color: colors.muted,
    textAlign: 'center',
  },
  error: {
    fontFamily: fonts.semibold,
    fontSize: fontSize.sm,
    color: colors.danger,
    textAlign: 'center',
  },
});
