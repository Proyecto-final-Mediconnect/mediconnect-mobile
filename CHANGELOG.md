# Changelog

Todos los cambios notables de este proyecto se documentan en este archivo.

El formato se basa en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/)
y este proyecto adhiere a [Semantic Versioning](https://semver.org/lang/es/).

## [Unreleased]

### Added

- Pantallas del paciente con datos de ejemplo (ENG-115, ENG-116, ENG-117): inicio
  con la próxima consulta y el botón para entrar a la sala; mis turnos con
  próximos y pasados, pull-to-refresh y cancelar con confirmación; historia
  clínica en línea de tiempo, con filtro por tipo, correcciones vinculadas y el
  registro completo; MediPass con el código rotatorio, el bloque vital y los
  accesos en curso con opción de revocar; y el perfil. Los datos salen de
  `src/mocks/` hasta que exista la sesión (ENG-114).
- Shell navegable de la app (ENG-113), según la sección "App paciente" del canvas
  de diseño: navegador raíz con React Navigation 7 (ADR-016), tabs Inicio,
  Turnos, MediPass y Perfil, la historia clínica abierta desde el inicio, las
  fuentes y los tokens de marca de la web, y componentes base en `shared/ui/`
  (botón, campo de texto, pantalla con encabezado, etiqueta de estado, acceso
  rápido y estados de carga, error y vacío). Las reglas de turnos y la ventana
  para entrar a la sala, portadas de la web, con la tarjeta de la próxima
  consulta lista para conectar en ENG-115.
- Inicialización del repositorio `mediconnect-mobile`: proyecto Expo (managed
  workflow) + React Native + TypeScript estricto, estructura de carpetas por
  features (Sprint 0 §3.4.6), tooling de ESLint + Prettier (§3.4.2), testing con
  Vitest + React Testing Library (§3.4.10), plantilla de PR (§2.5.2) y Dev
  Container reproducible.
