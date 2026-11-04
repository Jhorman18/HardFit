# Bitácora de HardFit / Kitaeru

Fechas en America/Bogota. Entradas más recientes primero.
Esta bitácora conserva contexto y resultados; no contiene respaldos del código ni sustituye Git.

## 2026-11-03 — Aplicar las seis imágenes del usuario a Prensa horizontal y Prensa de piernas

**Petición:** reemplazar las ilustraciones incorrectas por seis archivos entregados y animar sus posiciones, exclusivamente en los dos ejercicios bilaterales solicitados.

**Correspondencia:** Prensa horizontal usa prensa hori, cuadriceps.jpeg / prensa hori, gluteo.jpeg / prensa hori, pantorrilla.jpeg. Prensa de piernas usa prensa cuadriceps.webp / prensa gluteo.jpeg / prensa pantorrilla.jpeg. Copiadas sin cambiar bytes a public/animations/leg-press-user/, con nombres por máquina/enfoque; hashes, dimensiones y origen registrados en docs/press-user-images.json.

**Reproducción:** viewport SVG recorta una figura de la lámina y conserva su proporción. CSS alterna las dos posiciones cada1,6s, sin fundido, intermediarios generados ni movimiento interpolado. Movimiento reducido muestra la primera posición. Se mantiene el componente y la secuencia de cuatro poses para la unilateral, cuyos tres recursos conservan exactamente sus hashes.

**Corrección visual durante la revisión:** dividir por el centro la imagen de pantorrilla inclinada dejaba un pequeño fragmento de la figura vecina y cortaba su margen izquierdo en la segunda posición. Las figuras originales invaden el centro en alturas distintas. Se ajustaron sus ventanas y clips independientes, desplazando la segunda ventana a x1328, sin editar el archivo original. Se revisaron las capturas de ambas posiciones después del ajuste.

**Archivos:** pressFocus.ts, AnatomicalPressAnimation.tsx, index.css, vite.config.ts; press-animations.test.mjs y referencia de recurso en exercise-focus.test.mjs; seis imágenes y documentación/manifest de procedencia. Se retiraron de public ocho recursos bilaterales anteriores después de respaldarlos; press-animation-prompts.json conserva su historial, marcándolos inactivos. La unilateral, IDs, catálogo/seed11/esquema5, historial, preferencias, unidades y descansos se conservan.

