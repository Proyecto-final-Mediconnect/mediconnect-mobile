## Descripción

> Breve descripción del cambio: qué hace este PR y por qué. Referencia al ticket ENG-XXX correspondiente. Si modifica una feature implementada previamente, mencionar el ticket original.

## Checklist

* [ ] El código está comentado y documentado donde corresponde (JSDoc)
* [ ] Agregué pruebas que verifican que los cambios funcionan correctamente
* [ ] Agregué la documentación asociada al repositorio mediconnect-docs o a Confluence (si corresponde)

## Verificación manual en emulador Android

> Obligatorio en toda historia de este repositorio mientras Detox no exista
> (Sprint 0 §4.2.3). El procedimiento completo —qué se mira en cada punto, qué
> evidencia va en cada uno y cómo sacarla con `adb`— está en el
> [checklist de testing manual en emulador Android](https://github.com/Proyecto-final-Mediconnect/mediconnect-docs/blob/main/documentacion-tecnica/testing/checklist-emulador-android.md)
> (ENG-121).
>
> Los seis puntos se corren **todos**, no solo los que parecen relacionados con el
> cambio. Un punto que no aplica se marca igual, con el motivo en una línea; un punto
> que falla y se mergea de todos modos va con su ticket de seguimiento enlazado.

Entorno de referencia: **Pixel 6 · Android 14 (API 34)**

* [ ] 1. Arranque en frío
* [ ] 2. Permisos denegados
* [ ] 3. Sin conexión
* [ ] 4. Sesión vencida
* [ ] 5. Rotación de pantalla
* [ ] 6. Volver desde segundo plano

**Evidencia** (capturas para 1, 2 y 5; grabación de pantalla para 3, 4 y 6 — son
transiciones y una captura del estado final no prueba nada sobre ellas). Solo datos
sintéticos: nada de historias clínicas, nombres ni matrículas reales.

> Adjuntar acá.

**No aplica:**

> Qué punto y por qué.

## Pasos para reproducirlo

> Agrega información que permita a los *Revisores* reproducir el ambiente de pruebas o que consideres que deban tener en cuenta para ejecutar la funcionalidad.
>
> 1. Levantar el entorno local con los cambios aplicados.
> 2. Loguearse con un usuario del rol correspondiente (paciente, profesional o moderador).
> 3. ...
