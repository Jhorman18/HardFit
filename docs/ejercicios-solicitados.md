# Cinco ejercicios solicitados — fases alternadas

Las cinco fichas usan las imágenes originales entregadas por el usuario. Cada demostración pasa entre la posición inicial y la contraída mediante una transición gradual de transparencia.

| Nombre | ID | Acción |
| --- | --- | --- |
| Crunch Abdominal Corto (Máquina) | `abs/lever-seated-crunch-v-2` | Actualizar ficha existente |
| Levantamiento de piernas en barra | `abs/hanging-leg-hip-raise` | Actualizar ficha existente; rodillas flexionadas y recogida de pelvis |
| Empuje de Cadera (Máquina Smith) | `glutes/smith-hip-thrust` | Alta nueva |
| Tirón a la Cara | `delts/cable-standing-rear-delt-row-with-rope` | Actualizar ficha existente |
| Extensión de Muñeca Sentado (Mancuerna) | `forearms/dumbbell-reverse-wrist-curl` | Actualizar ficha existente y clasificar en Antebrazos |

## Presentación por fases

- Inicio → contracción → inicio, en un ciclo de 3,2 segundos: cada posición se mantiene 1,2 segundos y cada fundido dura 400 milisegundos, con entrada y salida suaves.
- Las ventanas están definidas por URL en `src/data/exercisePhases.ts`. `ExercisePhaseAnimation` compone dos capas completas, cada una con su SVG y fondo blanco, y funde la segunda sobre la primera. `ExerciseDemo` lo utiliza en la ficha, las miniaturas y las vistas previas del entreno.
- Las dos fases conservan la misma escala. El crunch usa clips independientes para excluir los fragmentos de la otra máquina. El colgado reserva espacio a la izquierda para las piernas elevadas y mantiene la barra y el torso alineados; dividir esa lámina por el centro mostraría un fragmento de la figura vecina.
- Se mantiene el papel blanco mediante un rectángulo SVG, independiente del tema y del acento. En este proyecto, la clase Tailwind bg-white corresponde al acento y no sirve como fondo literal de una ilustración.
- Movimiento reducido deja fija la posición inicial.
- Son dos posiciones originales alternadas, no un video de movimiento continuo ni imágenes intermedias generadas. El GIF de Tirón con giro en polea se examinó como referencia visual y conserva su comportamiento.
- Los cinco archivos originales permanecen idénticos, incluidas sus marcas. Procedencia, dimensiones y SHA-256: [manifest de imágenes](requested-exercises-images.json).

Los ejercicios colgados de piernas rectas, el crunch de apoyo pectoral y `abs/smith-hip-raise` conservan sus IDs y su ejecución. No se fusionan ejercicios personalizados ni registros históricos automáticamente.

## Persistencia y mantenimiento

- Catálogo: 1.278 IDs; se conservan los 1.277 anteriores y solo se añade la variante Smith.
- Seed 6 actualiza los nombres y añade Smith en instalaciones existentes. El esquema Dexie permanece en versión 5. La corrección de presentación por fases no requiere otra migración.
- Los pesos, series, unidades, rutinas, entrenos activos, notas y preferencias existentes se conservan.
- `src/data/catalogAdditions.json` mantiene las cinco definiciones. `scripts/catalog-additions.mjs` las reaplica en fetch-catalog y rename-catalog para conservar los cambios al regenerar.
- Hevy reconoce los cinco nombres. Las importaciones sin equivalencias personalizadas previas usan el ID nuevo de Smith. Los personalizados o elecciones recordadas conservan su prioridad y quedan disponibles para el enlace manual existente.
- Los filtros de máquina reconocen la Smith y se incorpora Antebrazos a los selectores de grupo muscular.
- Los recursos locales y el código de animación quedan incluidos en la precarga de la PWA.

## Verificación

- 22 pruebas correctas de catálogo/recursos, fases, agarres/prensas y unidades; lint y compilación TypeScript/Vite/PWA correctos.
- Fundido actual: siete grupos en Chrome móvil aislado, sin excepciones. Las cinco ilustraciones se comprobaron en inicio, transparencia al50%, contracción y transparencia de vuelta al50%; también reproducción automática y movimiento reducido.
- Capturas de inicio/transición/final revisadas visualmente: `.codex/tmp/exercise-phase-crossfade`.
- Se conservan las comprobaciones anteriores de recortes, miniaturas, escritorio, PWA sin red, migración seed5→6, preservación de historial/cargas y reconocimiento Hevy, documentadas en `.codex/tmp/exercise-phases` y `.codex/tmp/requested-exercises`.
- PWA71 recursos precargados. Sin compilación APK ni prueba en teléfono Android.
