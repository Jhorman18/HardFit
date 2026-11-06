# Animaciones de las prensas

Actualización: 2026-11-06. Proyecto: `Documents/HardFit`.

Las seis imágenes cargadas para las dos prensas bilaterales usan el mismo fundido que los cinco ejercicios añadidos recientemente:

- Prensa horizontal: `calves/lever-seated-squat-calf-raise-on-leg-press-machine`.
- Prensa de piernas: `glutes/sled-45-leg-press-side-pov`.
- Cada una conserva los enfoques Cuádriceps, Isquiotibiales y glúteo, y Pantorrilla.

## Reproducción y color

Cada posición se mantiene 1,2 segundos, con un fundido de 400 ms en cada sentido y un ciclo total de 3,2 segundos. La transición usa `ease-in-out`. Con movimiento reducido se muestra fija la primera posición.

`getPressPhaseLayout` adapta los recortes existentes a `ExercisePhaseAnimation`. El reproductor comparte las capas HTML, el papel blanco y la animación CSS con los otros cinco ejercicios. Conserva las proporciones, los desplazamientos y los clips especiales de pantorrilla inclinada. Las miniaturas y las vistas previas reutilizan la misma presentación.

Solo las tres imágenes de prensa horizontal reciben el filtro de presentación `saturate(0.45)`, que suaviza el rojo. La prensa inclinada conserva su color. El ajuste visual no modifica la clasificación de músculos ni los cálculos de estímulo.

Los seis archivos originales permanecen intactos; su procedencia, dimensiones y SHA-256 están en [press-user-images.json](press-user-images.json). El reproductor anterior se conserva para los atlas de cuatro posiciones. Este cambio no amplía los IDs con selector de enfoque.

## Verificación

- 23 pruebas correctas de unidades, enfoque, recursos y ejercicios añadidos.
- Lint, compilación TypeScript/Vite/PWA y comprobación de espacios correctos. La PWA incluye 71 recursos.
- Chrome móvil aislado: seis variantes comprobadas al inicio, mitad del fundido, contracción y mitad de vuelta. También miniaturas reactivas, movimiento reducido y regresión del fundido anterior; nueve grupos correctos, cero excepciones.
- Capturas revisadas; los tres enfoques horizontales muestran aproximadamente el 45 % del contraste cromático rojo original. La inclinada mantiene su filtro sin cambios.
- Artefactos: `.codex/tmp/press-crossfade/`.

Catálogo 1278, seed 6, esquema Dexie 5, IDs y datos de entrenamiento sin cambios. No se compiló una APK ni se probó en un teléfono Android.
