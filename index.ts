import * as Sentry from '@sentry/react-native';
import { registerRootComponent } from 'expo';

import { App } from './src/App';
import { initSentry } from './src/infrastructure/sentry/instrument';

// Antes que nada: así también se capturan los errores del arranque. Sin DSN
// configurado no hace nada (ENG-99).
initSentry();

// Punto de entrada de Expo. El componente raíz vive en `src/` para mantener
// la raíz del repo solo con archivos de configuración (Sprint 0 §3.4.6).
// `Sentry.wrap` captura también los errores de render; si Sentry no se
// inicializó, no tiene efecto.
registerRootComponent(Sentry.wrap(App));
