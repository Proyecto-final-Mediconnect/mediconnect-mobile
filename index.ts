import { registerRootComponent } from 'expo';

import { App } from './src/App';

// Punto de entrada de Expo. El componente raíz vive en `src/` para mantener
// la raíz del repo solo con archivos de configuración (Sprint 0 §3.4.6).
registerRootComponent(App);
