# navigation/

Configuración de routing/navegación de la app mobile.

> **PENDIENTE — ADR-016.** La tecnología concreta de navegación (Expo Router
> file-based vs React Navigation tradicional) **NO está definida todavía**. Según
> el Sprint 0 §3.4.6, esta decisión se toma en el **ADR-016 al inicio del Sprint 1**.
>
> Hasta entonces, `src/App.tsx` renderiza directamente una pantalla de ejemplo.
> Cuando se cierre el ADR-016, el navegador raíz se expone desde esta carpeta y
> `App.tsx` pasa a montarlo.

No elegir la librería de navegación antes de que el ADR-016 esté aprobado.
