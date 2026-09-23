# navigation/

Configuración de routing/navegación de la app mobile.

## Tecnología: React Navigation 7

Decidido en el **[ADR-016](https://github.com/Proyecto-final-Mediconnect/mediconnect-docs/blob/main/documentacion-tecnica/adr/ADR-016-navegacion-mobile.md)**
(ENG-110), que cierra la decisión que el Sprint 0 §3.4.6 había diferido.

```
@react-navigation/native          navegador raíz y estado de navegación
@react-navigation/native-stack    stack nativo
react-native-screens              peer nativo de native-stack
react-native-safe-area-context    peer nativo de native-stack
```

Se descartó **Expo Router** (file-based). El resumen en tres líneas —el
razonamiento completo está en el ADR—:

- El deep linking automático, su ventaja principal, no lo necesita este proyecto:
  el QR del MediPass se lee **dentro de la app** con `expo-camera` (ENG-118) y no
  se publica en tiendas (ENG-111).
- Construye su árbol de rutas con Metro y pide `@testing-library/react-native`;
  el repo corre Vitest + `react-native-web` por el Sprint 0 §3.4.10.
- La web usa React Router 7 en modo **declarativo**, que es el mismo modelo que
  `<Stack.Navigator>`, no el file-based.

## Estructura

```
navigation/
├── RootNavigator.tsx     navegador raíz (stack): las tabs y, encima, la historia clínica
├── PatientTabs.tsx       tabs del paciente: Inicio, Turnos, MediPass y Perfil
├── TabBar.tsx            la barra de tabs, dibujada a mano según el canvas
└── types.ts              RootStackParamList y PatientTabParamList, a mano
```

`src/App.tsx` carga las fuentes y monta `RootNavigator`. Las tabs son las de la
sección "App paciente" del canvas de diseño. La historia clínica no es una tab:
se abre desde su tarjeta en el inicio y tapa la barra, como pantalla de detalle.

**Ningún navegador dibuja header.** Lo pone cada pantalla con `ScreenHeader`
(`shared/ui/Screen.tsx`), porque en el canvas cambia de una a otra: el inicio
es la franja oscura con el saludo; turnos, blanco con el título. `ScreenHeader`
también pone la barra de estado del sistema en claro u oscuro según el fondo.

La raíz es un stack porque tiene que poder elegir entre el lado público y el
privado: **ENG-114** suma el login y esa elección según la sesión, con el mismo
patrón que el `RequireAuth` de `mediconnect-web` —navegadores condicionales, no
un check dentro de cada pantalla—.

Para agregar una pantalla: sumarla al `ParamList` de `types.ts` y al navegador
que la contiene.

`linking.ts` (deep links, scheme `mediconnect` de `app.json`) no existe todavía:
lo necesita **ENG-71** para abrir la pantalla correcta al tocar una notificación
push, y se agrega ahí. No lo necesita el MediPass.

## Tests de navegación

Los tests montan el navegador real, no uno mockeado (ver
`RootNavigator.spec.tsx`). Para que eso ande bajo Vitest + `react-native-web`,
`vitest.config.ts` tiene los tres ajustes que documentó el ADR-016:

1. `test.server.deps.inline: [/@react-navigation/]` — su build ESM importa sin
   extensión y Node no lo resuelve.
2. Alias a los stubs de `test-stubs/` para `react-native-screens` y
   `react-native-safe-area-context`, **a nivel de config** (`vi.mock` corre
   demasiado tarde): publican fuente Flow sin transpilar. También
   `@expo/vector-icons`, que carga la fuente con un módulo nativo.
3. Polyfill de `ResizeObserver` en `vitest.setup.ts`: jsdom no lo implementa y
   `@react-navigation/elements` lo usa en su camino web.

Un paquete nuevo con código nativo probablemente necesite su propio stub.
