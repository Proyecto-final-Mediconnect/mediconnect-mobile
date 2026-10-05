import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fonts, fontSize, spacing } from './theme';

/**
 * Las dos superficies del canvas: `light` es el fondo gris claro con header
 * blanco (Mis turnos), `dark` es el azul noche (el saludo del inicio, el
 * MediPass).
 */
type Tone = 'light' | 'dark';

/** Cuánto se monta el contenido sobre un `hero`. */
const HERO_OVERLAP = 44;

interface ScreenProps {
  children: ReactNode;
  /** Va arriba, fuera del scroll. Sin header, la pantalla respeta sola el área segura. */
  header?: ReactNode;
  /**
   * Header que scrollea con el contenido, y el contenido se monta sobre su borde
   * de abajo: la franja oscura del inicio con la tarjeta de la próxima consulta
   * encima. Va con un `ScreenHeader hero`.
   */
  hero?: ReactNode;
  tone?: Tone;
  /**
   * `false` para pantallas que manejan su propio scroll (una `FlatList`) o que
   * centran un único estado —carga, error, vacío— en el alto disponible.
   */
  scroll?: boolean;
}

/**
 * Contenedor de cada pantalla. Los navegadores no dibujan header: lo pone cada
 * pantalla con `ScreenHeader`, porque en el canvas cambia de una a otra —el
 * inicio es oscuro y con saludo, turnos es blanco con título—.
 */
export function Screen({
  children,
  header,
  hero,
  tone = 'light',
  scroll = true,
}: ScreenProps): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const fondo = tone === 'dark' ? styles.dark : styles.light;
  const cuerpo = (
    <View
      style={[
        styles.contenido,
        !!hero && styles.sobreHero,
        !header && !hero && { paddingTop: insets.top + spacing.lg },
      ]}
    >
      {children}
    </View>
  );

  return (
    <View style={[styles.fill, fondo]}>
      {header ?? (hero ? null : <BarraDeEstado tone={tone} />)}
      {scroll ? (
        <ScrollView style={styles.fill} contentContainerStyle={styles.crece}>
          {hero}
          {cuerpo}
        </ScrollView>
      ) : (
        <View style={styles.fill}>
          {hero}
          {cuerpo}
        </View>
      )}
    </View>
  );
}

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  tone?: Tone;
  /** Muestra "Volver". Solo para pantallas apiladas, no para las tabs. */
  onBack?: () => void;
  /** Deja lugar abajo para que el contenido se monte encima (ver `Screen.hero`). */
  hero?: boolean;
  /** Lo que va debajo del título, dentro del header: un selector, por ejemplo. */
  children?: ReactNode;
}

/**
 * El encabezado de las pantallas del canvas. El claro lleva el título en
 * Newsreader sobre blanco con un borde abajo; el oscuro es la franja del inicio,
 * con el título más grande y un subtítulo tenue.
 */
export function ScreenHeader({
  title,
  subtitle,
  tone = 'light',
  onBack,
  hero = false,
  children,
}: ScreenHeaderProps): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const oscuro = tone === 'dark';

  return (
    <View
      style={[
        styles.header,
        oscuro ? styles.headerDark : styles.headerLight,
        { paddingTop: insets.top + spacing.lg },
        hero && { paddingBottom: spacing.xl + HERO_OVERLAP },
      ]}
    >
      <BarraDeEstado tone={tone} />
      {onBack ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Volver"
          hitSlop={spacing.sm}
          onPress={onBack}
          style={styles.volver}
        >
          <Ionicons
            name="chevron-back"
            size={18}
            color={oscuro ? colors.onNight : colors.brandHover}
          />
          <Text style={[styles.volverTexto, oscuro && { color: colors.onNight }]}>Volver</Text>
        </Pressable>
      ) : null}
      <Text accessibilityRole="header" style={[styles.titulo, oscuro && styles.tituloDark]}>
        {title}
      </Text>
      {subtitle ? (
        <Text style={[styles.subtitulo, oscuro && styles.subtituloDark]}>{subtitle}</Text>
      ) : null}
      {children}
    </View>
  );
}

/**
 * La barra de estado del sistema sigue a la pantalla: letras blancas sobre el
 * azul noche, oscuras sobre blanco. Solo la pone la pantalla enfocada: las tabs
 * quedan montadas al cambiar de una a otra, y sin esto la última en montarse
 * decidiría el color para todas.
 */
function BarraDeEstado({ tone }: { tone: Tone }): React.JSX.Element | null {
  const enfocada = useIsFocused();
  if (!enfocada) return null;
  return <StatusBar style={tone === 'dark' ? 'light' : 'dark'} />;
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  light: { backgroundColor: colors.surface },
  dark: { backgroundColor: colors.night },
  crece: { flexGrow: 1 },
  contenido: { flexGrow: 1, padding: spacing.lg, gap: spacing.md },
  sobreHero: { marginTop: -HERO_OVERLAP },
  header: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xl },
  headerLight: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    paddingBottom: spacing.lg,
  },
  headerDark: { backgroundColor: colors.night },
  volver: { flexDirection: 'row', alignItems: 'center', gap: 2, marginBottom: spacing.sm },
  volverTexto: { fontFamily: fonts.semibold, fontSize: fontSize.md, color: colors.brandHover },
  titulo: { fontFamily: fonts.display, fontSize: fontSize.xl, color: colors.brandDeep },
  tituloDark: { fontSize: fontSize.xxl, color: colors.white },
  subtitulo: {
    marginTop: spacing.xs,
    fontFamily: fonts.medium,
    fontSize: fontSize.sm,
    color: colors.muted,
  },
  subtituloDark: { color: colors.onNightSoft },
});
