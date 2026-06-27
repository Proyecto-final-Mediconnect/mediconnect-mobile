import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Sprint 0 §3.4.10 / Plan de Testing: el runner de mobile es Vitest + React
// Testing Library (NO Jest). Los componentes React Native se renderizan en jsdom
// mapeando `react-native` -> `react-native-web`, el target web oficial de Expo.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'react-native': 'react-native-web',
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    // §3.4.10 (decisión de equipo): nombre de archivos de test `.spec.ts(x)`.
    include: ['src/**/*.spec.{ts,tsx}'],
  },
});
