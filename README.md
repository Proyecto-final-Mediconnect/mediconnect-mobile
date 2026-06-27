# mediconnect-mobile

Aplicación mobile de **MediConnect** (iOS y Android), construida con **React
Native + Expo (managed workflow) + TypeScript** estricto. Es uno de los cuatro
repositorios del proyecto (`mediconnect-backend`, `mediconnect-web`,
`mediconnect-mobile`, `mediconnect-docs`).

Decisión de stack: **ADR-003** (Sprint 0 §3.3.3). Expo aporta EAS Build (builds
en la nube sin Xcode local), Expo Notifications (FCM + APNs) y un SDK que cubre
cámara, QR, secure storage y file system.

## Stack

| Capa          | Tecnología                                                                  |
| ------------- | --------------------------------------------------------------------------- |
| Framework     | React Native 0.85 + Expo SDK 56 (managed)                                   |
| Lenguaje      | TypeScript estricto (§3.4.1)                                                |
| Lint / Format | ESLint (`@typescript-eslint` + `react` + `react-hooks`) + Prettier (§3.4.2) |
| Testing       | Vitest + React Testing Library (§3.4.10)                                    |
| Builds        | EAS Build (`eas.json`)                                                      |

## Requisitos

- **Node.js 20 LTS o superior** (recomendado 22 LTS; Expo SDK 56 / RN 0.85 no
  soportan versiones menores a 20).
- **npm** (incluido con Node).
- App **Expo Go** en un dispositivo físico, o un emulador Android / simulador iOS,
  para ejecutar la app.
- Cuenta de **Expo** (`npx expo login`) para usar EAS Build (opcional en local).

## Instalación local

```bash
npm install
cp .env.example .env   # completar con los valores del entorno local
```

> Los secretos reales **no** se commitean (§3.4.11). `.env.example` documenta la
> lista de variables sin valores. En Expo, solo las variables con prefijo
> `EXPO_PUBLIC_` se exponen al bundle del cliente.

### Variables de entorno

| Variable              | Descripción                                                            |
| --------------------- | ---------------------------------------------------------------------- |
| `EXPO_PUBLIC_API_URL` | URL base de la API REST del backend.                                   |
| `EXPO_PUBLIC_ENV`     | Entorno lógico: `development` \| `staging` \| `production`.            |
| `EXPO_TOKEN`          | Token de Expo para EAS Build en CI (solo CI, no se expone al cliente). |

## Correr la app (Expo)

```bash
npm start        # abre el dev server de Expo (Metro) + QR para Expo Go
npm run android  # abre en emulador/dispositivo Android
npm run ios      # abre en simulador/dispositivo iOS (requiere macOS para simulador)
npm run web      # abre la app en el navegador (react-native-web)
```

Escaneá el QR con la app **Expo Go** para correr en un dispositivo físico.

## Tests

```bash
npm test          # corre la suite de Vitest una vez
npm run test:watch
```

Convención de nombres de archivos de test: **`.spec.ts` / `.spec.tsx`** (Sprint 0
§3.4.10). Los componentes React Native se renderizan en jsdom mapeando
`react-native` → `react-native-web` (el target web oficial de Expo).

## Calidad de código

```bash
npm run lint        # ESLint
npm run lint:fix    # ESLint --fix
npm run format      # Prettier --write
npm run typecheck   # tsc --noEmit
```

Se recomienda configurar el editor para correr ESLint `--fix` + Prettier al
guardar (§3.4.2). El Dev Container ya viene con esto configurado.

## Estructura del proyecto (§3.4.6)

```
src/
├── navigation/      # config de navegación — PENDIENTE ADR-016 (Sprint 1)
├── screens/         # una pantalla por ruta
├── features/        # lógica de negocio por dominio (auth/, ...)
├── infrastructure/  # capacidades nativas del dispositivo
│   ├── notifications/
│   ├── secure-store/
│   └── camera/
└── shared/          # reutilizable entre features
    ├── ui/
    ├── hooks/
    ├── lib/
    └── utils/
assets/
```

## Dev Container

El repo incluye `.devcontainer/` para levantar un entorno de desarrollo
reproducible (Node LTS + tooling de Expo + extensiones de VS Code).

> **Limitaciones conocidas dentro de un Dev Container:**
>
> - **No hay acceso a emuladores/simuladores ni a hardware USB** desde el
>   contenedor. Para probar en un dispositivo físico, usá **Expo Go** sobre el
>   dev server (`npm start`) accediendo por red al host, o ejecutá Expo
>   directamente en la máquina anfitriona.
> - Los **builds nativos locales** (Android Studio / Xcode) no corren dentro del
>   contenedor. Para builds de dispositivo/stores se usa **EAS Build** (nube).
> - En túnel/LAN puede requerir exponer el puerto de Metro (`19000`/`8081`).

## Convenciones

- Código y nombres en **inglés**; strings de UI en **español** (§3.4.3).
- Commits con **Conventional Commits** en inglés (§2.4).
- Todo cambio entra por **Pull Request** usando la plantilla del repo (§2.5.2);
  si el código es mayoritariamente generado por IA, agregar el label
  `ai-assisted` (§1.7).
