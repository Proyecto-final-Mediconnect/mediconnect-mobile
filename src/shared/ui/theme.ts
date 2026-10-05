/**
 * Tokens de marca, portados de `mediconnect-web/src/index.css` (`@theme`).
 *
 * Son los mismos valores y los mismos nombres —en camelCase— para que quien
 * toque las dos apps no tenga que traducir: `brand-deep` en la web es
 * `colors.brandDeep` acá. La pantalla de referencia es la sección "App
 * paciente" del canvas de diseño.
 */
export const colors = {
  /** Teal del logo. CTA sobre fondo oscuro; sobre blanco no alcanza para texto. */
  brand: '#14b8a6',
  /** Teal oscuro. El texto teal sobre blanco (5:1). */
  brandHover: '#0e7c7b',
  /** Azul-teal profundo. Títulos y botón primario, igual que en la web. */
  brandDeep: '#0b4f6c',
  /** Teal claro, para acentos sobre fondo oscuro. */
  brandBright: '#2ec4b6',
  ink: '#1e293b',
  /** Texto sobre los botones teal: negro puro sobre #14b8a6 vibra. */
  inkDeep: '#04252f',
  muted: '#64748b',
  mutedSoft: '#94a3b8',
  surface: '#f4f8fa',
  surfaceTeal: '#eef6f5',
  danger: '#d64562',
  /** Fondo de las superficies oscuras: el saludo del inicio y el MediPass. */
  night: '#072d3d',
  /** Texto sobre `night`: párrafos y, un escalón más tenue, subtítulos. */
  onNight: '#a9c6d2',
  onNightSoft: '#7fa8b8',
  /** `line` separa secciones; `lineStrong` marca inputs. */
  line: '#e3ebee',
  lineSoft: '#eef3f5',
  lineStrong: '#cfdde3',
  /** El par de aviso del canvas ("A confirmar"): fondo y texto. */
  warm: '#fbf1e6',
  warmInk: '#a86524',
  white: '#ffffff',
} as const;

/**
 * Familias de la web: Newsreader para los títulos y Manrope para el resto.
 *
 * En React Native cada peso es una familia aparte, y se elige por el nombre y
 * no con `fontWeight` —en Android, combinar las dos cosas hace que el sistema
 * ignore la fuente cargada—. `App.tsx` las carga antes del primer render.
 */
export const fonts = {
  display: 'Newsreader_400Regular',
  regular: 'Manrope_400Regular',
  medium: 'Manrope_500Medium',
  semibold: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

/** Los radios del canvas: botón 9, campo 10, tarjeta 12. */
export const radius = {
  button: 9,
  field: 10,
  card: 12,
} as const;

/**
 * El canvas dibuja el teléfono a 288px de ancho, unas tres cuartas partes de un
 * teléfono real: la escala sube los tamaños en esa proporción, redondeados.
 */
export const fontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 26,
  xxl: 30,
} as const;
