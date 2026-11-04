# Unidades y enfoque de prensas — 2026-11-04

Proyecto modificado: C:/Users/1233896946/Documents/hard/HardFit.
Origen de la implementación de unidades: Project Hard/HardFit-main. Se trasladaron únicamente las funciones solicitadas y sus dependencias de datos.

- Descanso y unidad global: kg/lb por entrenamiento o rutina.
- Descanso y unidad por ejercicio: kg/lb o heredar Global. Cambiar unidad convierte las cargas; conserva descansos, repeticiones y estado de las series.
- Historial, resúmenes, récords y estadísticas interpretan la unidad guardada. JSON v4, CSV con unidad_peso y normalización de datos remotos conservan esta información.
- Dexie v5 identifica registros anteriores con la unidad que tenían configurada sin cambiar sus números.

El enfoque reemplaza los checkboxes exclusivamente en estos dos IDs:

| Ejercicio | ID |
| --- | --- |
| Prensa horizontal | calves/lever-seated-squat-calf-raise-on-leg-press-machine |
| Prensa de piernas | glutes/sled-45-leg-press-side-pov |

Cada uno ofrece Cuádriceps, Isquiotibiales y glúteo, o Pantorrilla. La selección se guarda y cambia músculos, instrucciones y referencia visual. Las seis referencias y su procedencia están en press-user-images.json; se muestran sus dos posiciones originales y se precargan para la PWA.

Los demás ejercicios, incluidas todas las unilaterales y las búlgaras, conservan sus checkboxes, nombres y media originales. No se trasladaron agrupaciones de duplicados, agarres de curls ni otros cambios del catálogo. Los 1.277 IDs mantienen su orden; solo la ficha horizontal cambia de nombre y añade aliases de búsqueda. Seed de esta copia:5; esquema Dexie:5.

## Verificación

- 11 pruebas de unidades y alcance de enfoque correctas.
- Lint con exclusión temporal .codex/tmp/** y build correctos.
- Chrome móvil aislado: migración real v4→v5 en lb; conversión global/por ejercicio y herencia; persistencia al recargar; descanso45s/90s; estadísticas con kg/lb, lastre y asistencia; rutinas; backup v4 y legacy RepLog v3; CSV.
- Dos prensas con tres enfoques, miniaturas y preview de entrenamiento; controles originales de unilateral horizontal/inclinada, búlgara y extensión de rodilla.
- PWA de producción: seis recursos visuales precargados y cambios de enfoque después de recargar sin conexión. Cero excepciones de ejecución.

Resultados y capturas: .codex/tmp/units-press-port/.
Respaldo previo: .codex/tmp/units-press-before-4f96f603/.
Los hashes iniciales se guardan en inventory-before.json. La comprobación confirma intactos exerciseMedia.ts, exerciseInstructions.json, MuscleToggleList.tsx, ExerciseSelectorModal.tsx y package-lock.json.

Servidor de esta copia: http://127.0.0.1:5174/.
La versión de Project Hard/HardFit-main no se modificó.
Validación web/PWA; sin compilación APK ni cuenta Supabase real.
