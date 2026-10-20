# Changelog

Todos los cambios notables de este proyecto se documentan en este archivo.

El formato se basa en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/)
y este proyecto adhiere a [Semantic Versioning](https://semver.org/lang/es/).

## [Unreleased]

### Added

- Inicio renovado y "Reservar" como tab central. El inicio saluda según la hora
  de Argentina y, debajo de la próxima consulta, muestra los turnos que siguen,
  los profesionales con los que ya se atendió el paciente para volver a
  reservar, y los accesos a la historia clínica y al MediPass. Sacar un turno
  pasa a la barra de tabs, destacado en el centro.
- Sacar un turno desde la app (ENG-132, ENG-133). Buscar profesionales
  (`GET /catalog/professionals`, `GET /specialties`) con filtro por especialidad
  y por tope de precio, buscador local por nombre y scroll infinito; perfil
  público (`GET /professionals/:id`); y elegir día y horario de las próximas dos
  semanas (`GET /professionals/:id/availability`) y reservar con confirmación
  (`POST /appointments`). El turno queda sin pagar y la app avisa que hay 15
  minutos para pagarlo desde la web. Accesos desde el inicio y desde "Mis
  turnos". La hoja de confirmación ya no confirma dos veces con un doble toque.
- Entrar a la videoconsulta desde la app (ENG-131): "Ingresar a la sala" en el
  inicio y en la tarjeta del turno en "Mis turnos", solo con la sala abierta.
  Pide la sala a `POST /appointments/:id/video` y la abre en el navegador del
  sistema dentro de la app (`expo-web-browser`), con Daily Prebuilt, la misma
  sala que la web; el navegador pide cámara y micrófono. Si la consulta se
  graba, avisa antes de entrar. La URL de la sala no se guarda en la caché.
- Pantallas del paciente (ENG-115, ENG-116, ENG-117): inicio con la próxima
  consulta y el botón para entrar a la sala; mis turnos con próximos y pasados,
  pull-to-refresh y cancelar con confirmación; historia clínica en línea de
  tiempo, con filtro por tipo, correcciones vinculadas y el registro completo;
  MediPass con el código rotatorio, el bloque vital y los accesos en curso con
  opción de revocar; y el perfil con la ficha del paciente. Turnos
  (`GET /appointments/me`, `PATCH /appointments/:id/cancel`), historia clínica
  (`GET /patients/:id/clinical-record`, siempre con el id de la sesión) y ficha
  (`GET /patients/me`) salen del backend; el MediPass, de datos de ejemplo hasta
  que el backend tenga sus rutas. Al cerrar sesión se descarta la caché, para que
  el siguiente paciente no vea los datos del anterior.
- Shell navegable de la app (ENG-113), según la sección "App paciente" del canvas
  de diseño: navegador raíz con React Navigation 7 (ADR-016), tabs Inicio,
  Turnos, MediPass y Perfil, la historia clínica abierta desde el inicio, las
  fuentes y los tokens de marca de la web, y componentes base en `shared/ui/`
  (botón, campo de texto, pantalla con encabezado, etiqueta de estado, acceso
  rápido y estados de carga, error y vacío). Las reglas de turnos y la ventana
  para entrar a la sala, portadas de la web, con la tarjeta de la próxima
  consulta lista para conectar en ENG-115.
- Inicio de sesión del paciente con la sesión persistida (ENG-114): pantalla de
  ingreso, tokens guardados solo en `expo-secure-store` (Keychain / Keystore),
  sesión restaurada al volver a abrir la app, renovación automática y única del
  access token cuando vence, y "Cerrar sesión" en el perfil. Solo entran
  pacientes: a un profesional se le indica que su panel está en la web, sin
  guardar su sesión. Cliente HTTP compartido (`shared/lib/api-client.ts`) con
  `Authorization: Bearer`, listo para que cada `api.ts` pase a la API real.
  Tests de integración con MSW.
- Inicialización del repositorio `mediconnect-mobile`: proyecto Expo (managed
  workflow) + React Native + TypeScript estricto, estructura de carpetas por
  features (Sprint 0 §3.4.6), tooling de ESLint + Prettier (§3.4.2), testing con
  Vitest + React Testing Library (§3.4.10), plantilla de PR (§2.5.2) y Dev
  Container reproducible.
