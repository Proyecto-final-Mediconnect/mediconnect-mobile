import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { useSession } from '../features/auth/session';
import { LEGAL_URL } from '../features/legal/legal';
import { ApiError } from '../shared/lib/api-client';
import { Button } from '../shared/ui/Button';
import { Screen, ScreenHeader } from '../shared/ui/Screen';
import { colors, fonts, fontSize, radius, spacing } from '../shared/ui/theme';

/** Lo que acepta, en corto. El texto completo está en la web. */
const PUNTOS = [
  'Los términos y condiciones de MediConnect.',
  'La política de privacidad: qué datos guardamos, para qué y quién los ve.',
  'Tu consentimiento para que tratemos tus datos de salud, que son datos sensibles (Ley 25.326).',
];

/**
 * Pedido de consentimiento (ENG-140). Aparece después de ingresar cuando el
 * paciente no aceptó la versión vigente de los textos legales —por ejemplo,
 * porque cambiaron—, y hasta que acepte la app no muestra nada más: el backend
 * le respondería 403 a todo. Es el equivalente del `LegalAcceptanceGate` de la
 * web.
 *
 * La casilla arranca sin tildar: el consentimiento tiene que ser expreso. La
 * única salida además de aceptar es cerrar la sesión.
 */
export function LegalConsentScreen(): React.JSX.Element {
  const { acceptLegal, signOut } = useSession();
  const [tildado, setTildado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [falla, setFalla] = useState<string | null>(null);

  async function leerTextos(): Promise<void> {
    try {
      await Linking.openURL(LEGAL_URL);
    } catch {
      // Sin navegador o con la URL mal configurada: que no sea un toque que no
      // hace nada, justo en el consentimiento informado.
      setFalla(`No pudimos abrir los textos. Podés leerlos en ${LEGAL_URL}`);
    }
  }

  async function aceptar(): Promise<void> {
    if (!tildado || enviando) return;
    setEnviando(true);
    setFalla(null);
    try {
      await acceptLegal();
      // Con la aceptación el navegador cambia a la app y esta pantalla se desmonta.
    } catch (err) {
      setFalla(
        err instanceof ApiError
          ? err.message
          : 'No pudimos registrar tu aceptación. Intentá de nuevo.',
      );
      setEnviando(false);
    }
  }

  return (
    <Screen
      header={
        <ScreenHeader
          title="Necesitamos tu consentimiento"
          subtitle="Antes de seguir, leé y aceptá cómo cuidamos tus datos."
        />
      }
    >
      <View style={styles.card}>
        <Text style={styles.intro}>Para usar MediConnect tenés que aceptar:</Text>
        <View style={styles.lista}>
          {PUNTOS.map((punto) => (
            <View key={punto} style={styles.item}>
              <Ionicons name="checkmark" size={16} color={colors.brandHover} />
              <Text style={styles.itemTexto}>{punto}</Text>
            </View>
          ))}
        </View>

        <Pressable
          accessibilityRole="link"
          accessibilityLabel="Leer los textos completos"
          onPress={() => void leerTextos()}
          hitSlop={spacing.sm}
          style={styles.enlace}
        >
          <Text style={styles.enlaceTexto}>Leer los textos completos</Text>
          <Ionicons name="open-outline" size={15} color={colors.brandHover} />
        </Pressable>
      </View>

      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: tildado }}
        aria-checked={tildado}
        accessibilityLabel="Leí y acepto los términos y condiciones, la política de privacidad y el tratamiento de mis datos de salud."
        onPress={() => setTildado((v) => !v)}
        style={styles.casilla}
      >
        <View style={[styles.caja, tildado && styles.cajaTildada]}>
          {tildado ? <Ionicons name="checkmark" size={16} color={colors.white} /> : null}
        </View>
        <Text style={styles.casillaTexto}>
          Leí y acepto los términos y condiciones, la política de privacidad y el tratamiento de mis
          datos de salud.
        </Text>
      </Pressable>

      {falla ? (
        <Text accessibilityRole="alert" style={styles.falla}>
          {falla}
        </Text>
      ) : null}

      <View style={styles.acciones}>
        <Button
          label="Aceptar y continuar"
          onPress={() => void aceptar()}
          disabled={!tildado}
          loading={enviando}
          fullWidth
        />
        <Button label="Cerrar sesión" variant="ghost" onPress={() => void signOut()} fullWidth />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.card + 2,
    padding: spacing.lg,
    gap: spacing.md,
  },
  intro: { fontFamily: fonts.semibold, fontSize: fontSize.md, color: colors.brandDeep },
  lista: { gap: spacing.sm },
  item: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  itemTexto: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: fontSize.sm,
    lineHeight: 19,
    color: colors.ink,
  },
  enlace: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, alignSelf: 'flex-start' },
  enlaceTexto: {
    fontFamily: fonts.bold,
    fontSize: fontSize.sm,
    color: colors.brandHover,
    textDecorationLine: 'underline',
  },
  casilla: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    backgroundColor: colors.surfaceTeal,
    borderRadius: radius.field,
    padding: spacing.lg,
  },
  caja: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.lineStrong,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cajaTildada: { backgroundColor: colors.brandDeep, borderColor: colors.brandDeep },
  casillaTexto: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: fontSize.sm,
    lineHeight: 19,
    color: colors.ink,
  },
  falla: { fontFamily: fonts.semibold, fontSize: fontSize.sm, color: colors.danger },
  acciones: { gap: spacing.sm },
});
