// Config dinámica sobre `app.json` (ENG-71): solo agrega lo que depende del
// entorno. Todo lo demás sigue en `app.json`.
import { existsSync } from 'node:fs';
import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * `google-services.json` (Firebase) es lo que necesita Android para recibir
 * push por FCM. No se versiona: trae una API key de Google que el escaneo de
 * secretos del CI marca. Se usa el que esté en la raíz (build local), o el que
 * EAS deja en `GOOGLE_SERVICES_JSON` (variable secreta de tipo archivo). Sin
 * ninguno, la app compila igual y solo no recibe push.
 */
function googleServicesFile(): string | undefined {
  if (process.env.GOOGLE_SERVICES_JSON) return process.env.GOOGLE_SERVICES_JSON;
  return existsSync('./google-services.json') ? './google-services.json' : undefined;
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const file = googleServicesFile();
  return {
    ...(config as ExpoConfig),
    android: { ...config.android, ...(file ? { googleServicesFile: file } : {}) },
  };
};
