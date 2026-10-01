import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useRef, useState, type ComponentProps } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Polyline } from 'react-native-svg';

import logo from '../../assets/brand/logo-horizontal-light.png';
import { NotPatientError, useSession } from '../features/auth/session';
import { validateLogin, type LoginErrors } from '../features/auth/validation';
import { ApiError } from '../shared/lib/api-client';
import { Button } from '../shared/ui/Button';
import { Desborde } from '../shared/ui/Screen';
import { TextField } from '../shared/ui/TextField';
import { colors, fonts, fontSize, radius, spacing } from '../shared/ui/theme';

/** Cuánto se monta la tarjeta sobre la franja oscura: lo mismo que en el inicio. */
const SOLAPE = 44;

/** Proporción del logo horizontal (1884 × 240): se fija el alto y el ancho sale solo. */
const LOGO_ALTO = 28;
const LOGO_ANCHO = (LOGO_ALTO * 1884) / 240;

/** Lo que el paciente encuentra adentro: es lo que hace que valga la pena ingresar. */
const LO_QUE_HAY: { icono: ComponentProps<typeof Ionicons>['name']; texto: string }[] = [
  { icono: 'videocam-outline', texto: 'Tus turnos y la sala de cada consulta' },
  { icono: 'document-text-outline', texto: 'Tu historia clínica, completa' },
  { icono: 'qr-code-outline', texto: 'Tu MediPass para una emergencia' },
];

/**
 * Ingreso del paciente (ENG-114). Misma composición que el inicio: la franja
 * oscura arriba y el formulario en una tarjeta montada encima.
 *
 * La franja crece hasta ocupar lo que el formulario no usa, así el ingreso no
 * deja media pantalla vacía en un teléfono alto; con el teclado abierto se
 * achica y el formulario queda a la vista. Lleva el logo real —el mismo archivo
 * que la web, no una recreación con tipografía— y lo que hay adentro de la app.
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
  const insets = useSafeAreaInsets();

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
        <StatusBar style="light" />
        <Desborde color={colors.night} />
        <View style={[styles.franja, { paddingTop: insets.top + spacing.lg }]}>
          <Image
            source={logo}
            style={styles.logo}
            accessibilityLabel="MediConnect"
            resizeMode="contain"
          />

          {/* El trazo del corazón del logo, estirado: llena el aire entre el logo y
              el título sin competir con ninguno de los dos. */}
          <View
            style={styles.pulso}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            <Svg width="100%" height={56} viewBox="0 0 320 56" preserveAspectRatio="none">
              <Polyline
                points="0,30 120,30 132,30 142,8 156,50 166,22 174,30 320,30"
                fill="none"
                stroke={colors.brandBright}
                strokeOpacity={0.35}
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </View>

          <View style={styles.bienvenida}>
            <Text accessibilityRole="header" style={styles.titulo}>
              Ingresá a tu cuenta
            </Text>
            <Text style={styles.subtitulo}>Todo lo de tu salud, en un solo lugar.</Text>

            <View style={styles.lista}>
              {LO_QUE_HAY.map(({ icono, texto }) => (
                <View key={texto} style={styles.item}>
                  <View style={styles.itemIcono}>
                    <Ionicons name={icono} size={16} color={colors.brandBright} />
                  </View>
                  <Text style={styles.itemTexto}>{texto}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

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

          <Text style={[styles.pie, { paddingBottom: insets.bottom }]}>
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
  // `flex: 1` dentro de un contenido con `flexGrow: 1`: se queda con el alto que
  // sobra y el formulario baja hasta el pie de la pantalla.
  franja: {
    flex: 1,
    backgroundColor: colors.night,
    paddingHorizontal: spacing.xl,
    paddingBottom: SOLAPE + spacing.xl,
    justifyContent: 'space-between',
    gap: spacing.xl,
  },
  logo: { width: LOGO_ANCHO, height: LOGO_ALTO, maxWidth: '70%' },
  pulso: { flexGrow: 1, justifyContent: 'center', minHeight: 56 },
  bienvenida: { gap: spacing.sm },
  titulo: {
    fontFamily: fonts.display,
    fontSize: 34,
    lineHeight: 40,
    color: colors.white,
  },
  subtitulo: {
    fontFamily: fonts.medium,
    fontSize: fontSize.md,
    lineHeight: 21,
    color: colors.onNightSoft,
  },
  lista: { marginTop: spacing.lg, gap: spacing.md },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  itemIcono: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(46, 196, 182, 0.14)',
  },
  itemTexto: { flex: 1, fontFamily: fonts.semibold, fontSize: fontSize.sm, color: colors.onNight },
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
