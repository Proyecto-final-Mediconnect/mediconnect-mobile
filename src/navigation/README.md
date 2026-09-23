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

El navegador raíz se expone desde esta carpeta y `src/App.tsx` lo monta. La
estructura concreta la implementa **ENG-113** (shell mobile):

```
navigation/
├── RootNavigator.tsx     navegador raíz; decide entre el stack público y el privado
├── types.ts              RootStackParamList — los tipos de rutas se mantienen a mano
└── linking.ts            configuración de deep links (scheme `mediconnect`, ver app.json)
```

El patrón de guarda por rol es el mismo que el `RequireAuth` de `mediconnect-web`:
navegadores condicionales según la sesión, no un check dentro de cada pantalla.

`linking.ts` hace falta para **ENG-71** (abrir la pantalla correcta al tocar una
notificación push). No lo necesita el MediPass.

## Antes de escribir el primer test de navegación

El `vitest.config.ts` actual **no puede montar un navegador**. Son tres ajustes, y
el ADR-016 los documenta con el detalle de por qué:

1. `test.server.deps.inline: [/@react-navigation/]` — su build ESM importa sin
   extensión y Node no lo resuelve.
2. Alias a stubs de `react-native-screens` y `react-native-safe-area-context`, **a
   nivel de config** (`vi.mock` corre demasiado tarde): publican fuente Flow sin
   transpilar y Vite falla con `SyntaxError: Unexpected token 'typeof'`.
3. Polyfill de `ResizeObserver` en `vitest.setup.ts`: jsdom no lo implementa y
   `@react-navigation/elements` lo usa en su camino web.

Con eso, un `NavigationContainer` + `createNativeStackNavigator` renderiza y
navega en la suite. Verificado en ENG-110.
