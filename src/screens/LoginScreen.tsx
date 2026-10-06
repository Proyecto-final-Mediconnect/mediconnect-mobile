import { Ionicons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type TextInput,
} from 'react-native';

import { NotPatientError, useSession } from '../features/auth/session';
import { validateLogin, type LoginErrors } from '../features/auth/validation';
import { ApiError } from '../shared/lib/api-client';
import { Button } from '../shared/ui/Button';
import { ScreenHeader } from '../shared/ui/Screen';
import { TextField } from '../shared/ui/TextField';
import { colors, fonts, fontSize, radius, spacing } from '../shared/ui/theme';

/** Cuánto se monta la tarjeta sobre la franja oscura: lo mismo que en el inicio. */
const SOLAPE = 44;

/**
 * Ingreso del paciente (ENG-114). Misma composición que el inicio: la franja
 * oscura arriba y el formulario en una tarjeta montada encima.
 *
 * Los errores del backend se muestran tal cual llegan: ya son genéricos a
 * propósito —"Email o contraseña incorrectos." tanto si la cuenta no existe
 * como si el email no está confirmado— para no revelar qué cuentas existen.
 */
export function LoginScreen(): React.JSX.Element {
  const { state, signIn } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errores, setErrores] = useState<LoginErrors>({});
  const [falla, setFalla] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const passwordRef = useRef<TextInput>(null);

  const aviso = state.status === 'signedOut' ? state.notice : undefined;

  async function ingresar(): Promise<void> {
    if (enviando) return;
    const input = { email, password };
    const encontrados = validateLogin(input);
    setErrores(encontrados);
    setFalla(null);
    if (Object.keys(encontrados).length > 0) return;

    setEnviando(true);
    try {
      await signIn(input);
      // Con la sesión iniciada el navegador cambia a la app y esta pantalla se
      // desmonta: no hay nada más que hacer acá.
    } catch (err) {
      setFalla(mensajeDe(err));
      setEnviando(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.fill}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.fill}
        contentContainerStyle={styles.crece}
        // Sin esto, con el teclado abierto el primer toque en "Ingresar" solo
        // cierra el teclado y hay que tocar dos veces.
        keyboardShouldPersistTaps="handled"
      >
        <ScreenHeader
          hero
          tone="dark"
          title="Ingresá a MediConnect"
          subtitle="Tus turnos, tu historia clínica y tu MediPass, en un solo lugar."
        />

        <View style={styles.contenido}>
          <View style={styles.card}>
            {aviso && !falla ? (
              <View style={[styles.banner, styles.bannerInfo]}>
                <Ionicons name="time-outline" size={18} color={colors.brandHover} />
                <Text style={[styles.bannerTexto, styles.bannerInfoTexto]}>{aviso}</Text>
              </View>
            ) : null}

            {falla ? (
              <View accessibilityRole="alert" style={[styles.banner, styles.bannerError]}>
                <Ionicons name="alert-circle-outline" size={18} color={colors.danger} />
                <Text style={[styles.bannerTexto, styles.bannerErrorTexto]}>{falla}</Text>
              </View>
            ) : null}

            <TextField
              label="Email"
              value={email}
              onChangeText={setEmail}
              error={errores.email}
              placeholder="tu@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="username"
              returnKeyType="next"
              submitBehavior="submit"
              onSubmitEditing={() => passwordRef.current?.focus()}
              editable={!enviando}
            />

            <TextField
              ref={passwordRef}
              label="Contraseña"
              password
              value={password}
              onChangeText={setPassword}
              error={errores.password}
              autoComplete="current-password"
              textContentType="password"
              returnKeyType="go"
              onSubmitEditing={() => void ingresar()}
              editable={!enviando}
            />

            <Button label="Ingresar" onPress={() => void ingresar()} loading={enviando} fullWidth />
          </View>

          <Text style={styles.pie}>
            ¿Todavía no tenés cuenta? Registrate desde la web de MediConnect y volvé a ingresar acá.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function mensajeDe(err: unknown): string {
  if (err instanceof NotPatientError || err instanceof ApiError) return err.message;
  return 'No se pudo iniciar sesión. Intentá de nuevo.';
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.surface },
  crece: { flexGrow: 1 },
  contenido: { padding: spacing.lg, gap: spacing.lg, marginTop: -SOLAPE },
  card: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.card + 2,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  // Mismas medidas que el `Notice` de la app y los colores del aviso de error
  // de la web (`border-danger/30 bg-danger/5`).
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: radius.field,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  bannerInfo: { backgroundColor: colors.surfaceTeal, borderColor: colors.line },
  bannerError: {
    backgroundColor: 'rgba(214, 69, 98, 0.05)',
    borderColor: 'rgba(214, 69, 98, 0.3)',
  },
  bannerTexto: { flex: 1, fontFamily: fonts.semibold, fontSize: fontSize.sm, lineHeight: 18 },
  bannerInfoTexto: { color: colors.brandDeep },
  bannerErrorTexto: { color: colors.danger },
  pie: {
    fontFamily: fonts.medium,
    fontSize: fontSize.sm,
    lineHeight: 19,
    color: colors.muted,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
});
