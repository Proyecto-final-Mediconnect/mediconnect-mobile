import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AppState, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { useNow } from '../../../shared/hooks/use-now';
import { WEB_URL } from '../../../shared/lib/web-url';
import { Button } from '../../../shared/ui/Button';
import { ErrorState, LoadingState } from '../../../shared/ui/StatusViews';
import { colors, fonts, fontSize, radius, spacing } from '../../../shared/ui/theme';
import { CODIGO_KEY, useMyMediPassCode } from '../hooks/use-medipass';
import { cuentaRegresiva, emergencyUrl, formatCodigo, msHasta, ROTACION_MS } from '../lib/medipass';

/**
 * El código del MediPass: QR grande sobre blanco, el código en texto y cuánto
 * falta para que rote (ENG-72). El código lo emite el backend; el QR lleva la
 * ficha de emergencia de la web, así que lo abre cualquier cámara.
 *
 * **Si la app pasa a segundo plano, el código se oculta y se descarta**
 * (ENG-117): un teléfono que queda desbloqueado sobre una mesa no tiene que
 * seguir mostrando una llave a la historia clínica, y el código no se guarda en
 * ningún lado. Al tocar "Mostrar código" se pide de nuevo.
 *
 * El QR va sobre blanco puro y con margen: es lo que necesita otro teléfono para
 * leerlo con la luz de una guardia.
 */
export function MediPassCode(): React.JSX.Element {
  const queryClient = useQueryClient();
  const ahora = useNow(1000);
  const [visible, setVisible] = useState(true);
  const estadoPrevio = useRef(AppState.currentState);
  const codigo = useMyMediPassCode(visible);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (siguiente) => {
      if (estadoPrevio.current === 'active' && siguiente !== 'active') {
        setVisible(false);
        queryClient.removeQueries({ queryKey: CODIGO_KEY });
      }
      estadoPrevio.current = siguiente;
    });
    return () => sub.remove();
  }, [queryClient]);

  const valor = codigo.data?.codigo;
  // La cuenta regresiva re-renderiza cada segundo, pero el código cambia cada
  // cinco minutos: el QR (recalcular la matriz y el SVG) solo cuando cambia.
  const qr = useMemo(
    () =>
      valor ? (
        <QRCode
          value={emergencyUrl(WEB_URL, valor)}
          size={208}
          color={colors.night}
          backgroundColor={colors.white}
          quietZone={8}
        />
      ) : null,
    [valor],
  );

  if (!visible) {
    return (
      <View style={styles.card}>
        <View style={styles.oculto}>
          <Text style={styles.ocultoTitulo}>Código oculto</Text>
          <Text style={styles.ocultoTexto}>
            Lo ocultamos cuando saliste de la app, para que nadie lo vea sin que estés mirando.
          </Text>
          <Button label="Mostrar código" variant="accent" onPress={() => setVisible(true)} />
        </View>
      </View>
    );
  }

  if (codigo.isError && !codigo.data) {
    return (
      <View style={styles.card}>
        <View style={styles.oculto}>
          <ErrorState message={codigo.error.message} onRetry={() => void codigo.refetch()} />
        </View>
      </View>
    );
  }

  if (!codigo.data) {
    return (
      <View style={styles.card}>
        <View style={styles.oculto}>
          <LoadingState label="Generando tu código…" />
        </View>
      </View>
    );
  }

  const restante = msHasta(codigo.data.expiraEl, ahora);
  const texto = formatCodigo(codigo.data.codigo);

  return (
    <View style={styles.card}>
      <View accessibilityRole="image" accessibilityLabel={`Código QR del MediPass ${texto}`}>
        {qr}
      </View>
      <Text selectable style={styles.codigo}>
        {texto}
      </Text>
      <View style={styles.barra}>
        <View
          style={[styles.relleno, { width: `${Math.min(100, (restante / ROTACION_MS) * 100)}%` }]}
        />
      </View>
      <Text style={styles.cuenta}>
        {restante > 0 ? `Se renueva en ${cuentaRegresiva(restante)}` : 'Renovando el código…'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.card + 6,
    padding: spacing.xl,
    gap: spacing.md,
  },
  codigo: {
    fontFamily: fonts.bold,
    fontSize: fontSize.md,
    letterSpacing: 1.5,
    color: colors.brandDeep,
  },
  barra: {
    alignSelf: 'stretch',
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.lineSoft,
    overflow: 'hidden',
  },
  relleno: { height: 4, backgroundColor: colors.brand },
  cuenta: { fontFamily: fonts.semibold, fontSize: fontSize.xs, color: colors.muted },
  oculto: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xl, minHeight: 208 },
  ocultoTitulo: { fontFamily: fonts.display, fontSize: fontSize.xl, color: colors.brandDeep },
  ocultoTexto: {
    fontFamily: fonts.medium,
    fontSize: fontSize.sm,
    lineHeight: 19,
    color: colors.muted,
    textAlign: 'center',
  },
});
