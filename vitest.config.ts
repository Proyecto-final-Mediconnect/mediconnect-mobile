import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

const stub = (archivo: string): string =>
  fileURLToPath(new URL(`./test-stubs/${archivo}`, import.meta.url));

// Sprint 0 §3.4.10 / Plan de Testing: el runner de mobile es Vitest + React
// Testing Library (NO Jest). Los componentes React Native se renderizan en jsdom
// mapeando `react-native` -> `react-native-web`, el target web oficial de Expo.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      { find: /^react-native$/, replacement: 'react-native-web' },
      // Paquetes con código nativo que publican fuente sin transpilar (Flow) o
      // que cargan módulos nativos. El alias va acá y no en un `vi.mock`, que
      // corre demasiado tarde: el import ya falló al parsear. ADR-016.
      { find: /^react-native-screens$/, replacement: stub('react-native-screens.tsx') },
      {
        find: /^react-native-safe-area-context$/,
        replacement: stub('react-native-safe-area-context.tsx'),
      },
      { find: /^@expo\/vector-icons$/, replacement: stub('expo-vector-icons.tsx') },
    ],
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    // §3.4.10 (decisión de equipo): nombre de archivos de test `.spec.ts(x)`.
    include: ['src/**/*.spec.{ts,tsx}'],
    server: {
      deps: {
        // Su build ESM importa sin extensión y Node no lo resuelve: se deja que
        // Vite lo transforme. ADR-016.
        inline: [/@react-navigation/],
      },
    },
  },
});
