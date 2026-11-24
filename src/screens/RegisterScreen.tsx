import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useRef, useState } from 'react';
import {
  Animated,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type TextInputInstance,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { registerPatient } from '../features/auth/api';
import { PASSWORD_RULES, validateRegister, type RegisterErrors } from '../features/auth/validation';
import { ConsentCheckbox } from '../features/legal/ConsentCheckbox';
import { LEGAL_URL } from '../features/legal/legal';
import type { RootStackParamList } from '../navigation/types';
import { useKeyboardHeight } from '../shared/hooks/use-keyboard-height';
import { ApiError } from '../shared/lib/api-client';
import { Button } from '../shared/ui/Button';
import { Screen, ScreenHeader } from '../shared/ui/Screen';
import { TextField } from '../shared/ui/TextField';
import { colors, fonts, fontSize, radius, spacing } from '../shared/ui/theme';

/**
 * Crear la cuenta de paciente desde la app (ENG-235). Los mismos campos, reglas
 * y mensajes que el registro de paciente de la web, contra la misma ruta.
 *
 * El backend pide confirmar el email: al terminar no hay sesión, se explica que
 * llegó un mail y se vuelve al ingreso con el email ya escrito. El enlace del
 * mail abre la web, que dice que la cuenta quedó confirmada y que se puede
 * ingresar desde la app.
 *
 * La aceptación de los textos legales queda registrada en el alta, así que al
 * primer ingreso no se vuelve a pedir.
 */
export function RegisterScreen(): React.JSX.Element {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList, 'Registro'>>();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [acceptedLegal, setAcceptedLegal] = useState(false);
  const [errores, setErrores] = useState<RegisterErrors>({});
  const [falla, setFalla] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [listo, setListo] = useState(false);
  const passwordRef = useRef<TextInputInstance>(null);
  const confirmacionRef = useRef<TextInputInstance>(null);
  const { margen: margenTeclado, onLayout } = useKeyboardHeight();

  async function crear(): Promise<void> {
    if (enviando) return;
    const input = { email, password, passwordConfirmation, acceptedLegal };
    const encontrados = validateRegister(input);
    setErrores(encontrados);
    setFalla(null);
    if (Object.keys(encontrados).length > 0) return;

    setEnviando(true);
    try {
      await registerPatient(input);
      // Las contraseñas no quedan en memoria mientras se muestra el aviso.
      setPassword('');
      setPasswordConfirmation('');
      setListo(true);
    } catch (err) {
      setFalla(
        err instanceof ApiError ? err.message : 'No pudimos crear tu cuenta. Intentá de nuevo.',
      );
    } finally {
      setEnviando(false);
    }
  }

  async function leerTextos(): Promise<void> {
    try {
      await Linking.openURL(LEGAL_URL);
    } catch {
      setFalla(`No pudimos abrir los textos. Podés leerlos en ${LEGAL_URL}`);
    }
  }

  function irAIngresar(): void {
    navigation.popTo('Ingresar', listo ? { email: email.trim() } : undefined);
  }

  return (
    <Screen
      scroll={false}
      padded={false}
      header={
        <ScreenHeader
          title="Crear cuenta"
          subtitle="Tu cuenta de paciente, gratis."
          onBack={() => navigation.goBack()}
        />
      }
    >
      {/* Como en el ingreso: el formulario sube a la par del teclado (iOS y Android). */}
      <Animated.View onLayout={onLayout} style={[styles.fill, { paddingBottom: margenTeclado }]}>
        <ScrollView
          style={styles.fill}
          contentContainerStyle={[styles.contenido, { paddingBottom: insets.bottom + spacing.xl }]}
          keyboardShouldPersistTaps="handled"
        >
          {listo ? (
            <View accessibilityLiveRegion="polite" style={styles.card}>
              <View style={styles.tilde}>
                <Ionicons name="mail-outline" size={22} color={colors.white} />
              </View>
              <Text accessibilityRole="header" style={styles.listoTitulo}>
                Revisá tu email
              </Text>
              {/* Igual de ambiguo que en la web: decir "ya tenés cuenta" haría
                  de este formulario un detector de usuarios registrados. */}
              <Text style={styles.listoTexto}>
                Si {email.trim()} todavía no estaba registrado, te enviamos un enlace para confirmar
                tu cuenta. Abrilo y después ingresá acá con tu email y tu contraseña.
              </Text>
              <Text style={styles.listoAyuda}>
                ¿No llegó? Mirá en correo no deseado. Si ya tenías cuenta, ingresá directamente.
              </Text>
              <Button label="Ir a ingresar" onPress={irAIngresar} fullWidth />
            </View>
          ) : (
            <>
              <View style={styles.card}>
                {falla ? (
                  <View accessibilityRole="alert" style={styles.banner}>
                    <Ionicons name="alert-circle-outline" size={18} color={colors.danger} />
                    <Text style={styles.bannerTexto}>{falla}</Text>
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

                <View style={styles.conReglas}>
                  <TextField
                    ref={passwordRef}
                    label="Contraseña"
                    password
                    value={password}
                    onChangeText={setPassword}
                    error={errores.password}
                    placeholder="Tu contraseña"
                    autoComplete="new-password"
                    textContentType="newPassword"
                    returnKeyType="next"
                    submitBehavior="submit"
                    onSubmitEditing={() => confirmacionRef.current?.focus()}
                    editable={!enviando}
                  />
                  <ReglasDeContrasena value={password} />
                </View>

                <TextField
                  ref={confirmacionRef}
                  label="Confirmar contraseña"
                  password
                  value={passwordConfirmation}
                  onChangeText={setPasswordConfirmation}
                  error={errores.passwordConfirmation}
                  placeholder="Repetí la contraseña"
                  autoComplete="new-password"
                  textContentType="newPassword"
                  returnKeyType="done"
                  editable={!enviando}
                />

                <ConsentCheckbox
                  checked={acceptedLegal}
                  onChange={setAcceptedLegal}
                  error={errores.acceptedLegal}
                  disabled={enviando}
                />

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

                <Button
                  label={enviando ? 'Creando cuenta…' : 'Crear cuenta'}
                  onPress={() => void crear()}
                  loading={enviando}
                  fullWidth
                />
              </View>

              <Pressable
                accessibilityRole="link"
                hitSlop={spacing.sm}
                onPress={irAIngresar}
                style={styles.pie}
              >
                <Text style={styles.pieTexto}>
                  ¿Ya tenés cuenta? <Text style={styles.pieEnlace}>Ingresá</Text>
                </Text>
              </Pressable>
            </>
          )}
        </ScrollView>
      </Animated.View>
    </Screen>
  );
}

/**
 * Los tres requisitos a la vista, tildándose mientras se escribe: si no,
 * aparecerían de a uno al enviar. En vacío van en gris, no en rojo: todavía no
 * hay error.
 */
function ReglasDeContrasena({ value }: { value: string }): React.JSX.Element {
  return (
    <View style={styles.reglas}>
      {PASSWORD_RULES.map((regla) => {
        const ok = regla.cumple(value);
        return (
          <View
            key={regla.texto}
            style={styles.regla}
            accessible
            accessibilityLabel={`${regla.texto}${ok ? ' (cumplido)' : ' (falta)'}`}
          >
            <Ionicons
              name={ok ? 'checkmark-circle' : 'ellipse-outline'}
              size={14}
              color={ok ? colors.brandHover : colors.muted}
            />
            <Text style={[styles.reglaTexto, ok && styles.reglaCumplida]}>{regla.texto}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  contenido: { flexGrow: 1, padding: spacing.lg, gap: spacing.lg },
  card: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.card + 2,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  // Los colores del aviso de error del ingreso.
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: radius.field,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.dangerTint,
    borderColor: colors.dangerBorder,
  },
  bannerTexto: {
    flex: 1,
    fontFamily: fonts.semibold,
    fontSize: fontSize.sm,
    lineHeight: 18,
    color: colors.danger,
  },
  conReglas: { gap: spacing.sm },
  reglas: { gap: spacing.xs },
  regla: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  reglaTexto: { fontFamily: fonts.medium, fontSize: fontSize.chip, color: colors.muted },
  reglaCumplida: { fontFamily: fonts.semibold, color: colors.brandHover },
  enlace: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, alignSelf: 'flex-start' },
  enlaceTexto: {
    fontFamily: fonts.bold,
    fontSize: fontSize.sm,
    color: colors.brandHover,
    textDecorationLine: 'underline',
  },
  pie: { alignSelf: 'center', paddingVertical: spacing.xs },
  pieTexto: { fontFamily: fonts.medium, fontSize: fontSize.sm, color: colors.muted },
  pieEnlace: { fontFamily: fonts.bold, color: colors.brandHover },
  // El tilde de la web va en azul profundo: blanco sobre el teal no llega a AA.
  tilde: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brandDeep,
  },
  listoTitulo: {
    fontFamily: fonts.display,
    fontSize: fontSize.xl,
    color: colors.brandDeep,
  },
  listoTexto: {
    fontFamily: fonts.regular,
    fontSize: fontSize.md,
    lineHeight: 22,
    color: colors.ink,
  },
  listoAyuda: {
    fontFamily: fonts.medium,
    fontSize: fontSize.sm,
    lineHeight: 19,
    color: colors.muted,
  },
});
