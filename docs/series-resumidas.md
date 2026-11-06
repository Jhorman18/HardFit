# Series resumidas — diseño B

Implementado el 2026-11-06 en `Documents/HardFit`.

El usuario eligió la propuesta B («Filas resumidas») después de revisar tres prototipos y confirmó que marcar una serie e iniciar el descanso corresponde al entrenamiento.

## Presentación y edición

- Cada serie muestra un resumen como `20 kg × 10 reps`, con RPE y estado en texto secundario.
- Tocar los datos despliega los campos de esa serie. La edición no confirma la serie ni inicia el descanso.
- Los campos conservan coma decimal, valores vacíos, ceros, RPE y la unidad guardada. Los huecos se muestran como «—» sin copiar un valor anterior como si estuviera registrado.
- En rutinas se editan los objetivos y se guardan mediante Guardar. No aparecen checks de realización ni se inicia descanso al planificar.
- En el entrenamiento, el ✓ independiente marca la serie como completada, cierra su edición y usa el temporizador existente. El control visible es de 28 px, dentro de un botón de al menos 48×48 px.
- La barra de descanso tiene texto y controles visuales más ligeros; conserva expandir, restar/sumar 15 segundos y Saltar.
- El descanso conserva la prioridad ejercicio → entrenamiento → Ajustes → 120 s; 0 mantiene el descanso desactivado. Desmarcar no inicia ni reinicia otro descanso; se conserva el comportamiento anterior del temporizador.
- La serie pendiente se destaca con un fondo discreto. Las completadas usan texto atenuado y check relleno.
- Al desplegar una serie se conservan el registro anterior y Ver en foco. El número/tipo abre el selector de tipo de serie; permanecen los indicadores de récord.
- Añadir serie, quitar una serie concreta y Notas quedan como acciones secundarias. No se permite quitar la única serie.
- El cambio rápido kg/lb sigue disponible y convierte físicamente las cargas como antes.
- RPE se puede editar al estar activado en Ajustes o cuando la serie ya tiene un valor. Las rutinas mantienen el RPE objetivo opcional.

## Tipos de ejercicio y arquitectura

`formatSetSummary` recibe cargas ya convertidas a la unidad visible y distingue los cinco tipos: carga/reps, peso corporal con o sin lastre, asistencia, duración y distancia. La duración se edita como minutos/segundos; la distancia mantiene metros y tiempo en segundos.

Archivos nuevos:

- `src/utils/setSummary.ts`: formato puro de los resúmenes.
- `src/components/SetSummaryRow.tsx`: fila, expansión y controles independientes.
- `src/components/SetEditorFields.tsx`: edición común de los cinco tipos.
- `scripts/set-summary.test.mjs`: seis pruebas de formato y unidades.

Integración: `SheetView.tsx`, `RoutineEditorPage.tsx`, una prop RPE desde `WorkoutPage.tsx` y presentación de `RestTimerBar.tsx`. Se conservan los tres temas mediante las variables existentes.

No se cambia `workoutStore`, la lógica de notificaciones/temporizador, el modelo de datos, las estadísticas ni las conversiones. Catálogo 1278, seed 6, Dexie 5, historial, notas, enfoques y recursos originales intactos. No se requiere migración.

## Verificación

- 36 pruebas correctas: seis nuevas y las 30 regresiones anteriores.
- Lint, TypeScript/Vite/PWA y `git diff --check` correctos. PWA: 71 recursos.
- Chrome aislado móvil 320/390 px y escritorio 1365×900: ocho grupos, cero excepciones.
- Rutinas: plegadas sin tabla ni check; edición decimal, repeticiones/RPE y guardado conservando unidades, tiempos, distancia y descansos.
- Entrenamiento: editar no completa ni activa el timer; ✓ inicia 45 s específicos, 90 s heredados o ninguno con 0. ±15 y Saltar funcionan.
- Conversión kg/lb sin variar la carga física; lastre, asistencia, minutos/segundos y metros decimales comprobados.
- Vista de foco, tipos de serie, añadir/quitar, recarga de valores/estados y conservación exacta de historial, nota y catálogo comprobados.
- Tres temas, RPE opcional, controles táctiles y ausencia de desbordamiento horizontal verificados. Capturas revisadas.
- SHA-256 de 13 archivos de lógica/datos conservados comprobados frente al inicio.

Artefactos: `.codex/tmp/series-summary/` (respaldo previo, referencia SHA-256, arnés, resultados y capturas). El arnés se corrigió para evaluar módulos de forma asíncrona, localizar Foco por su control accesible y esperar a la recarga real; esas correcciones no requirieron cambios de aplicación.

Servidor local conservado: http://127.0.0.1:5174/. Sin nueva APK ni prueba física en Android o prueba offline adicional. El código de notificaciones permanece intacto.
