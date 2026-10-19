// Configuración de Metro (ENG-99).
//
// Es la de Expo por defecto, más lo que necesita Sentry para que los stack
// traces de un crash se vean contra el código TypeScript original y no contra el
// bundle minificado: agrega un id de depuración a cada bundle, que es lo que
// después se usa para encontrar su source map en Sentry.
const { getSentryExpoConfig } = require('@sentry/react-native/metro');

module.exports = getSentryExpoConfig(__dirname);
