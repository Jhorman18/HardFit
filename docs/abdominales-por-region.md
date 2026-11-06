# Abdominales por énfasis regional

Implementado el 2026-11-06 en `Documents/HardFit`.

La categoría describe la ejecución de la ficha. El recto abdominal se conserva como un solo músculo: ambas regiones participan y la etiqueta no implica aislamiento.

| Categoría | Criterio | Ejemplos del catálogo |
| --- | --- | --- |
| Recto abdominal superior | Flexión del tronco que acerca el tórax a la pelvis | Crunch de suelo, en polea, corto en máquina y declinado |
| Recto abdominal inferior | Retroversión pélvica que recoge la pelvis hacia el tórax | Reverse crunch, elevación de rodillas con recogida pélvica y elevación de pelvis en banco inclinado |
| Recto abdominal completo | Estabilización, ejecución combinada o predominio regional insuficientemente claro | Plancha, body saw, rueda abdominal y elevaciones sin retroversión clara |

## Alcance y revisión

`src/data/abdominalRegions.ts` mantiene decisiones explícitas por ID, con el patrón de movimiento, el motivo y una indicación técnica cuando corresponde. La categoría superior o inferior nunca se deduce mediante una búsqueda de palabras en el nombre.

Se revisaron 37 GIF del catálogo y las dos imágenes locales con instrucciones específicas: 39 fichas tienen una decisión individual documentada en el código. Los otros 123 casos abdominales, sin predominio regional suficientemente establecido, reciben conservadoramente «completo». Resultado actual: 19 superiores, 9 inferiores y 134 completos.

También se revisó el GIF de `abs/assisted-prone-rectus-femoris-stretch`: muestra un estiramiento asistido de cuádriceps, aunque el catálogo original lo importó como `abs`. Se excluye de estas categorías; la ficha original y su ID se conservan. Los personalizados no reciben un énfasis por su nombre.

Casos que evitan una clasificación por nombre:

- `abs/hanging-leg-hip-raise`: inferior por la recogida final de pelvis indicada en esta ficha.
- `abs/hanging-straight-leg-hip-raise`: inferior porque el recorrido incorpora flexión lumbar y recogida de pelvis.
- `abs/hanging-leg-raise`, `abs/hanging-straight-leg-raise` y `abs/captains-chair-straight-leg-raise`: completo; elevar las piernas no basta para asignar el énfasis inferior.
- `abs/weighted-hanging-leg-hip-raise`: completo, ya que su demostración no establece con suficiente claridad una retroversión final.
- `abs/roller-reverse-crunch`: completo; su demostración desplaza las piernas sobre un rodillo sin una recogida clara de pelvis.
- `abs/cable-tuck-reverse-crunch`: completo por combinar movimientos de tórax y piernas.
- `abs/smith-hip-raise`: inferior por la elevación de pelvis tumbado; `glutes/smith-hip-thrust` conserva su comportamiento independiente.
- `abs/curl-up`: superior por la flexión corta mostrada en su demostración, con independencia del nombre importado.

Los criterios son una categorización operativa solicitada por el usuario y aplicada a la ejecución disponible; no son una medición de activación de cada ficha. Ante falta de claridad se utiliza completo. Una futura reclasificación debe revisar conjuntamente demostración e instrucciones.

## Interfaz y datos

- En Ejercicios → Core aparece el filtro Superior / Inferior / Completo. El selector compartido de rutinas y entrenamientos ofrece el mismo filtro.
- Las listas muestran la categoría y admiten búsquedas como «recto abdominal inferior» o «abdomen completo», además de las búsquedas anteriores.
- Las pestañas Cómo y Músculos explican el criterio, la ejecución y la participación de ambas regiones.
- Cambiar el grupo muscular restablece el filtro regional; los filtros de equipo, la paginación y el restablecimiento funcionan conjuntamente.
- No se añaden músculos independientes, porcentajes fisiológicos, preferencias regionales ni categorías duplicadas en estadísticas. La clave muscular `abs` y sus exclusiones existentes se conservan.
- Catálogo 1278, seed 6, esquema Dexie 5, IDs, historial, rutinas, notas, unidades, prensas, agarres y archivos originales sin cambios. La clasificación se deriva del código y no exige migrar datos.

Archivos: `src/data/abdominalRegions.ts`, `src/components/AbdominalRegion.tsx`, `src/pages/ExercisesPage.tsx`, `src/components/ExerciseSelectorModal.tsx`, `src/components/ExercisePreviewModal.tsx` y `scripts/abdominal-regions.test.mjs`.

## Fuentes consultadas

La técnica del reverse crunch acerca la pelvis a la caja torácica mediante el enrollamiento del tronco, además de mover las piernas. Véase [ACE: Reverse Ab Crunch](https://www.acefitness.org/resources/everyone/exercise-library/76/reverse-crunch/). Esta distinción apoya la revisión del patrón; no prueba por sí sola una magnitud de énfasis regional.

El estudio [Gomirato y Grenier, 2023](https://pmc.ncbi.nlm.nih.gov/articles/PMC10824285/) explora diferencias de actividad entre segmentos durante distintas tareas. No se trasladan sus resultados a porcentajes por ejercicio ni a activación exclusiva.

Las demostraciones revisadas proceden de [ExerciseGymGifsDB v1.1.0](https://github.com/JahelCuadrado/ExerciseGymGifsDB/tree/v1.1.0/abs) y de los dos originales locales ya incorporados. Las copias de análisis se conservan únicamente en `.codex/tmp/abdominal-regions/`.

## Verificación

- 30 pruebas correctas, incluidas siete de clasificación abdominal y las regresiones de unidades, enfoques, imágenes y fases.
- Lint, TypeScript/Vite/PWA y `git diff --check` correctos; 71 recursos precargados.
- Chrome aislado móvil 390×844 y escritorio 1365×900: ocho grupos correctos y cero excepciones. Categorías, equipo, paginación, estado vacío, seis fichas en ambas pestañas, búsqueda, personalizados, alta en rutina/entreno, recarga y presentación sin desbordamiento.
- La comparación de las tablas antes y después de consultar categorías fue idéntica. Las muestras de historial, rutina, nota, exclusiones y cargas lb se conservaron tras recargar.
- Capturas revisadas; artefactos y resultados en `.codex/tmp/abdominal-regions/`. El arnés se ajustó al texto real del botón «Añadir ejercicio», sin cambiar la aplicación por ese ajuste.

No se compiló una APK ni se realizó una prueba física en Android o una nueva prueba offline.
