// Imágenes importadas como módulo: Metro las resuelve a un `ImageSource` y
// Vitest (Vite) a la URL del archivo, que `<Image>` de react-native-web acepta.
declare module '*.png' {
  const source: import('react-native').ImageSourcePropType;
  export default source;
}
