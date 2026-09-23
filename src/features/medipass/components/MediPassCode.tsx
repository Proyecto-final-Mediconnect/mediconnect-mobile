import { useEffect, useRef, useState } from 'react';
import { AppState, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { codigoDeVentana } from '../../../mocks/medipass';
import { useNow } from '../../../shared/hooks/use-now';
import { Button } from '../../../shared/ui/Button';
import { colors, fonts, fontSize, radius, spacing } from '../../../shared/ui/theme';
import { cuentaRegresiva, msHastaRotacion, ROTACION_MS } from '../lib/medipass';

/**
 * El código del MediPass: QR grande sobre blanco, el código en texto y cuánto
 * falta para que rote (ENG-72).
 *
 * **Si la app pasa a segundo plano, el código se oculta** y hay que pedir verlo
 * de nuevo (ENG-117). Un teléfono que queda desbloqueado sobre una mesa no tiene
 * que seguir mostrando una llave a la historia clínica.
 *
 * El QR va sobre blanco puro y con margen: es lo que necesita otro teléfono para
 * leerlo con la luz de una guardia.
 */
export function MediPassCode(): React.JSX.Element {
  const ahora = useNow(1000);
  const [visible, setVisible] = useState(true);
  const estadoPrevio = useRef(AppState.currentState);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (siguiente) => {
      if (estadoPrevio.current === 'active' && siguiente !== 'active') setVisible(false);
      estadoPrevio.current = siguiente;
    });
    return () => sub.remove();
  }, []);

  const codigo = codigoDeVentana(ahora);
  const restante = msHastaRotacion(ahora);

  return (
    <View style={styles.card}>
      {visible ? (
        <>
          <View accessibilityRole="image" accessibilityLabel={`Código QR del MediPass ${codigo}`}>
            <QRCode
              value={codigo}
              size={208}
              color={colors.night}
              backgroundColor={colors.white}
              quietZone={8}
            />
          </View>
          <Text selectable style={styles.codigo}>
            {codigo}
          </Text>
          <View style={styles.barra}>
            <View style={[styles.relleno, { width: `${(restante / ROTACION_MS) * 100}%` }]} />
          </View>
          <Text style={styles.cuenta}>Se renueva en {cuentaRegresiva(restante)}</Text>
        </>
      ) : (
        <View style={styles.oculto}>
          <Text style={styles.ocultoTitulo}>Código oculto</Text>
          <Text style={styles.ocultoTexto}>
            Lo ocultamos cuando saliste de la app, para que nadie lo vea sin que estés mirando.
          </Text>
          <Button label="Mostrar código" variant="accent" onPress={() => setVisible(true)} />
        </View>
      )}
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