**Verificación final:**15 pruebas correctas; lint con --ignore-pattern=.codex/tmp/** --ignore-pattern=.codex/permission-backups/** sin advertencias; build/PWA completo con68 entradas y15228,72KiB. Navegador Chrome aislado390×844: seis combinaciones, ambas posiciones con cambio directo, recortes/proporciones, miniaturas reactivas, enfoque persistente, movimiento reducido, secuencia unilateral, preview de entrenamiento y recarga offline de las dos prensas con las seis referencias precargadas. Doce comprobaciones, cero excepciones. Capturas finales revisadas visualmente.

**Artefactos y entorno:** .codex/tmp/press-user-images; respaldo .codex/tmp/press-user-images-before-10961068. Navegador y preview propios cerrados. Servidor del usuario conservado en http://127.0.0.1:5173/, respuesta HTTP200. Fuentes de Downloads intactas. No cambios a permisos ni exclusiones persistentes.

**Límites:** animación de dos posiciones, no video continuo. La imagen inclinada de cuádriceps tiene menor resolución por el archivo original600×254. Pruebas web/PWA, sin APK ni sincronización con Supabase real.

## 2026-11-02 — Activar MXC para ejecutar comandos dentro del perfil de HardFit

**Nuevo fallo del usuario:** la CLI ya abría con Profile hardfit-project (workspace, never), pero Get-Content de la skill y comandos normales del proyecto eran rechazados por policy antes de crear el proceso. La comprobación anterior de /status solo probaba el arranque; no demostraba que los comandos funcionaran.

**Diagnóstico:** se revisaron exclusivamente los errores relevantes de la sesión CLI. Tanto lectura de skill como listado del proyecto eran rechazados antes de ejecutar PowerShell. doctor informaba sandbox backend: disabled, con filesystem restricted y approvals Never. No se encontraron requisitos administrados de filesystem en estas comprobaciones. Con el backend deshabilitado, mostrar un perfil de escritura no bastaba para permitir la ejecución confinada.

**Corrección:** activado [features] prefer_mxc = true en Project Hard/.codex/config.toml y HardFit-main/.codex/config.toml. Se conserva el perfil heredado de :read-only, aprobación never, red deshabilitada y las dos carpetas autorizadas. Se añade escritura explícita solo a HardFit-main/.codex/tmp para los arneses temporales; el primer ensayo de escritura en ese subdirectorio fue denegado por la protección de .codex. No se concede escritura a los archivos de configuración protegidos ni a carpetas externas adicionales. Respaldos en .codex/tmp/codex-startup/windows-config-backup.

**Prueba real de aislamiento:** en Windows11 de este equipo, MXC ejecutó PowerShell leyendo SKILL.md, contexto.md y cambios.md. Archivos centinela aleatorios se escribieron, leyeron y eliminaron tanto en el proyecto como en la skill externa. Se comprobó una denegación de escritura en el directorio padre, fuera de las rutas permitidas, sin dejar el archivo. Después del ajuste se repitió la prueba usando solo los archivos config, sin overrides de diagnóstico; también pasó en .codex/tmp. doctor ahora informa sandbox backend: mxc.

**Prueba a través de Codex:** app-server del mismo binario de extensión, iniciado con -C HardFit-main -a never, cargó la cuenta y ejecutó command/exec con Get-Content de la skill, sin sobreescribir sandboxPolicy: exitCode0, nombre de skill leído y stderr vacío. No se inició un turno del modelo ni se modificó la app. No se usaron Full access, bypass de aprobaciones, desactivación del sandbox ni configuración de cuentas privilegiadas de Windows.

**Entrega:** iniciar-codex.cmd se conserva. El usuario debe cerrar su CLI actual con Ctrl+C y ejecutarlo de nuevo para cargar prefer_mxc. El chat ya iniciado no cambia retroactivamente su sandbox. Después puede solicitar la lectura de hardfit-contexto y su bitácora.

**Artefactos:** mxc-read-result.json, mxc-access-result.json, configured-sandbox-result.json, configured-command-results.json, arneses y respaldo de configuración bajo .codex/tmp/codex-startup. startup-resolution.json actualizado. Fuente técnica consultada: https://learn.chatgpt.com/docs/windows/windows-sandbox . Sin pruebas de aplicación, APK ni sincronización: esta corrección afecta la ejecución de Codex, no Kitaeru.

## 2026-11-02 — Resolver el arranque de Codex para HardFit sin aprobaciones rutinarias

**Problema:** el usuario no tenía codex en el PATH de CMD. Al ejecutar el binario de la extensión con -c default_permissions=hardfit-project, account/read fallaba en el arranque con failed to load workspace requirements: invalid input parameter (-32603). Volver a iniciar sesión funcionó para autenticar, pero no resolvió ese arranque.

**Diagnóstico comprobado:** configuración TOML cargaba y doctor reconocía las dos rutas de escritura, perfil hardfit-project y Never. Binario de extensión 0.164.0-alpha.11.1; estable 0.166.0 descargado solo a la caché temporal del proyecto para comparar. Ambos reproducían el fallo al forzar el perfil por argumento. Tras el nuevo login, la cuenta cargaba desde una carpeta temporal sin configuración del proyecto. Comparación dentro de HardFit: perfiles integrados :read-only/:workspace cargaban; extender el perfil personalizado desde :read-only o :workspace mediante override también permitía cargar. Añadir extends al archivo por sí solo NO corregía el arranque si se mantenía el argumento redundante -c default_permissions. Una prueba de claves con workspace_roots no inicializó y no se aplicó.

**Configuración aplicada:** se añadió extends = ":read-only" a [permissions.hardfit-project] en los dos archivos .codex/config.toml (padre Project Hard y HardFit-main), preservando approval_policy = never, selección del perfil desde el proyecto, escritura solo en HardFit-main y en la skill externa, y red deshabilitada. Respaldos en .codex/tmp/codex-startup/config-backup.

**Solución de arranque verificada:** dejar que el proyecto seleccione hardfit-project, sin repetir -c default_permissions=hardfit-project en el comando. El binario de extensión requiere además --no-daemon: al arrancar con servicio compartido informa que no tiene el paquete local completo. Se abrió la TUI real con -C ruta-del-proyecto -a never --no-daemon --no-alt-screen. /status mostró Directory HardFit-main y Permissions: Profile hardfit-project (workspace, never). La sesión de prueba se cerró sin enviar trabajo al modelo ni aceptar cambios interactivos de permisos.

**Entrega:** iniciar-codex.cmd en la raíz del proyecto usa el comando probado. El usuario puede ejecutarlo desde CMD estando en HardFit-main. No se necesita otra reinstalación ni otro login para esta corrección. El lanzador contiene la ruta de la versión de extensión instalada; si VS Code cambia ese directorio al actualizar, habrá que actualizar la ruta o usar una CLI empaquetada.

**Límites:** se verificó inicio, account/read, requisitos y estado del perfil; no se ejecutó una tarea del modelo para probar todas las clases de herramientas. Este arranque no cambia los permisos de la sesión ya abierta en el IDE. Las restricciones de red y acceso fuera de las dos rutas siguen vigentes. No atribuir nuevamente el error de cuenta a un requisito corporativo confirmado: las consultas de requisitos en estas pruebas devolvieron ausencia de requisitos administrados.

**Artefactos:** .codex/tmp/codex-startup con arneses JSON-RPC, resultados de comparación, caché npm de la estable, respaldos de los dos config y resumen startup-resolution.json. No se instaló globalmente Codex; no se modificó la app, sus datos ni el servidor Vite.

## 2026-11-02 — Recuperar estilo anatómico y corregir la plataforma de las prensas

**Corrección del usuario:** rechazó expresamente los diagramas SVG anteriores por verse desfasados. Quiere conservar el estilo anatómico del catálogo, elevar el apoyo de los pies como en su segunda referencia, variar la altura de los pies entre enfoques y recuperar pantorrilla. Solicitó quitar marcas de agua de la ilustración 3768.webp suministrada.

**Resultado:** retirados los 18 SVG públicos y el generador que los recreaba; se retira generate:press-animations del package. Se conserva el nombre general Prensa horizontal, la prensa inclinada y el alcance de los tres IDs autorizados, incluidas sus preferencias actuales; catálogo/seed11/esquema5 sin cambios. No ampliar selectores a otras máquinas.

**Recursos:** herramienta integrada image_gen para editar/generar las ilustraciones anatómicas desde las referencias vistas. Siete PNG finales en public/animations/leg-press-anatomical, cada uno con cuatro poses en cuadrícula 2×2: horizontal cuádriceps/pies altos, inclinada cuádriceps/pies altos y unilateral cuádriceps/pies altos/pantorrilla. Plataformas altas consistentes entre las dos colocaciones de cada máquina; no textos, marcas de agua ni logos. La pantorrilla de ambas prensas principales recupera EXACTAMENTE los bytes de los GIF descargados antes: source-0.gif (seated-squat-calf-raise-on-leg-press-machine) y source-6.gif (sled-calf-press-on-leg-press); dos posters PNG para movimiento reducido. La unilateral de pantorrilla usa una secuencia anatómica específica con rodilla estable y apoyo del antepié.

**Visualización:** AnatomicalPressAnimation muestra solo una celda del PNG en cada momento, secuencia 1–2–3–4–3–2, con transiciones breves, ciclo 4,8s. No es una animación nueva de video/morphing: son cuatro poses anatómicas editadas con imagen y animadas por CSS. Con movimiento reducido solo se muestra la primera pose. ExerciseDemo conserva el fallback, miniaturas reactivas, resolución por enfoque y GIF convencionales; los dos GIF locales tienen picture/source con poster. pressFocus apunta a los nuevos PNG/GIF y conserva instrucciones. CSS en index; PWA incluye GIF en globPatterns y precarga los once recursos nuevos. No volver a colocar diagramas esquemáticos en lugar del estilo anatómico solicitado.

**Archivos:** src/components/AnatomicalPressAnimation.tsx (nuevo), ExerciseDemo, index.css, pressFocus, vite.config, package; siete PNG/dos GIF/dos posters; scripts/press-animations.test actualizado y expectativa en exercise-focus.test. Retirados scripts/generate-press-animations.mjs y SVG anteriores, con respaldo. docs/animaciones-prensas.md y docs/press-animation-prompts.json documentan uso, archivos, prompts finales completos, herramienta, fuentes y hashes. Las salidas originales de image_gen permanecen en .codex/generated_images fuera del proyecto; la app consume las copias locales.

**Verificación:** 31 pruebas correctas y cuatro de recursos repetidas tras la última edición de imagen; comprueban cuadrículas de cuatro poses distintas, recursos inferiores al límite de 3MB, alcance y GIF exactos por SHA-256. Build/PWA completo: 70 recursos, aproximadamente 15,6MiB de precarga; lint correcto con las exclusiones CLI temporales. Chrome aislado: nueve combinaciones cargadas, una sola celda visible, instrucciones, secuencia real de poses 0–1–2–3–2–1 en los tres modos, persistencia, miniaturas, vista previa de entrenamiento, movimiento reducido para secuencias y GIF. PWA de producción con red desconectada: recarga y seis opciones de las dos prensas principales cargadas; once recursos nuevos en caché, ningún SVG rechazado; cero excepciones. Capturas móviles revisadas. Manifest de nueve recursos base con hashes comprobados, más dos posters. Sin APK ni Supabase real.

**Iteraciones:** se descartó una primera versión de pantorrilla unilateral que todavía mostraba la posición de prensa; se generó la versión final con foco en el tobillo. Se ajustó la secuencia inclinada de cuádriceps a la misma plataforma alta que su variante de pies altos. El primer arnés de navegador pulsó un título de la ruta anterior durante una transición; se corrigió la espera por Terminar entreno y la prueba completa pasó, sin cambio de la app por ese fallo.

**Artefactos:** .codex/tmp/anatomical-press-correction con resultados/capturas/arnés; respaldo .codex/tmp/anatomical-press-before-acd5a559. Navegador separado en TEMP, puerto 9224, cerrado al terminar; preview de prueba cerrado, Vite del usuario conservado. Sin cambios de permisos ni exclusiones persistentes.

## 2026-11-02 — Nombre general y animaciones por enfoque en prensas

**Petición:** cambiar «Elevación de talones sentado en máquina» por un nombre general y crear una animación para cada una de sus tres opciones; aplicar también a Prensa de piernas.

**Cambios:** el ID calves/lever-seated-squat-calf-raise-on-leg-press-machine se llama Prensa horizontal. La variante ya autorizada glutes/lever-horizontal-one-leg-press se distingue como Prensa horizontal a una pierna. La bilateral inclinada glutes/sled-45-leg-press-side-pov conserva Prensa de piernas. Aliases antiguos conservan las búsquedas. SeedVersion 11 actualiza nombres por upsert, sin cambiar esquema, IDs, preferencias, series, descansos ni unidades.

**Animaciones:** nueve guías SVG nativas, tres enfoques por cada uno de los tres modos (horizontal, unilateral e inclinada), con nueve alternativas estáticas para movimiento reducido. Diagramas articulados con colocación de pies, rodilla/hip/tobillo y movimiento específico. Pantorrilla muestra antepié en el borde y movimiento del tobillo con flexión de rodilla constante; cuádriceps y cadena posterior muestran recorrido de prensa y colocaciones distintas. Recursos locales en public/animations/leg-press, reproducibles por scripts/generate-press-animations.mjs. Se eligió una guía vectorial coherente, no GIF originales de máquinas distintas ni una edición de imágenes anatómicas; ocho fuentes alternativas y el GIF original se inspeccionaron antes. Los originales de exerciseMedia se conservan; la resolución de enfoque selecciona la nueva guía.

**Interfaz:** pressFocus define alcance por ID, demo y técnica; exerciseFocus resuelve animación e instrucciones con el mismo enfoque válido/predeterminado. Selector colocado antes de la demostración en catálogo y vista previa, con ayuda de colocación. ExerciseDemo consulta la preferencia solo para miniaturas de estas prensas; imagen grande, miniaturas, mapa e instrucciones reaccionan al cambio. picture/source selecciona automáticamente la versión sin animación. Sin extensión a otras máquinas; las búlgaras mantienen sus GIF originales.

**Verificación:** 31 pruebas correctas (27 anteriores y cuatro nuevas), build/PWA completo (77 recursos precargados), lint correcto con exclusiones temporales del comando. Chrome aislado: nueve combinaciones de enfoque/máquina, cargas reales de imágenes e instrucciones, miniaturas reactivas, persistencia al recargar, cambio dinámico de movimiento reducido, migración real seed10→11 conservando ID histórico, carga, descanso/unidad global e individual y preferencia. Vista previa desde entrenamiento probada, geometría SMIL cambiante confirmada en Chrome. PWA de producción bajo preview: 18 SVG en CacheStorage, recarga y selección de las tres opciones sin red; cero excepciones de ejecución. Capturas móviles y guías revisadas visualmente. Dos regeneraciones aisladas del catálogo idénticas; comparación con respaldo confirma 1.277 IDs intactos y solo dos filas con cambios de nombre/aliases.

**Archivos:** pressFocus, exerciseFocus, ExerciseDemo, ExerciseFocusSelector, ExercisePreviewModal, ExercisesPage, catalog, seed, rename-catalog; generate-press-animations.mjs, press-animations.test.mjs, ejercicio-focus.test actualizado, package con generate:press-animations y test:press-animations; 18 SVG locales y auditoría de duplicados regenerada. Informe ahora: 143 nombres repetidos en 520 fichas, 1.267 visibles y 10 ocultos históricos; una familia adicional y tres ya agrupadas.

**Artefactos:** .codex/tmp/press-focus-animation (browser-results.json, arneses, capturas, fuentes inspeccionadas y comprobación del generador); respaldo .codex/tmp/press-focus-before-ad89bc27. Perfil de navegador separado en TEMP, puerto 9224; servidor Vite del usuario conservado. No cambios de permisos ni de exclusiones persistentes del linter.

**Alcance y límites:** guías orientativas, no porcentajes de activación ni promesas de hipertrofia; las instrucciones de posición alta aclaran que sigue siendo un movimiento compuesto y ajustable a movilidad/máquina. Base consultada: https://pubmed.ncbi.nlm.nih.gov/18545207/ y https://pubmed.ncbi.nlm.nih.gov/11528346/. Preferencias siguen siendo globales por ejercicio, no snapshots por sesión. Verificado web/PWA, sin compilación APK ni cuenta Supabase real.

## 2026-11-02 — Unidades globales/por ejercicio junto al descanso y revisión de laterales

**Petición:** revisar las dos elevaciones laterales iguales y permitir elegir kg/lb globalmente y por ejercicio desde el descanso.

**Ejercicios:** GIF originales verificados: mano libre sobre banco frente a variante libre. Se mantienen ambos IDs y se nombran Elevación lateral con apoyo / sin apoyo, con aliases e instrucciones. Generador por ID actualizado y seedVersion 10.

**Unidades:** nuevo módulo weightUnits con conversiones, snapshots y formato. Unidades guardadas en series, objetivos, entradas y sesiones/planes; Ajustes mantiene el valor predeterminado. RestPicker reutilizado para unidad y descanso global/individual tanto en entreno como en editor de rutina. Global convierte series heredadas; un override queda fijado hasta elegir Global. Rutinas conservan y transfieren también descansos.

**Datos:** Dexie 5 etiqueta registros antiguos con su ajuste global previo sin cambiar los números. Cálculos comparan en kg, presentación usa unidad elegida/original y peso corporal respeta Measurement.unit. Backup JSON v4, importación legacy, CSV con unidad_peso y normalización de datos remotos. Cache de sesión con updatedAt monotónico y recuperación de la copia más reciente para no perder cambios ante una recarga rápida; importación explícita reemplaza cache.

**Archivos:** types, db, workoutStore, Layout, RestPicker, WorkoutPage, RoutineEditorPage; stats, workoutSummary, weightUnits, exportData y sync; páginas Home/History/Exercises/Stats/WorkoutSummary y componentes ExerciseHistoryTab/MonthlyReport/RadarStats; catálogo, instrucciones, seed, rename-catalog, auditoría generada y package.json. Nuevo scripts/weight-units.test.mjs.

**Verificación:** 27 pruebas correctas; build/PWA completo y lint sin advertencias con exclusiones temporales del comando. Chrome aislado y datos ficticios: migración v4-v5, conversión kg/lb por UI y herencia, recarga rápida, descanso 45s/90s según ámbito, rutinas, estadísticas físicas correctas con mezcla y con peso corporal/asistencia, historial y resumen, backup v4, importación RepLog v3 y CSV. Seis grupos de comprobaciones, cero excepciones; capturas revisadas. Generador: dos pasadas aisladas idénticas. Informe final: 145 grupos en 524 fichas.

**Artefactos:** .codex/tmp/lateral-units; copia anterior .codex/tmp/lateral-units-before-39a2c4af. Los primeros intentos del arnés necesitaron esperar inputs y cargar el mismo módulo con URL HMR que la app; también permitieron detectar/corregir empates de timestamp en persistencia. Navegador de prueba separado; servidor del usuario conservado.

**Límites:** pruebas web/PWA, sin APK ni sincronización real con cuenta Supabase. Las unidades históricas antes de esta función no existían por registro: se conservan números con el ajuste global disponible al migrar. No se modificaron permisos ni exclusiones persistentes del linter. Otros duplicados siguen pendientes de análisis.

## 2026-11-02 — Identificar abdominal colgado con rodillas flexionadas

**Petición:** encontrar una elevación abdominal colgado con rodillas flexionadas como en la segunda imagen de referencia.

**Hallazgo y cambio:** ya existía abs/hanging-leg-hip-raise con un nombre confuso. Se identifica como Elevación de rodillas colgado, con aliases que permiten buscar abdomen en barra, piernas colgado y rodillas flexionadas. Se distingue también la variante de rodillas a la horizontal (hanging-leg-raise) y la de piernas rectas (hanging-straight-leg-raise). Instrucciones específicas para cada movimiento. Animaciones originales comparadas visualmente en tres fases; no se generan imágenes ni IDs nuevos.

**Archivos:** catálogo, instrucciones, correcciones por ID de rename-catalog y seedVersion 9; informes de duplicados regenerados. Skill/contexto actualizados. Se preservan los 1.277 IDs, GIF, anatomía, tipos, equipos y referencias de entrenamiento.

**Verificación:** 19 pruebas existentes correctas, build/PWA completo y lint correcto excluyendo temporales desde el comando. Cinco búsquedas verificadas; dos regeneraciones aisladas idénticas. Informe: 146 grupos de nombre repetido en 526 fichas, 1.267 visibles. Sin prueba nueva de navegador ni APK.

**Artefactos:** .codex/tmp/hanging-knees con GIF, comparison.png y results.json; copia previa .codex/tmp/hanging-knees-before-b1a95fc8. Vite del usuario conservado; sin cambios de permisos ni exclusiones persistentes.

## 2026-11-02 — Recuperar curl con arm blaster y barra recta

**Petición:** conservar la variante que usa un soporte negro en el torso para apoyar los brazos, específicamente con barra recta. El GIF con mancuernas era una referencia del accesorio.

**Cambio:** biceps/barbell-biceps-curl-with-arm-blaster vuelve a ser seleccionable e independiente, sin redirigir sus nuevas altas al curl básico. Se nombra Curl con arm blaster y barra recta, equipo Barra recta, con aliases e instrucciones propios. GIF y referencias originales conservados; no se restauran otras variantes ni se amplían los agarres por inferencia. Corrección estable en rename-catalog y seedVersion 8.

**Archivos:** exerciseVariants, catálogo, instrucciones, seed, rename-catalog, pruebas de agarres y los tres informes de duplicados; skill/contexto actualizados. Catálogo mantiene 1.277 IDs; ahora 1.267 visibles y 10 ocultos; 146 grupos de nombres repetidos en 528 fichas, sin cambios en ese conteo.

**Verificación:** GIF original inspeccionado visualmente (barra recta y arm blaster). Diecinueve pruebas correctas, build/PWA correcto y lint correcto con exclusión temporal de .codex/tmp y permission-backups desde el comando. Dos regeneraciones aisladas del catálogo idénticas. Sin nueva prueba de navegador o Android para este cambio de datos/regla de selección.

**Artefactos:** copia previa .codex/tmp/arm-blaster-before-2e6de472; GIF/PNG en .codex/tmp/arm-blaster. No se cambiaron las exclusiones persistentes rechazadas anteriormente ni los permisos. Vite del usuario conservado.

## 2026-11-02 — Unificar curl básico por barra y preparar listado completo de repetidos

**Petición:** dejar una ficha básica de curl por barra recta/Z, con los agarres deseados, y preparar todos los posibles duplicados para analizarlos. El usuario confirmó Prono y Supino.

**Cambios:** cinco variantes rectas y dos Z se agrupan para nuevas altas, conservando sus IDs y referencias anteriores. La recta conserva biceps/barbell-drag-curl para no perder la preferencia previa; Z usa ez-barbell-curl. Ambas ofrecen dos agarres con GIF/técnica propios del equipo. Se distinguen seis curls de muñeca antes etiquetados como bíceps y el curl araña Z. Se añade Antebrazos a filtros. Correcciones por ID preservadas por el generador; seedVersion 7, upsert sin cambios de esquema.

**Listado:** scripts/audit-exercise-duplicates.mjs, comando audit:duplicates y docs/revision-duplicados.html/.csv/.json. Resultado: 1.277 built-ins, 1.266 visibles, 11 ocultos para nuevas altas; 146 nombres repetidos en 528 fichas, más una familia adicional de dos extensiones de muñeca y tres familias ya agrupadas. HTML con filtros, GIF bajo demanda, decisiones locales y exportación; CSV con BOM. No incluye ejercicios propios del usuario ni asegura que toda coincidencia sea un mismo movimiento.

**Verificación:** 18 pruebas correctas, lint y build/PWA correctos. Generador: dos pasadas aisladas idénticas. Chrome con perfil separado: migración concurrente v6-v7, referencias antiguas y preferencia recta intactas, selector con un curl básico por barra, alta real de Z, prono/supino reactivos en catálogo/vista previa, persistencia y backup. Informe final: filtros, 146 grupos, guardado/recarga/exportación de decisiones; cero excepciones. Se depuró una regla inicial de candidatos para no quitar front de front-squat como si fuera una vista; solo se quitan marcadores POV y versiones, normalizando la grafía heredada revers.

**Archivos:** exerciseVariants, exerciseGrip, ExerciseGripSelector, ExercisesPage, ExerciseSelectorModal, catálogo, seed, rename-catalog, pruebas de agarres, package.json, nuevo generador de auditoría y tres informes. Skill/contexto actualizados; inventario inicial conservado.

**Artefactos:** .codex/tmp/curl-review con resultados/capturas/arneses; copia previa .codex/tmp/curl-review-before-9618e732. Los fallos iniciales de prueba fueron ruta de Chrome con espacios y selectores/serialización del arnés, corregidos; no errores de ejecución de la app. Prueba web únicamente, sin APK. Vite del usuario conservado.

**Pendiente:** analizar con el usuario el resto de grupos antes de nuevas agrupaciones. Las preferencias de enfoque/agarre siguen siendo globales por ejercicio y locales, no una captura por serie o sesión.

## 2026-11-01 - Permisos del proyecto sin confirmaciones rutinarias

El usuario solicita ejecutar los cambios y comandos del proyecto sin aprobar cada uno. Se guardaron configuraciones locales iguales en Project Hard/.codex/config.toml y HardFit-main/.codex/config.toml para admitir el workspace actual y la apertura directa de la app. Perfil hardfit-project con approval_policy never; escritura explicita solo en HardFit-main, hardfit-contexto y temporales del sistema. Lectura general y red restringida, como antes. En el config de usuario solo se marcaron ambos proyectos trusted para cargar sus capas locales; modelo y esfuerzo conservados. No se modificaron requirements ni reglas administradas. Copia anterior del config de usuario en C:/Users/1233896946/Documents/Project Hard/HardFit-main/.codex/permission-backups/20261101-234805/user-config.before.toml. La configuracion persistida no cambia los permisos efectivos ya inyectados en esta conversacion: reabrir el proyecto y seleccionar Custom (config.toml) si el cliente lo exige. No afirmar que la sesion actual ya tiene escritura ni que desaparecieron todas las restricciones. No se modifico codigo de la app.

## 2026-11-01 — Corregir curl-up y añadir agarres solo al curl de la captura

**Petición:** corregir el ejercicio abdominal mal llamado Curl de bíceps y permitir agarre Prono/Supino exclusivamente en el curl con barra mostrado; aclarar la diferencia muscular.

**Cambios:** abs/curl-up pasa a Crunch abdominal, con aliases e instrucciones adecuados. El generador reconoce curl-up antes del curl genérico; seedVersion 6 actualiza el catálogo sin cambiar IDs. Tras verificar los GIF, el selector se limita a biceps/barbell-drag-curl. Supino usa su animación original y prono usa la de barbell-reverse-curl; cambian técnica y mapa, conservando bíceps y antebrazo. El mapa expresa énfasis orientativo, sin prometer más crecimiento. Preferencia local grip en MuscleOverride, incluida en backups v3 y aplicada por getEffectiveMedia. Los escritores de enfoque/agarre preservan campos previos.

**Archivos:** nuevos src/data/exerciseGrip.ts, src/components/ExerciseGripSelector.tsx y scripts/exercise-grip.test.mjs. Modificados catálogo, instrucciones, seed, types, effectiveMuscles, ExerciseDemo, ExerciseFocusSelector, ExercisePreviewModal, ExercisesPage, rename-catalog y package.json. Skill/contexto actualizados.

**Verificación:** 15 pruebas correctas; lint y build/PWA correctos. Generador ejecutado dos veces en copia temporal: idéntico al catálogo, sin renombrados colaterales. Chrome separado: migración concurrente v5-v6 conserva 1.277 built-ins, ejercicio propio, rutina, historial y nota; selector exclusivo y predeterminado supino; persistencia, GIF/técnica/mapa reactivos; backup real v3 y compatibilidad v2; estadísticas con ambos músculos. Vista previa con botones accesibles al final del scroll en móvil, horizontal y escritorio. Cero excepciones; capturas revisadas. Los GIF originales se descargaron y sirvieron como fixtures locales para comprobar las imágenes sin depender de la red del navegador.

**Artefactos:** C:/Users/1233896946/.codex/tmp/hardfit-grip-checks/results.json y verify-grip.mjs; copia previa hardfit-grip-before-c682431c. Primer intento del arnés consultó la miniatura en vez del GIF principal; se corrigió el selector del test y pasó. No fue un fallo de la app.

**Alcance/límites:** agarre global por ejercicio, no por serie/sesión; no sincronizado con nube. Otros curls permanecen sin selector. No se compiló APK. Servidor Vite del usuario conservado. Evidencia consultada: PMID 26300781 y Sports 2023 11(3):64; no se afirma superioridad general del prono para hipertrofia o activación absoluta del antebrazo.

## 2026-11-01 — Prensa bilateral única y botones visibles al final del scroll

**Petición:** la barra de navegación tapa Cerrar/Añadir al bajar el scroll. El usuario pide una sola Prensa de piernas con dos pies, con Cuádriceps / Isquiotibiales y glúteo / Pantorrilla.

**Cambios:** nueva política de variantes en src/data/exerciseVariants.ts: cuatro filas repetidas se ocultan del selector y catálogo; la visible es glutes/sled-45-leg-press-side-pov. Se preservan todos los registros antiguos y sus referencias, sin alterar series ni historial. Nuevas altas desde esas variantes resuelven al ID bilateral. La prensa bilateral se añade a la lista explícita de enfoques; las demás máquinas continúan sin selector.

**Ventanas:** ExerciseSelectorModal y ExercisePreviewModal se renderizan por portal al body, por encima de la navegación; altura de viewport dinámica, scroll interno con min-h-0 y pie con safe-area. Cerrar/Añadir permanecen dentro de pantalla.

**Archivos:** nuevo src/data/exerciseVariants.ts; modificados src/pages/ExercisesPage.tsx, src/components/ExerciseSelectorModal.tsx, src/components/ExercisePreviewModal.tsx, src/data/exerciseFocus.ts y scripts/exercise-focus.test.mjs. Skill actualizada con el nuevo alcance explícito. Sin cambio de esquema/seed ni borrado de registros.

**Verificación:** diez pruebas de dominio, lint y build/PWA correctos. Chrome separado: fila bilateral única en ambas listas; GIF bilateral verificado; referencias de rutina, entrenamiento y nota antiguas conservadas; tres enfoques persistidos. Al final del scroll, botones dentro del viewport y sin cobertura por navegación en móvil 390x844, horizontal 740x360 y escritorio 1280x900. Clic real en Añadir y guardado de rutina con ID bilateral correctos. Cero excepciones de ejecución; capturas revisadas.

**Artefactos:** C:/Users/1233896946/.codex/tmp/hardfit-press-modal-checks/results.json, verify-press-modal.mjs, capturas footer-*.png y muestras de GIF. Copia previa: C:/Users/1233896946/.codex/tmp/hardfit-press-modal-before-b0a9b387.

**Límites:** registros históricos conservan sus IDs y no se agregan retroactivamente como un solo ejercicio en todas las métricas. No se compiló APK. Navegador de prueba cerrado al terminar; servidor Vite del usuario conservado.

## 2026-11-01 — Limitar el enfoque a prensa horizontal y corregir extensión

**Aclaración del usuario:** las tres dominancias eran solo para la prensa horizontal. Mostró una extensión de cuádriceps erróneamente marcada como pantorrilla.

**Corrección:** se sustituye la regla general por equipo/grupo por dos IDs de prensa horizontal verificados en sus animaciones. Se mantienen diez búlgaras con dos opciones. Las otras máquinas no tienen selector y sus preferencias antiguas se ignoran. La extensión queda con cuádriceps como único músculo representado.

**Archivos:** src/data/exerciseFocus.ts, src/data/exerciseMedia.ts y scripts/exercise-focus.test.mjs. Se actualizan también las instrucciones y referencias de esta skill para impedir otra generalización. No se modifican IDs, esquema, nombres ni catálogo sembrado.

**Pruebas:** nueve pruebas de dominio; build y lint correctos. Chrome separado: se siembra focus calves para extensión/curl/hack y se confirma que no altera su anatomía; extensión sin selector en las dos vistas y estadística solo quadriceps; opciones de prensa horizontal y búlgara conservadas. Cero excepciones; capturas revisadas.

**Artefactos:** C:/Users/1233896946/.codex/tmp/hardfit-horizontal-checks/scope-results.json, capturas y verify-scope.mjs. Copia previa en C:/Users/1233896946/.codex/tmp/hardfit-horizontal-before-b711eb1d. Navegador de prueba cerrado al finalizar; servidor Vite del usuario conservado. Sin compilación APK.

**Consulta sobre hack:** se explica que la diferencia es la anchura de pies y no garantiza más crecimiento; se consultan estudios primarios de sentadilla con barra (https://pubmed.ncbi.nlm.nih.gov/36136391/ y https://pubmed.ncbi.nlm.nih.gov/19130646/), indicando el límite de extrapolación a hack.

## 2026-11-01 — Distinguir las dos sentadillas hack

**Petición:** el usuario mostró dos filas idénticas de Sentadilla hack en el selector.

**Causa y cambio:** la variante estándar y sled-closer-hack-squat compartían nombre tras el renombrado. Ahora se muestran Sentadilla hack y Sentadilla hack con pies juntos. Se preservan ambos IDs; no se fusionan ni eliminan registros.

**Archivos:** src/data/catalog.ts, scripts/rename-catalog.mjs y src/db/seed.ts. Se corrige el generador y se eleva seedVersion a 5; la actualización desde v4 usa upsert, sin borrar ejercicios ni sus referencias.

**Verificación:** build/lint y siete pruebas de enfoque correctos. Generador ejecutado dos veces en copia temporal: idempotente, sin diferencias inesperadas con el catálogo. Chrome con perfil separado: migración v4-v5 concurrente, nombres correctos tras recarga y en catálogo/selector; se conservan 1.277 ejercicios base, rutina, entrenamiento, ejercicio personalizado, nota y enfoque. Cero excepciones de ejecución. Captura móvil revisada.

**Artefactos:** C:/Users/1233896946/.codex/tmp/hardfit-hack-checks; copia anterior en C:/Users/1233896946/.codex/tmp/hardfit-hack-before-e0918236. Navegador aislado cerrado al terminar; servidor Vite del usuario conservado.

**Alcance:** corrección de esta pareja; otras familias con nombres repetidos permanecen sin cambios. No se compiló APK.

## 2026-11-01 — Enfoque muscular por variante

**Petición:** retirar casillas que permiten activar/desactivar músculos; ofrecer enfoque Glúteo/Cuádriceps en búlgaras y corregir músculos incorrectos de máquinas de pierna.

**Aclaración expresa:** el usuario eligió ofrecer las tres opciones en máquinas de pierna: Cuádriceps, Isquiotibiales y glúteo, Pantorrilla.

**Cambios:** selector de una sola opción en catálogo y vista previa; perfiles compartidos con mapa/estadísticas; guardado por exerciseId; se ignoran exclusiones antiguas. Corrección de 14 entradas de prensa/gemelos. Backup JSON v3 con preferencias y compatibilidad con backups anteriores.

**Archivos:** nuevos src/data/exerciseFocus.ts, src/components/ExerciseFocusSelector.tsx y scripts/exercise-focus.test.mjs; modificado package.json, src/types.ts, src/utils/effectiveMuscles.ts, src/utils/statsAdvanced.ts, src/utils/exportData.ts, src/data/exerciseMedia.ts, src/pages/ExercisesPage.tsx y src/components/ExercisePreviewModal.tsx. Retirado src/components/MuscleToggleList.tsx. Sin cambios de esquema/IDs.

**Verificación:** siete pruebas de dominio correctas; compilación y lint correctos. En Chrome aislado: dos opciones de búlgara, tres de máquina, exclusión mutua, persistencia tras recarga, actualización del mapa, conteos primario 1/secundario 0,5, exclusión de calentamientos/incompletas y ausencia de brazos/hombros en gemelos. Exportación/restauración real de IndexedDB, backup v3, importación legacy RepLog y vaciado explícito de preferencias correctos. Cero excepciones de ejecución en la prueba final. Capturas móviles en tema oscuro y claro revisadas.

**Incidencias resueltas:** se retiró un import de tipo sin uso que detectó la primera compilación. Se afinó la carga del selector para esperar la preferencia guardada. Los primeros intentos de automatización necesitaron esperar la carga de rutas y distinguir nombres duplicados; la comprobación final pasó.

**Artefactos externos:** C:/Users/1233896946/.codex/tmp/hardfit-focus-checks/results.json, capturas y verify-focus.mjs; originales en C:/Users/1233896946/.codex/tmp/hardfit-focus-before-c91d4e65. Inventario inicial preservado.

**Límites:** enfoque global por ejercicio; no se registra por entrenamiento ni se sincroniza en Supabase. No se compiló APK. Los GIF/fuentes remotos se bloquearon durante la prueba de navegador. El servidor Vite del usuario sigue siendo suyo; se usa un perfil de navegador separado para las pruebas.

## 2026-11-01 — Revisión inicial y memoria externa

**Petición:** revisar todos los archivos de HardFit-main para adquirir contexto general y crear una skill fuera de esa carpeta que registre el trabajo posterior.

**Trabajo realizado:** inventario completo de 177 archivos, análisis de arquitectura y funciones, revisión de configuración y scripts, consistencia del catálogo de 1.277 ejercicios, validación de formatos y comprobaciones aisladas de cálculos. Se documentaron hallazgos pendientes sin corregir la app.

**Archivos de la aplicación afectados:** ninguno. La revisión no cambió código, configuración, dependencias ni recursos.

**Memoria añadida fuera del proyecto:**
- SKILL.md: instrucciones de continuidad.
- references/contexto.md: estado, arquitectura, funciones, hallazgos y verificaciones.
- references/inventario.md: función de cada archivo revisado.
- references/inventario.json: tamaños, tipo y hash de la revisión inicial.
- references/cambios.md: esta bitácora.

**Comprobaciones:** sintaxis correcta de los 7 scripts .mjs; 10 XML válidos; 59 imágenes verificadas; JAR legible con 33 entradas; imports relativos de src resueltos; dependencias raíz y lockfile consistentes; comprobaciones aisladas de volumen, 1RM, resumen, récords y funciones de salud correctas.

**Límites:** no se instalaron dependencias ni se ejecutaron build, lint, navegador, base IndexedDB, nube o Android. La skill pasó quick_validate.py; los enlaces internos existen. La comparación con el inventario inicial confirmó 177 archivos originales, sin cambios ni archivos añadidos dentro de HardFit-main.

**Decisiones del usuario:** revisión amplia autorizada de HardFit-main; conservar contexto fuera del proyecto; avanzar sin pedir reconfirmaciones rutinarias. Esto no define todavía una modificación funcional concreta.

**Pendiente:** recibir el siguiente cambio de producto. Los problemas detectados están detallados en contexto.md y permanecen sin corregir.
