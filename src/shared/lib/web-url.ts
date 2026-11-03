/**
 * La web de MediConnect. La app la usa para lo que vive allá y no se duplica:
 * los textos legales (ENG-140) y la ficha de emergencia que abre quien escanea
 * el MediPass (ENG-117).
 *
 * Expo solo reemplaza la variable si se escribe literal
 * `process.env.EXPO_PUBLIC_WEB_URL`. `||` y no `??`: `.env.example` la trae
 * vacía, y `''` dejaría los enlaces sin dominio.
 */
export const WEB_URL = (
  process.env.EXPO_PUBLIC_WEB_URL || 'https://mediconnect-web-bigz.onrender.com'
).replace(/\/+$/, '');
