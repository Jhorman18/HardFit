# Contexto del proyecto HardFit-main / Kitaeru

Revisión inicial: 2026-11-01, zona America/Bogota.
Ruta examinada: `C:/Users/1233896946/Documents/Project Hard/HardFit-main`.
Estado documentado mediante lectura y comprobaciones locales; no se modificó código de la aplicación.

## Estado actual — seis imágenes del usuario para las dos prensas bilaterales (2026-11-03)

- Nueva decisión del usuario: las ilustraciones anteriores también quedaron rechazadas. Para Prensa horizontal y Prensa de piernas usar exactamente las seis imágenes que entregó; no generar otra anatomía ni restaurar los GIF de pantorrilla sustituidos. Esta decisión prevalece sobre las entradas de 2026-11-02 relativas a los recursos bilaterales.
- Alcance estricto: calves/lever-seated-squat-calf-raise-on-leg-press-machine y glutes/sled-45-leg-press-side-pov. Cada uno conserva los tres enfoques y ahora resuelve sus imágenes de cuádriceps, isquiotibiales/glúteo y pantorrilla desde public/animations/leg-press-user/. Copias idénticas a los originales de Downloads, verificadas por SHA-256; no se modificaron las fuentes.
- Cada imagen contiene dos posiciones. AnatomicalPressAnimation las recorta mediante un viewport SVG y alterna una por vez cada1,6s (ciclo3,2s), sin fundidos ni posiciones generadas. El SVG solo recorta las ilustraciones originales; no es un diagrama nuevo. Respeta la proporción original y prefers-reduced-motion deja la primera posición. No afirmar que se produjo un GIF/video con movimiento continuo o interpolación.
- La lámina de pantorrilla inclinada tiene las figuras invadiendo el centro en alturas distintas. Dos ventanas independientes excluyen los fragmentos vecinos; la segunda se desplaza a x1328 en el original. Se verificaron visualmente ambas posiciones sin residuos. La referencia de cuádriceps inclinada es de menor definición (600×254) que las otras cinco (2752×1536); se conserva sin inventar detalle.
- La prensa horizontal a una pierna conserva sus tres PNG originales y secuencia de cuatro poses1–2–3–4–3–2. Sus hashes no cambiaron. Catálogo/seed11/esquema5, preferencias, cargas, descansos y unidades intactos; sin cambios a otros ejercicios.
- Se retiran de public ocho recursos bilaterales sustituidos (cuatro atlas, dos GIF y dos posters), respaldados antes. PWA incorpora jpg/jpeg/webp: seis referencias nuevas y tres atlas unilaterales precargados;68 recursos totales,15228,72KiB. No quedan los bilaterales rechazados en la precarga.
- Procedencia y correspondencia: docs/press-user-images.json; instrucciones en docs/animaciones-prensas.md. press-animation-prompts.json queda como registro histórico y marca activos solo los tres recursos unilaterales.
- Verificación final:15 pruebas de enfoque/recursos correctas; lint con exclusiones CLI temporales y build correctos. Chrome móvil aislado: seis selecciones y sus dos posiciones sin superposición, proporciones, miniaturas, persistencia, movimiento reducido, secuencia unilateral, preview de entreno y PWA sin conexión después de recargar. Doce comprobaciones, cero excepciones; capturas revisadas. Sin APK ni cuenta Supabase real.
- Artefactos: .codex/tmp/press-user-images (browser-results.json, verify-browser.mjs y capturas). Respaldo .codex/tmp/press-user-images-before-10961068. Navegador y preview propios cerrados; servidor del usuario en http://127.0.0.1:5173/ conservado y respondió HTTP200.

## Estado actual — ejecución confinada de Codex con MXC comprobada (2026-11-02)

- La apertura de la CLI y /status de la entrada anterior no garantizaban ejecución de herramientas. El usuario recibió blocked by policy incluso al leer la skill: doctor mostraba sandbox backend disabled.
- Configuración actual de ambos .codex/config.toml (Project Hard y HardFit-main): [features] prefer_mxc = true. En este Windows11 compatible, doctor confirma sandbox backend mxc. Se mantienen approval_policy never, perfil hardfit-project heredado de :read-only y red deshabilitada.
- Escritura permitida en HardFit-main y en C:/Users/1233896946/.codex/skills/hardfit-contexto. La excepción adicional HardFit-main/.codex/tmp permite archivos temporales dentro de la carpeta .codex protegida. No dar escritura al resto de la configuración de Codex por inferencia.
- Verificación real: PowerShell bajo MXC leyó skill/contexto/bitácora, escribió/leyó/eliminó centinelas en el proyecto y skill, y la escritura en el directorio padre fue denegada. Repetido sin overrides de diagnóstico desde los config persistidos; .codex/tmp también pasó.
- app-server del mismo ejecutable de extensión ejecutó command/exec de lectura de la skill con la política por defecto: exitCode0 y stderr vacío. No se enviaron tareas al modelo ni se alteró la app; no se activó Full access ni se deshabilitaron restricciones.
- El lanzador iniciar-codex.cmd no cambia. Para cargar esta corrección, salir de la CLI anterior con Ctrl+C y abrirla de nuevo mediante el lanzador. Una sesión ya abierta puede conservar el backend anterior.
- Diagnósticos y respaldos: .codex/tmp/codex-startup, especialmente configured-sandbox-result.json, configured-command-results.json y windows-config-backup. Documentación de referencia: https://learn.chatgpt.com/docs/windows/windows-sandbox .

## Estado actual — arranque de Codex y perfil de escritura comprobados (2026-11-02)

- El usuario usa CMD y no tiene codex en el PATH. El ejecutable disponible es el de la extensión openai.chatgpt-26.1021.22027-win32-x64, versión 0.164.0-alpha.11.1.
- Evitar recomendar otra vez -c default_permissions=hardfit-project para el arranque: reproducía account/read → failed to load workspace requirements: invalid input parameter (-32603), tanto en alpha como en estable0.166.0. Se corrigió dejando que .codex/config.toml seleccione ese perfil. El nuevo login ya se completó y no era suficiente por sí solo.
- Ambos archivos de configuración (Project Hard/.codex/config.toml y HardFit-main/.codex/config.toml) contienen extends = ":read-only" en permissions.hardfit-project, con escritura explícita en HardFit-main y la skill externa, approval_policy never y red deshabilitada. No ampliar esos permisos por inferencia.
- El binario de extensión necesita --no-daemon cuando se usa como CLI; con el servidor compartido reclama que no tiene el paquete local completo. Comando probado con -C HardFit-main -a never --no-daemon --no-alt-screen. La TUI abrió y /status confirmó Profile hardfit-project (workspace, never). Se cerró la sesión de prueba sin ejecutar tareas del modelo.
- Lanzador listo: iniciar-codex.cmd en la raíz de HardFit-main. Contiene la ruta concreta de la extensión instalada; revisar si una actualización cambia el directorio. El lanzador abre una sesión nueva y no altera retroactivamente el sandbox de este chat del IDE.
- Diagnóstico y respaldos: .codex/tmp/codex-startup. CLI estable solo descargada a caché temporal npm, sin instalación global. Sin cambios a la app o sus datos. Las consultas de requisitos administrados devolvieron ausencia; no repetir como hecho que una política corporativa causó el error de arranque.

## Estado actual — estilo anatómico restaurado en prensas (2026-11-02)

**Decisión explícita del usuario:** las guías SVG esquemáticas de la entrada anterior quedaron rechazadas. Mantener el estilo anatómico de las ilustraciones del catálogo; plataforma alta, cambiando la posición de pies entre enfoques, y rescatar pantorrilla. No volver a sustituirlas por figuras geométricas. Referencia de edición: 3768.webp y la segunda imagen del usuario; solicitó eliminar marcas de agua.

- public/animations/leg-press-anatomical contiene siete PNG de cuatro poses anatómicas (dos filas por dos columnas), dos GIF originales recuperados y dos posters estáticos. Herramienta integrada image_gen; las ediciones mantienen el estilo anatómico, fondo blanco y no llevan marcas de agua/texto/logos. Los PNG de cada prensa cuádriceps/pies altos mantienen una plataforma alta del mismo tipo; el apoyo de los pies cambia entre variantes.
- Los GIF horizontal-calves.gif e inclined-calves.gif coinciden por hash con source-0/source-6 descargados antes de los diagramas: se restauran sin edición. La unilateral de pantorrilla tiene su propia secuencia anatómica con movimiento de tobillo.
- AnatomicalPressAnimation recorta visualmente una sola pose por vez y reproduce 1–2–3–4–3–2 mediante CSS en 4,8s, con transiciones cortas. No afirmar que se generó video continuo ni que se restauraron todos los GIF: son cuatro poses editadas, salvo los dos GIF de pantorrilla. Movimiento reducido mantiene la primera pose o usa el poster del GIF.
- pressFocus sigue usando exactamente los tres IDs autorizados. ExerciseDemo y las miniaturas mantienen enfoque guardado, instrucciones y selección reactiva. Nombre general y seed11/esquema5 siguen vigentes sin otra migración ni cambios en datos de entrenamiento.
- Se retiraron los 18 SVG anteriores, su generador y generate:press-animations para no regenerar el resultado rechazado. Respaldados fuera de public. PWA añade gif a globPatterns; once recursos anatómicos locales precargados, 70 recursos totales (aprox.15,6MiB).
- Procedencia, paths, uso y prompts finales completos: docs/animaciones-prensas.md y docs/press-animation-prompts.json. Los hashes de los nueve recursos principales se verificaron; los dos posters están referenciados en ese manifest. Las salidas originales de image_gen se conservan en .codex/generated_images y todas las imágenes consumidas por la app se copiaron al proyecto.
- Verificación: 31 pruebas, lint con exclusiones CLI temporales y build correctos; comprobación adicional de las cuatro pruebas de recursos tras la última imagen. Chrome móvil aislado verifica nueve opciones, una sola celda por imagen, secuencia real de poses, preferencias/persistencia, miniaturas, preview de entrenamiento y movimiento reducido. PWA de producción recarga y cambia los seis enfoques principales sin red; once nuevos recursos y cero SVG anteriores en caché, cero excepciones. No APK ni cuenta Supabase real.
- Resultados y capturas: .codex/tmp/anatomical-press-correction. Respaldo anterior: .codex/tmp/anatomical-press-before-acd5a559. Servidor Vite del usuario conservado; sin cambios a permisos ni exclusiones persistentes.

## Estado actual — prensas con nombre general y guías por enfoque (2026-11-02)

- Prensa horizontal: calves/lever-seated-squat-calf-raise-on-leg-press-machine, antes Elevación de talones sentado en máquina. La variante unilateral autorizada glutes/lever-horizontal-one-leg-press se llama Prensa horizontal a una pierna. La inclinada bilateral mantiene Prensa de piernas. Los tres IDs, aliases históricos y enfoques predeterminados (calves, posterior-chain, quadriceps respectivamente) se conservan; seedVersion actual 11 y esquema Dexie sigue 5.
- src/data/pressFocus.ts define los tres modos exactos, guía, colocación e instrucciones por enfoque. exerciseFocus resuelve el recurso local y la técnica desde la misma preferencia validada. No ampliar por equipo ni aplicar estas tres opciones a otras máquinas.
- Nueve guías SVG nativas y nueve posters estáticos en public/animations/leg-press. Generador scripts/generate-press-animations.mjs; comandos generate:press-animations y test:press-animations. No son GIF anatómicos: son diagramas articulados con detalle de colocación de pies y movimiento; originales del catálogo de media intactos. Las rodillas conservan flexión durante pantorrilla y se mueve el tobillo; la posición alta sigue siendo una prensa compuesta.
- Selector antes de la imagen en catálogo/vista previa, junto a indicaciones de colocación. Las miniaturas de estas prensas usan useLiveQuery para reflejar la preferencia global por ID; las otras miniaturas no agregan esta consulta. picture/source respeta prefers-reduced-motion mediante -still.svg.
- Recursos incluidos automáticamente por globPatterns SVG en la precarga PWA; comprobado en producción con red desconectada, recarga y cambio de las tres opciones. 18 guías/posters cacheados; total PWA 77 recursos.
- Verificación: 31 pruebas, lint con exclusiones CLI temporales y build completos. Chrome móvil aislado: nueve variantes, imágenes e instrucciones alineadas, miniaturas, persistencia, movimiento real, movimiento reducido y migración 10→11 con historial, cargas, unidades y descansos intactos. Cero excepciones. Sin APK/Supabase real.
- Dos regeneraciones aisladas del catálogo coinciden; 1.277 IDs preservados y solo dos filas cambiaron nombre/aliases. Auditoría final 143 nombres repetidos en 520 fichas, 1.267 visibles/10 ocultos; una familia técnica y tres ya agrupadas.
- Resultados y capturas en .codex/tmp/press-focus-animation; respaldo previo .codex/tmp/press-focus-before-ad89bc27. Servidor Vite del usuario conservado; no cambios de permisos ni exclusiones persistentes.

## Estado actual — kg/lb junto al descanso y elevaciones laterales diferenciadas (2026-11-02)

El usuario pidió revisar dos elevaciones laterales con el mismo nombre y elegir kg/lb globalmente y por ejercicio junto al descanso. Los GIF confirman una variante con mano libre apoyada en banco y otra sin apoyo: se mantienen independientes.

- Nombres: Elevación lateral con apoyo / Elevación lateral sin apoyo. Aliases e instrucciones propios en sus dos IDs existentes. Correcciones estables en rename-catalog y seedVersion 10, sin borrar ni agrupar ejercicios.
- Modelo de unidades: WeightUnit kg/lb, weightUnit opcional en WorkoutSetEntry y RoutineItemTargetSet como unidad del número guardado. Workout/Routine guardan snapshot global; WorkoutEntry/RoutineItem pueden sobrescribirlo. Settings.units sigue como predeterminado para futuras sesiones/planes. Las preferencias por ejercicio se guardan con la entrada/rutina, no como preferencia universal en muscleOverrides.
- src/utils/weightUnits.ts concentra factor exacto, conversiones, snapshots heredados, cambio global/por entrada, normalización de peso corporal y formato. Los valores guardados conservan precisión; visualización de entradas/historial redondeada a tres decimales y totales a uno. No interpretar set.weight como kg sin mirar set.weightUnit.
- RestPicker ahora incluye Unidad de peso (Global/kg/lb en ejercicios; kg/lb en contexto global). Se abre desde el mismo chip del descanso en WorkoutPage y RoutineEditorPage, con portal al body, z80 y scroll en altura dinámica. Elegir Global elimina solo el override de unidad y convierte las cargas; descanso global se restablece por su botón separado.
- Rutinas añaden restSeconds global y por item, además de las unidades; ambos inicios desde rutina copian unidades/descansos y los targetSets. Los tipos tiempo/distancia no muestran unidades de peso individuales y mantienen su semántica.
- Dexie versión 5 (antes 4): etiqueta los pesos de entrenos, rutinas y sesión activa anteriores con la unidad global que había al actualizar, conservando sus números. Settings.legacyWeightUnit registra esa interpretación de datos sin metadata. No puede reconstruir unidades antiguas que nunca se registraron; no se adivina una unidad distinta para cada ejercicio histórico.
- stats y workoutSummary normalizan a kg para sumar/comparar. UI de inicio, progreso, resumen, informes, historial y ficha de ejercicio convierte al mostrar; cada entrada histórica conserva su unidad original. Peso corporal usa la unidad de cada Measurement antes de calcular cargas corporales/asistidas, evitando sumar kg y lb.
- Backup JSON v4 incluye snapshots automáticamente; importación v2/v3 se etiqueta usando configuración de origen. CSV añade unidad_peso por fila. La sincronización normaliza registros remotos antiguos y conserva los nuevos campos; no hubo prueba en cuenta Supabase real.
- Persistencia activa: Workout.updatedAt y contador monotónico resuelven guardados en el mismo milisegundo. rehydrate recupera la copia más nueva entre localStorage e IndexedDB. Importar backup sustituye también el cache activo para respetar esa restauración explícita.
- Verificación: 27 pruebas (19 anteriores + 8 de unidades), build/PWA y lint sin advertencias con exclusión de temporales desde el comando. Chrome aislado: migración real de DB v4 en lb a v5; valores intactos, global/override/herencia por UI, recarga rápida, timer individual/global, rutina con unidad y descanso propios, cálculos kg/lb (incluye lastre/asistencia), historial/resumen/progreso, backup v4 y RepLog v3, columna CSV y las dos filas laterales. Seis grupos de comprobaciones, cero excepciones de ejecución; capturas móviles revisadas.
- El generador produjo dos catálogos idénticos en copia aislada. Informe actualizado: 145 nombres repetidos en 524 fichas; 1.277 IDs, 1.267 visibles y 10 ocultos históricos. Una familia técnica adicional y tres ya agrupadas.
- Artefactos: .codex/tmp/lateral-units con browser-results.json, verify-browser.mjs y capturas. Originales en .codex/tmp/lateral-units-before-39a2c4af. El navegador usa un perfil temporal aislado; Vite del usuario se conserva. No se compiló APK. Sin cambios a permisos ni exclusiones persistentes rechazadas.

## Estado actual — abdominal colgado con rodillas flexionadas (2026-11-02)

El usuario pidió encontrar el abdominal colgado que se ejecuta con rodillas flexionadas, como en su segunda imagen, en vez de piernas rectas. Tres GIF existentes se descargaron y compararon visualmente en varias fases; no fue necesario crear un ejercicio ni editar imágenes.

- abs/hanging-leg-hip-raise se identifica como Elevación de rodillas colgado: muestra rodillas flexionadas y elevación final de pelvis. Antes se llamaba Elevación de cadera, colgado, pierna. Aliases incluyen Elevación de piernas colgado con rodillas flexionadas, Elevaciones de piernas colgado, Abdomen en barra y Abdominales en barra.
- abs/hanging-leg-raise se distingue como Elevación de rodillas colgado a la horizontal, cuyo GIF mantiene el torso más estable y no recoge tanto la pelvis. abs/hanging-straight-leg-raise pasa a Elevación de piernas rectas colgado.
- Los tres conservan su ID, GIF, grupo Core, tipo bodyweight_reps y equipo Peso corporal. Se redactan instrucciones que correspondan a cada animación. Sin cambios de anatomía, selectores, esquema, rutinas o historial.
- Correcciones por ID en rename-catalog y seedVersion 9 para actualizar instalaciones existentes. Dos regeneraciones aisladas idénticas al catálogo final. Comparación con copia previa: solo cambian nombres/aliases de esos tres IDs y sus instrucciones; los 1.277 IDs mantienen su orden y metadatos de grupo/equipo/tipo.
- Informe de duplicados regenerado: 146 nombres repetidos en 526 fichas, 1.267 visibles y 10 ocultos históricos; una familia adicional y tres agrupadas.
- Verificación: 19 pruebas existentes, build/PWA y lint con exclusiones temporales correctos. Cinco términos de búsqueda comprobados con la normalización usada por la app. Sin nueva prueba de navegador ni APK para esta corrección de datos.
- Copia previa .codex/tmp/hanging-knees-before-b1a95fc8. GIF, comparación visual y results.json en .codex/tmp/hanging-knees. No se modifican permisos ni exclusiones persistentes del linter.

## Estado actual — conservar curl con arm blaster y barra recta (2026-11-02)

El usuario pidió recuperar el curl de barra recta que incorpora un soporte negro para los brazos, mostrando el accesorio en un GIF con mancuernas como referencia. Se identificó y verificó visualmente la animación original de biceps/barbell-biceps-curl-with-arm-blaster: barra recta y arm blaster.

- Ese ID deja de estar en EXERCISE_VARIANTS. isSelectableExercise devuelve true y getSelectableExerciseId conserva su ID: vuelve al catálogo/selector y las futuras altas ya no se redirigen al curl básico.
- Nombre: Curl con arm blaster y barra recta. Equipo: Barra recta. Se conservan el GIF original, la anatomía, las referencias antiguas y el ID. Aliases permiten buscar arm blaster, soporte de brazos y el nombre completo de bíceps/barra.
- Instrucciones específicas para colocar el soporte, apoyar los brazos y realizar el curl mostrado con palmas arriba. No se amplía el selector de agarres a esta variante; los básicos recta/Z conservan Prono/Supino. El arm blaster de barra Z sigue como antes: el usuario pidió específicamente la recta.
- Corrección por ID en rename-catalog y seedVersion 8 para actualizar nombres/equipo de instalaciones existentes mediante upsert. Sin cambios de esquema ni borrado de datos.
- Se regeneran HTML/CSV/JSON de duplicados: 1.277 IDs, 1.267 visibles, 10 ocultos históricos; siguen 146 nombres repetidos en 528 fichas, una familia técnica adicional y tres familias ya agrupadas.
- Verificación: 19 pruebas de dominio, build/PWA y lint correctos. Lint se ejecuta con --ignore-pattern=.codex/tmp/** --ignore-pattern=.codex/permission-backups/** porque el perfil de Chrome temporal de la tarea anterior queda dentro del proyecto y el cambio persistente de exclusiones fue rechazado; no se reintentó ese cambio. Generador verificado en copia aislada, dos ejecuciones idénticas. Sin nueva prueba de navegador ni APK para esta corrección de catálogo/visibilidad.
- Copia previa: .codex/tmp/arm-blaster-before-2e6de472. Animación verificada en .codex/tmp/arm-blaster. La petición de analizar otros duplicados permanece pendiente de decisiones del usuario.

## Estado actual — curl único por barra e inventario de duplicados (2026-11-02)

El usuario pidió quitar las filas repetidas de curl, distinguir barra recta de barra Z y listar todos los ejercicios que parecen duplicados antes de decidir más agrupaciones. Aclaró por respuesta explícita Prono y Supino, no neutro.

- src/data/exerciseVariants.ts conserva la ficha original biceps/barbell-drag-curl como STRAIGHT_BAR_CURL_ID y añade EZ_BAR_CURL_ID=biceps/ez-barbell-curl. Cinco variantes de barra recta y dos de Z se ocultan al elegir nuevos ejercicios y se redirigen al ID principal correspondiente. Entre las agrupadas hay demostraciones alternada/arm blaster: se simplifican por petición del usuario, no se declara equivalencia perfecta de técnica.
- La recta se llama Curl de bíceps con barra recta y su equipo es Barra recta. Z conserva su nombre y equipo. getExerciseGripDefinition solo reconoce esas dos fichas; ambas tienen Prono/Supino y predeterminado Supino. La preferencia de la ficha recta mantiene el mismo ID y no se pierde.
- Z tiene sus GIF propios (ez-barbell-curl y ez-barbell-reverse-grip-curl), verificados visualmente, e instrucciones con tramos inclinados; el selector explica que sus manos quedan en ángulo. La recta conserva los GIF anteriores. No se añadió agarre neutro ni se mezclaron tipos de barra.
- Se corrigen seis curls de muñeca con barra mal llamados bíceps: flexión/extensión de muñeca, grupo Antebrazos y aliases adecuados; se añade ese filtro en catálogo y selector. No se ocultan como bíceps. ez-barbell-spider-curl-1628 pasa a Curl araña con barra Z y permanece separado.
- Las ocho correcciones de catálogo se preservan por ID en scripts/rename-catalog.mjs. Dos regeneraciones aisladas idénticas, sin renombrados colaterales. seedVersion 7 actualiza por upsert; no cambia esquema, IDs, referencias, notas ni entrenamientos.
- scripts/audit-exercise-duplicates.mjs y npm run audit:duplicates generan docs/revision-duplicados.html/.csv/.json. Analizan los 1.277 built-ins y aplican el filtro real de visibilidad: 1.266 visibles, 11 ocultos históricos (7 curls y 4 prensas), 146 grupos de nombres repetidos y 528 fichas en esos grupos. Una familia adicional de dos extensiones de muñeca por ID técnico; tres familias ya agrupadas se muestran aparte.
- El informe HTML permite buscar por nombre/alias/ID, filtrar grupo/equipo/sección, comparar GIF bajo demanda y guardar/exportar decisiones. CSV UTF-8 con BOM para Excel. Las cifras de secciones pueden solaparse. No incluye ejercicios personalizados del IndexedDB del usuario; coincidir en nombre no demuestra equivalencia de movimiento.
- Pruebas: 18 de enfoque/agarres correctas, build/PWA y lint correctos. Chrome separado verificó migración concurrente v6-v7, 1.277 registros conservados, preferencia recta, referencias de rutina/historial/nota con IDs antiguos, dos fichas básicas en selector, alta real de Z, sus agarres en catálogo/vista previa, GIF propios, recarga y backup. Informe con 146 grupos completos, filtros, decisión persistida y exportación JSON; cero excepciones de ejecución.
- Artefactos en .codex/tmp/curl-review: browser-results.json, report-ui-results.json, verify-browser.mjs, verify-report.mjs y capturas. Originales en .codex/tmp/curl-review-before-9618e732. El navegador aislado se cierra al terminar y Vite del usuario se conserva. APK no compilado.
- Alcance pendiente: el usuario quiere analizar los 146 grupos siguientes; no son una orden para fusionarlos todos. Hay variantes con nombres repetidos (p. ej. anchura de agarre) que permanecen explícitamente para ese análisis.

## Estado actual - Permisos locales guardados (2026-11-01)

Configuraciones locales en Project Hard/.codex/config.toml y HardFit-main/.codex/config.toml: perfil hardfit-project, approval_policy never, escritura en HardFit-main y la skill hardfit-contexto ademas de temporales del sistema. Red restringida; lectura general conservada. Ambos puntos de entrada marcados trusted en el config de usuario, sin cambiar valores globales de sandbox, modelo ni esfuerzo. No editar politicas administradas. Es necesario que el cliente cargue la configuracion local: seleccionar Custom (config.toml) y reabrir si procede. La sesion que creo los archivos sigue bajo su politica inyectada de solo lectura hasta que la aplicacion la reconfigure. El usuario no quiere preguntas de permiso rutinarias; continuar dentro del alcance autorizado y distinguir configuracion guardada de permisos efectivos.

## Estado actual — abdominal corregido y agarres del curl mostrado (2026-11-01)

El usuario mostró un curl-up abdominal llamado Curl de bíceps y solicitó Prono/Supino solo en la ficha de curl con barra de su segunda captura.

- Se verificaron los GIF originales. La primera ficha es abs/curl-up: ahora Crunch abdominal, grupo Core y peso corporal conservados. Se eliminó el alias falso curl biceps y se redactaron instrucciones del curl-up mostrado, con una pierna flexionada y manos bajo la zona lumbar.
- scripts/rename-catalog.mjs reconoce curl-up(s)? como crunch antes de la regla genérica de bíceps. Su prioridad por longitud se comprobó con dos regeneraciones en copia aislada: catálogo idéntico, sin cambios en otras fichas.
- seedVersion sube de 5 a 6 para actualizar instalaciones existentes por ID. La purga heredada sigue limitada a versiones <4. Dos llamadas concurrentes verificadas; 1.277 built-ins conservados, más ejercicio propio, rutina, entrenamiento y nota de prueba sin cambios.
- La captura del curl con barra corresponde a biceps/barbell-drag-curl, no a biceps/barbell-curl ni a las variantes alternadas/arm blaster que comparten nombre. src/data/exerciseGrip.ts limita el selector a ese ID exacto.
- Supino es el predeterminado: palmas arriba, GIF original, énfasis de bíceps y antebrazo secundario. Prono: palmas abajo, GIF existente biceps/barbell-reverse-curl, énfasis orientativo de antebrazo y bíceps secundario. Ambos músculos permanecen representados; no se asignan porcentajes de EMG ni se promete mayor hipertrofia.
- ExerciseGripSelector aparece en catálogo y vista previa, antes de la animación. Instrucciones y GIF cambian con la selección; ExerciseDemo acepta gifUrl y registra errores por URL, permitiendo mostrar la otra variante si una URL falla.
- MuscleOverride añade grip?: 'supinated' | 'pronated' en la tabla Dexie existente; sin cambio de esquema ni de ID. Ambos selectores preservan otros campos al guardar. getEffectiveMedia combina enfoque y agarre, de modo que mapas/estadísticas comparten la elección. Backup JSON v3 ya incluye la preferencia y se verificó su restauración real y compatibilidad RepLog v2.
- La selección es una preferencia local por ejercicio, como el enfoque: no queda capturada por serie o sesión y puede cambiar la representación de estadísticas previas. No se sincroniza con Supabase. No se fusionó ni ocultó la entrada inversa existente.
- Verificación: 15 pruebas de enfoque/agarre, build/PWA y lint correctos. Chrome con perfil separado: migración v5-v6, conservación de referencias, técnica/animaciones con los GIF reales servidos como fixtures locales, persistencia al recargar, backup y estadísticas. Footer de vista previa visible y accesible en 390x844, 740x360 y 1280x900. Cero excepciones de ejecución; capturas revisadas.
- Artefactos: C:/Users/1233896946/.codex/tmp/hardfit-grip-checks/results.json, verify-grip.mjs, capturas y GIF. Copia previa: C:/Users/1233896946/.codex/tmp/hardfit-grip-before-c682431c. APK no compilado.
- Evidencia: https://pubmed.ncbi.nlm.nih.gov/26300781/ y https://www.mdpi.com/2075-4663/11/3/64 . El supino suele favorecer al bíceps; el prono modifica la contribución relativa del braquiorradial. No afirmar que el prono garantiza mayor activación absoluta del antebrazo o más crecimiento: el estudio de 2023 encontró mayor excitación del braquiorradial con supino bajo sus condiciones.
- Hallazgo fuera de alcance: existen otros nombres genéricos de curl que mezclan variantes (incluso curls de muñeca). No se corrigieron automáticamente ni se amplió el selector a ellos.

## Estado actual — prensa bilateral única y ventanas sin solapamiento (2026-11-01)

El usuario solicita una sola entrada de la prensa inclinada mostrada, conservando la versión de dos pies y ofreciendo los mismos tres enfoques de la horizontal. También solicita corregir los botones de la vista previa tapados por la navegación al bajar todo el scroll.

- src/data/exerciseVariants.ts define BILATERAL_LEG_PRESS_ID = glutes/sled-45-leg-press-side-pov, con GIF bilateral verificado visualmente. Oculta cuatro variantes de igual nombre al elegir ejercicios: calves/sled-calf-press-on-leg-press, calves/sled-one-leg-calf-press-on-leg-press, glutes/sled-45-degrees-one-leg-press y glutes/sled-45-leg-press-back-pov.
- isSelectableExercise se aplica en ExercisesPage y ExerciseSelectorModal. Los registros antiguos, rutinas, notas y entrenamientos no se borran ni migran; siguen accesibles por ID para preservar el historial. No se fusionaron retrospectivamente las estadísticas de esos IDs.
- getSelectableExerciseId convierte futuras altas desde selector/vista previa a la entrada bilateral. Se mantienen los ejercicios personalizados.
- La prensa bilateral ahora tiene tres enfoques y predeterminado Cuádriceps. Se mantienen dos entradas de prensa horizontal y diez búlgaras; no se amplía a extensiones, curls, hack, Smith ni otras máquinas.
- ExerciseSelectorModal y ExercisePreviewModal usan createPortal en document.body, niveles 60/70, altura dinámica de viewport, contenido flex con min-h-0 y scroll interno, y footer con espacio para safe-area. Esto evita que la navegación z-50 o el backdrop del selector tapen los botones.
- Diez pruebas de dominio, build/lint y generación PWA correctos. Chrome aislado verificó una sola fila en catálogo/selector, tres enfoques persistidos y conservación de referencias previas. Footer al final del scroll visible y con hit testing correcto en 390x844, 740x360 y 1280x900. Un clic real por coordenadas en Añadir guardó una rutina con el ID bilateral.
- Resultados y capturas: C:/Users/1233896946/.codex/tmp/hardfit-press-modal-checks/results.json. Copia previa: C:/Users/1233896946/.codex/tmp/hardfit-press-modal-before-b0a9b387. Pruebas web; APK no compilado. Sin cambios de esquema ni seedVersion (5).

## Estado anterior — selector limitado a prensa horizontal (2026-11-01)

La última aclaración del usuario limita las tres opciones a la máquina de prensa horizontal. La implementación inicial para todas las máquinas de pierna tenía un alcance excesivo y queda sustituida.

- src/data/exerciseFocus.ts usa una lista explícita de dos IDs de prensa horizontal, verificados visualmente en sus GIF: glutes/lever-horizontal-one-leg-press y calves/lever-seated-squat-calf-raise-on-leg-press-machine. quads/lever-alternate-leg-press se excluye: su animación muestra una prensa inclinada, pese a su nombre genérico.
- Solo esas dos entradas tienen Cuádriceps / Isquiotibiales y glúteo / Pantorrilla. Las diez búlgaras conservan Glúteo/Cuádriceps. Total: doce entradas con selector.
- Extensiones, curls femorales, hack, prensas inclinadas, Smith y demás máquinas vuelven a anatomía automática sin selector. Las preferencias guardadas fuera del alcance se conservan en almacenamiento pero se ignoran al resolver músculos; también se ignoran si se restauran desde un backup antiguo.
- Se corrige src/data/exerciseMedia.ts para que quads/lever-leg-extension tenga solo quadriceps/Cuádriceps, sin secundarios de glúteos/isquiotibiales. No hay cambio de IDs, esquema ni seedVersion (sigue en 5).
- Nueve pruebas de enfoque correctas, build/lint correctos. Chrome aislado verificó preferencia antigua calves en extensión, mapa Cuádriceps, ausencia de selector en catálogo y vista previa, y estadísticas {quadriceps:1}; también verificó prensa y búlgaras.
- Capturas y resultados: C:/Users/1233896946/.codex/tmp/hardfit-horizontal-checks/scope-results.json. Copia previa: C:/Users/1233896946/.codex/tmp/hardfit-horizontal-before-b711eb1d.
- Sobre hack: se mantienen nombres distintos por postura, sin prometer más hipertrofia por acercar los pies. Evidencia consultada en PubMed PMID 36136391 y 19130646: estudios de sentadilla con barra, no una comparación longitudinal de hipertrofia en hack.

## Estado actual — nombres de sentadilla hack (2026-11-01)

Se diferenciaron dos entradas que se mostraban con el mismo nombre: glutes/sled-hack-squat conserva Sentadilla hack y glutes/sled-closer-hack-squat pasa a Sentadilla hack con pies juntos. Se conservan ambos IDs, los GIF y las referencias existentes.

- src/data/catalog.ts cambia solo el nombre de la variante closer.
- scripts/rename-catalog.mjs conserva el modificador con pies juntos para closer-hack-squat; dos ejecuciones sobre una copia aislada producen el mismo catálogo y no alteran otros nombres.
- src/db/seed.ts usa CATALOG_SEED_VERSION = 5. La actualización v4 a v5 hace upsert del catálogo; el borrado heredado de built-ins sigue limitado a versiones anteriores a 4.
- Chrome aislado verificó dos llamadas concurrentes de seed, nombres distintos tras recarga y en el selector, conservación de 1.277 built-ins, rutina, historial, ejercicio propio, nota y enfoque.
- Build, lint y las siete pruebas de enfoque pasan. Captura y results.json en C:/Users/1233896946/.codex/tmp/hardfit-hack-checks. Originales en C:/Users/1233896946/.codex/tmp/hardfit-hack-before-e0918236.
- El cambio se limita a estas dos variantes; no se fusionaron ni eliminaron ejercicios ni se renombraron otras familias con nombres coincidentes.

## Estado anterior — enfoque muscular generalizado (2026-11-01; alcance corregido)

Primer cambio funcional completado: se eliminó MuscleToggleList y se sustituyó por ExerciseFocusSelector. La búlgara ofrece Glúteo/Cuádriceps; las máquinas de pierna ofrecen Cuádriceps, Isquiotibiales y glúteo, Pantorrilla, según la aclaración expresa del usuario. La búlgara en Smith conserva sus dos enfoques específicos.

- src/data/exerciseFocus.ts define perfiles y resuelve músculos primarios/secundarios. Cubre diez variantes de búlgara y 59 máquinas adicionales, incluidas poleas y Smith. No ofrece controles para excluir músculos ni selector en ejercicios ajenos a estas familias.
- getEffectiveMedia aplica el perfil seleccionado; el mapa y las estadísticas usan el mismo resultado. Los músculos secundarios del perfil siguen presentes automáticamente.
- MuscleOverride admite focus y mantiene disabled opcional por compatibilidad. Los antiguos disabled ya no alteran el resultado. La tabla y el esquema Dexie v4 se conservan.
- La preferencia es global por exerciseId y se guarda localmente. Las estadísticas históricas se recalculan con la preferencia actual; no se añadió una selección por sesión.
- Se corrigieron 14 entradas base de gemelos y prensa que atribuían tríceps/hombros incorrectamente. No se cambiaron IDs, nombres ni URLs de GIF.
- Backup JSON pasa a v3 e incluye muscleOverrides. Restaurar v3 reemplaza esas preferencias; importar un backup anterior sin esa tabla conserva las preferencias existentes. Sigue aceptando app RepLog. La nube sigue sin sincronizar estas preferencias.
- Hay dependencias instaladas y dist generado en esta etapa. La revisión inicial, sus cifras e inventario permanecen como referencia histórica.
- Nuevo comando npm run test:exercise-focus: siete pruebas de perfiles y datos, con Node --experimental-strip-types.
- Se verificaron build/lint, selección exclusiva en ambas vistas, recarga, IndexedDB, compatibilidad con exclusiones antiguas, conteos musculares/radar y round-trip de backup v3/legacy. Capturas móviles oscuras y claras y resultados en C:/Users/1233896946/.codex/tmp/hardfit-focus-checks.
- Copia previa de los archivos modificados: C:/Users/1233896946/.codex/tmp/hardfit-focus-before-c91d4e65. El inventario SHA-256 inicial no se sobrescribe.
- Android nativo no se compiló ni se probó. Se validó la interfaz web que comparte el paquete Android.

## Alcance y evidencia

Se enumeraron y leyeron los bytes de los **177 archivos**, incluidos archivos ocultos, configuraciones, datos generados y recursos Android. Tamaño: **5.735.728 bytes** (aproximadamente 5,47 MiB). Hay **117 archivos de texto**, con **74.880 líneas**, y **60 binarios**: 58 PNG, un JPG y un JAR de Gradle.

Se revisaron las responsabilidades, los flujos y la lógica de las pantallas/componentes, la persistencia, sincronización, cálculos, scripts y configuración. Los grandes archivos de datos se analizaron completos como estructuras y por consistencia de IDs. Las 59 imágenes se verificaron con Pillow; se visualizaron el logo fuente, iconos y muestras de splash. El JAR se inspeccionó como ZIP: 33 entradas, sin entrada corrupta. No se afirma haber revisado manualmente cada línea de coordenadas SVG, cada dato del catálogo o cada clase compilada del JAR.

El inventario adjunto enumera cada archivo, su función, tamaño y SHA-256 inicial. No hay AGENTS.md dentro del proyecto ni instrucciones de ese nombre en los ancestros revisados. No se encontró .git, node_modules, dist, .env, APK, proyecto iOS, backend propio, migraciones SQL ni configuración de CI en esta copia.

## Qué producto es

Es un diario personal de entrenamiento de fuerza y acondicionamiento, en español y pensado principalmente para móvil. Es una SPA React instalable como PWA y empaquetable en Android mediante Capacitor. El trabajo normal se realiza con datos locales, sin cuenta. Supabase añade acceso por correo/contraseña y sincronización opcional.

Identidad actual:
- Carpeta: HardFit-main.
- Marca visible, README, título y manifest PWA: Kitaeru.
- package.json: kitaeru, versión 0.0.0.
- Cabecera Layout: v0.1.
- Android: versionName 1.1, versionCode 2.
- Identificadores históricos: base IndexedDB replog, claves localStorage replog_*, tabla Supabase replog_records, appId y paquete Java com.replog.app.
- LICENSE: MIT del código propio, copyright 2026 Jhorman Cortes. CREDITS.md aún usa RepLog y declara condiciones particulares sobre datos de terceros. Esta revisión reproduce lo documentado localmente, sin verificar jurídicamente esas licencias.

No hay módulos implementados de comunidad, pagos, entrenadores, chat, planes nutricionales registrados, integración con wearables o entrenamiento generado por IA. Las funciones de salud son estimaciones matemáticas locales.

## Inventario inicial por carpeta

| Ubicación | Archivos | Responsabilidad |
| --- | ---: | --- |
| Raíz | 17 | Dependencias, documentación, HTML y configuración de web/Android |
| src | 67 | Aplicación, datos, UI, persistencia, cálculos y sincronización |
| scripts | 7 | Catálogo, recursos gráficos y carga de backup a nube |
| android | 77 | Contenedor Capacitor, Gradle, manifest y recursos nativos |
| assets | 4 | Logo fuente JPG y tres PNG maestros |
| public | 5 | Iconos web/PWA |

Dentro de src: 10 pantallas TSX, 18 componentes TSX, App.tsx, main.tsx, 37 archivos .ts en el conjunto total del proyecto, CSS y el JSON de instrucciones. Ver inventario.md para la función de cada archivo.

## Stack y herramientas

Las versiones siguientes se obtuvieron del lockfile local, sin consultar registros externos:
- React y React DOM 19.3.1; React Router 7 declarado en package.json.
- Vite 8.3.4, TypeScript 6.0.3 y Tailwind 3.4.19.
- Dexie 4.4.6 y dexie-react-hooks para IndexedDB y consultas reactivas.
- Zustand 5.0.15 para entrenamiento activo, autenticación, sync y tema.
- Recharts para gráficas; date-fns para fechas en español.
- Supabase JS 2.118.0.
- Capacitor Core/Android 8.5.3, Filesystem, Share y Local Notifications.
- html-to-image para generar PNG del resumen; Lucide para iconos.
- Oxlint para lint, Sharp para scripts de iconos, vite-plugin-pwa para service worker.
- Lockfile v3: 767 entradas en packages, incluida la raíz; las dependencias declaradas de la raíz coinciden con package.json.

El Node disponible en esta sesión es 26.8.1. El lockfile exige Node >=22 para Capacitor CLI y ^20.19.0 o >=22.12.0 para Vite. No se localizó java en PATH. El README indica Node 20+ y SDK 35, mientras el proyecto Android usa SDK 36 y Java 21.

Comandos del proyecto: npm run dev; npm run build (tsc -b y vite build); npm run lint; npm run preview; fetch:catalog; fetch:muscles; fetch:gifs. Existe test:exercise-focus para las reglas de enfoque muscular; no hay suite completa de la aplicación.

## Arranque, navegación y organización

main.tsx importa CSS y tema, registra el service worker y monta App en StrictMode.
App ejecuta seedIfEmpty, rehidrata la sesión de entrenamiento e inicializa autenticación. Las pantallas se cargan con lazy/Suspense. BrowserRouter define 12 patrones de ruta de pantalla y un fallback.

Layout contiene cabecera, siete accesos inferiores, Outlet, barra de descanso y onboarding de salud. El contenido se presenta en un marco móvil centrado; Medidas se alcanza desde enlaces de otras pantallas.

| Pantalla | Ruta | Comportamiento |
| --- | --- | --- |
| HomePage | / | Racha semanal, entrenamientos, volumen acumulado, dos sesiones recientes, tres rutinas rápidas y accesos |
| WorkoutPage | /workout | Entrenamiento libre o rutina activa, cronómetro, ejercicios, series, marcas completadas y descanso |
| WorkoutSummaryPage | /workout/summary/:id | Duración, volumen, series, ejercicios, récords, equivalencias de peso y PNG para compartir |
| HistoryPage | /history y /history/:id | Listado/detalle, borrar, editar sesiones finalizadas y crear entrenamientos pasados |
| RoutinesPage | /routines | Crear/renombrar/borrar/reordenar carpetas, listar/borrar/reordenar rutinas y empezar sesión |
| RoutineEditorPage | /routines/new y /routines/:id/edit | Nombre, carpeta, ejercicios ordenados y series objetivo por tipo |
| ExercisesPage | /exercises | Búsqueda, filtros, detalle, instrucciones, mapa, historial, notas y ejercicios propios |
| StatsPage | /stats | Resumen y avanzadas; tab=avanzadas en query string |
| MeasurementsPage | /measurements | Crear/editar/borrar medidas, resumen de últimas medidas y gráficas por tipo |
| SettingsPage | /settings | Temas, acento, unidades, descanso, RPE, perfil de salud, cuenta, sync y backup |

## Entrenamientos y rutinas

El modelo distingue weight_reps, bodyweight_reps, bodyweight_assisted, duration y distance. Cada serie conserva tipo, carga, reps, RPE opcional, segundos, metros y si está completada. Hay series normales y de calentamiento.

WorkoutStore permite empezar vacío o desde rutina, añadir/quitar/reemplazar ejercicios, añadir/copiar/quitar series, actualizar valores, nombre y notas, descartar y finalizar. Al añadir una serie se copian valores de la anterior. En sesión activa se mantiene al menos una serie por ejercicio. El editor de historial permite quitar todas las series.

La sesión activa se guarda en settings con id active_workout y también en localStorage replog_active_workout. Se rehidrata al abrir la app. Al finalizar, se guarda en workouts, se borra el borrador activo y se intenta sync en segundo plano.

WorkoutPage muestra valores previos como referencia para cada ejercicio. Terminar guarda la sesión incluso si tiene series incompletas; las estadísticas las excluyen.

Las rutinas guardan ejercicios ordenados con series objetivo. Por defecto se proponen tres series de 10 reps, tres de 60 segundos para duración o una de 1.000 metros para distancia. Las carpetas permiten reordenar y borrar sin perder rutinas: al borrar una carpeta, sus rutinas quedan sin carpeta.

Descanso efectivo: valor por ejercicio, después por entrenamiento, después ajuste global y finalmente 120 segundos. Cero desactiva el inicio automático. La barra usa una hora objetivo y permite sumar/restar 15 segundos o saltar. El temporizador se mantiene en memoria: la sesión persiste, el estado restTimer no se rehidrata.

En web se usan audio y vibración cuando se ejecuta el código de la barra. En nativo se programan notificaciones locales 7001 y 7002 con canales rest-ongoing/rest-done. updateRestCountdown es intencionalmente un no-op para evitar emitir una notificación cada segundo. La precisión real con pantalla bloqueada requiere prueba en Android.

## Datos locales y persistencia

RepLogDatabase extiende Dexie y abre la base replog. El esquema evolucionó de v1 a v4 sin eliminar las tablas existentes:
- exercises: catálogo y ejercicios personalizados.
- folders: carpetas de rutinas.
- routines: plantillas y series objetivo.
- workouts: sesiones finalizadas.
- measurements: valores, tipo, fecha y unidad.
- settings: registro app y borrador active_workout.
- syncMeta: hashes, cursor y fechas de sincronización, desde v2.
- exerciseNotes: notas por exerciseId, desde v3.
- muscleOverrides: preferencia de enfoque por ejercicio y registros antiguos disabled, desde v4.

seedIfEmpty usa una transacción para soportar las llamadas concurrentes de StrictMode. Crea ajustes kg/120s si faltan; purga registros demo-* de workouts y measurements; siembra/repara catálogo con seedVersion 5 cuando la versión es anterior o faltan ejercicios predeterminados. No modifica ejercicios isCustom en la operación de borrado de built-ins.

Las preferencias de tema viven aparte en localStorage replog_theme y replog_theme_vars, y no forman parte del backup de Dexie ni del sync.

## Catálogo y recursos de ejercicios

Los tres conjuntos actuales tienen exactamente los mismos **1.277 IDs**, todos únicos:
- catalog.ts: nombre, equipo, grupo, tipo y aliases.
- exerciseMedia.ts: GIF remoto y músculos primarios/secundarios, con nombres en español.
- exerciseInstructions.json: instrucciones; no hay entradas vacías.

Grupos: Pierna 277; Espalda 198; Bíceps 181; Core 168; Pecho 153; Tríceps 140; Hombro 131; Cardio 29.
Tipos: 820 carga/reps, 355 peso corporal, 17 asistidos, 85 duración. El tipo distancia existe en UI/modelo, pero no hay ejercicios predeterminados de ese tipo.
Equipos: Peso corporal 449; Mancuerna 270; Polea 155; Barra 139; Máquina 89; Banda 62; Máquina (Smith) 47; Kettlebell 41; Barra Z 22; Otro 3.
Todos tienen aliases. Los 29 ejercicios sin músculos primarios son los de cardio.

La búsqueda normaliza tildes y mayúsculas y usa aliases. El selector tiene además sinónimos para búlgara/split squat. La lista se amplía en grupos de 60. El usuario puede crear ejercicios con cualquiera de los cinco tipos y eliminarlos; los personalizados no reciben automáticamente GIF, instrucciones ni anatomía detallada.

Los 1.277 GIF se referencian en jsDelivr, dataset ExerciseGymGifsDB fijado a v1.1.0; no se incluyen archivos GIF en la carpeta. ExerciseDemo tiene lazy loading y fallback de icono al fallar. Las instrucciones se importan dinámicamente al abrir detalle.

BodyMuscleChart dibuja frente y espalda usando paths SVG portados del body-highlighter. Permite vista de músculos primarios/secundarios o calor relativo por periodo, con diez colores entre amarillo, naranja y rojo. ExerciseFocusSelector guarda una dominancia en muscleOverrides; getEffectiveMedia resuelve el perfil y las exclusiones antiguas se ignoran.

## Estadísticas, medidas y salud

Regla central: una serie válida está completada y no es warmup.
- 1RM: Epley, carga * (1 + reps / 30); con una repetición se usa la carga.
- Volumen de carga: peso * reps.
- Peso corporal: (peso corporal de referencia + lastre) * reps.
- Asistido: max(0, peso corporal de referencia - asistencia) * reps.
- Duración/distancia: volumen cero.
- Racha semanal de lunes a domingo; si aún no se entrenó esta semana, puede continuar desde la anterior.
- Progreso por ejercicio: 1RM, volumen, peso o reps; volumen semanal de 12 semanas.
- Avanzadas: top 10 por frecuencia, mapa semanal, radar de seis regiones comparando 7/30 días con el periodo previo e informe mensual.
- En el mapa muscular, los músculos primarios cuentan 1 y secundarios 0,5 por serie. El radar agrupa sin duplicar una región primaria.

summarizeWorkout compara con sesiones cronológicamente anteriores, requiere historial previo y usa mejoras estrictas para récords. Los indicadores checkSetPR de otras vistas incluyen empates con el máximo histórico; no son exactamente la misma definición.

Medidas estándar: peso, grasa, pecho, cintura, cadera, brazo, muslo, pantorrilla, hombros y cuello. Guardan su unidad. Hay resúmenes con diferencia respecto al registro anterior y evolución temporal.

El onboarding y Ajustes guardan sexo, edad, altura y actividad. healthMetrics calcula IMC, TMB Mifflin-St Jeor, gasto estimado por actividad, rango de peso, grasa Deurenberg, FC máxima Tanaka y cinco zonas, hidratación, macros y calorías estimadas de entrenamiento. No hay sensores conectados ni registro de alimentos.

El resumen final incluye equivalencias de volumen con objetos/animales y genera imagen mediante html-to-image. Web usa Web Share o descarga; Android usa Filesystem/Share.

## Nube y respaldo

supabase.ts solo crea cliente si existen VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY. En esta copia solo hay .env.example con valores de ejemplo.

AuthStore permite registro, acceso y salida; traduce errores frecuentes. Inicia sincronización al recuperar sesión o entrar. Al salir borra syncMeta, pero conserva el resto de los datos locales.

sync.ts usa replog_records con user_id, collection, doc_id, data, updated_at y deleted. Descarga cambios posteriores a un cursor, calcula hashes deterministas, aplica remotos si no hay cambios locales pendientes y sube modificaciones/borrados lógicos. Las operaciones se serializan con un indicador en memoria.

Se sincronizan ejercicios personalizados, carpetas, rutinas, entrenamientos, medidas y settings/app. No se sincronizan catálogo de fábrica, sesión activa, notas de ejercicios, muscleOverrides ni tema. No hay conexión realtime ni sincronización automática después de cada edición local: además del login/inicio hay botón manual y un intento al finalizar entrenamiento.

buildBackup produce JSON v3 app Kitaeru y acepta al importar backups identificados como Kitaeru o RepLog. Incluye exercises, folders, routines, workouts, measurements, settings, exerciseNotes y muscleOverrides; settings puede incluir sesión activa. No incluye syncMeta ni localStorage del tema. La importación descarga antes una copia y reemplaza las tablas en una transacción; muscleOverrides solo se reemplaza cuando el backup incluye ese array. Mantiene syncMeta.

Exporta CSV de entrenamientos con una fila por serie y CSV de medidas, con BOM para Excel. Las descargas nativas usan Filesystem y Share.

No hay SQL de creación de replog_records ni políticas RLS en la copia. Las afirmaciones del README sobre RLS no permiten verificar el estado del servidor.

## Apariencia, PWA y Android

Tres temas: Clásico oscuro, Kitaeru azul/negro con naranja, y Claro. Nueve colores de acento definidos; se oculta blanco en tema claro y negro en oscuro; acepta color personalizado. applyTheme ajusta variables, color-scheme y meta theme-color. index.html aplica variables guardadas antes de React para reducir parpadeo. El tema Kitaeru carga Geist y Archivo desde Google Fonts.

Tailwind convierte escalas neutral y colores de estado en variables; bg-white/border-white/ring-white se usan como acento y text-black como contraste. Un reemplazo literal de esos nombres puede alterar la intención.

VitePWA configura actualización automática, manifest standalone, inicio / y orientación portrait. Cachea assets web y GIF con CacheFirst, hasta 800 entradas durante 60 días. Esto no equivale a tener los 1.277 GIF descargados para uso offline.

Android: minSdk 24, compile/target 36, Java 21, Android Gradle Plugin 8.13.0 y wrapper Gradle 8.14.3. MainActivity solo extiende BridgeActivity. Manifest declara Internet, vibración y notificaciones. Plugins: Filesystem, Local Notifications y Share. Los recursos incluyen densidades ldpi a xxxhdpi, iconos adaptativos y splashes por orientación/modo.

Logo actual: brazo sosteniendo mancuerna, negro/gris sobre blanco. make-official-icon genera a partir de IconoRepLog-sinletras.jpg. generate-icons es un diseño alternativo de mancuerna sobre fondo oscuro y sobrescribe varios destinos comunes.

## Scripts: funciones y efectos

| Script | Función y situación |
| --- | --- |
| fetch-catalog.mjs | Descarga ExerciseGymGifsDB v1.1.0, deduplica por nombre, genera catálogo/media/instrucciones; su salida no incluye el enriquecimiento de aliases |
| rename-catalog.mjs | Reescribe nombres desde slugs y conserva aliases; requiere inspección al regenerar datos |
| fetch-exercise-muscles.mjs | Flujo antiguo para 42 seeds; genera exerciseMuscles.ts, que no existe ni es importado por la app actual |
| fetch-exercise-gifs.mjs | Flujo antiguo para 42 seeds; descarga GIF, genera exerciseGifs.ts y borra imágenes antiguas; no es el flujo actual |
| make-official-icon.mjs | Genera los iconos actuales a partir del JPG del brazo |
| generate-icons.mjs | Genera iconos de otro diseño y SVG; comparte archivos de salida con el anterior |
| subir-backup-nube.mjs | Inicia sesión y hace upsert de un backup en Supabase; dry-run también inicia sesión, aunque omite escrituras de registros |

Solo se leyó y comprobó la sintaxis de estos scripts: no se ejecutaron descargas, regeneraciones ni cargas a nube.

## Hallazgos para futuras mejoras

Son observaciones del código local; no se corrigieron en esta revisión. Confirmar comportamiento con pruebas apropiadas antes de atribuir efectos en una instalación concreta.

1. **Personalización y nube.** Resuelto el respaldo JSON de muscleOverrides con v3. Los enfoques y exerciseNotes siguen fuera de sync; el tema tampoco viaja.
2. **Resultado de sync potencialmente engañoso.** Errores por fila/push/borrado/colección se registran y el flujo puede terminar con success: true y lastSyncAt actualizado. También puede avanzarse el cursor más allá de filas que fallaron.
3. **Conflictos y cuentas.** Se preserva el documento local sucio y se vuelve a subir; no se comparan timestamps de edición de ambos lados para un LWW estricto. La base no se divide por usuario: tras salir y entrar en otra cuenta los datos locales continúan y pueden subirse a la nueva cuenta.
4. **Unidades y peso histórico.** Cambiar kg/lb solo cambia settings.units; no convierte registros existentes. Varias pantallas toman la última cifra de bodyweight sin usar measurement.unit y la reutilizan para todas las sesiones históricas. La equivalencia final recibe totalVolumeKg sin convertir a kg si los datos se introdujeron en lb.
5. **Edición de historial desigual.** La tabla de edición usa peso/reps para todos los tipos; no ofrece la misma edición específica de duración/distancia que WorkoutPage. Cambiar ejercicio mantiene valores de series, incluso entre tipos diferentes.
6. **Filtro de máquinas.** MACHINE_EQUIPMENT solo contiene Máquina y Polea: 47 ejercicios Máquina (Smith) quedan bajo Sin máquina. La lógica está duplicada entre página y selector.
7. **Resumen con ID inexistente.** db.get devuelve undefined al no existir; summary permanece null y la condición de carga precede a la rama de inexistente. Es probable un spinner permanente al abrir una URL de un entreno eliminado. No se verificó en navegador.
8. **Android requiere comprobaciones reales.** El test instrumentado espera com.getcapacitor.app, pero el paquete actual es com.replog.app. Las notificaciones nombran ic_stat_icon_config_sample sin un recurso de ese nombre en el árbol de la app; debe comprobarse el resultado al integrar dependencias. No se garantiza precisión de alarmas por comentarios del código.
9. **Documentación desfasada.** README menciona generador de demos que no aparece en la UI/código actual; solo existe purga demo-*. También difieren Node/SDK, versiones visibles y marcas. Home afirma ausencia de servidores externos aunque existen nube opcional, GIF remotos y fuentes.
10. **Regeneración del catálogo.** fetch:catalog reemplaza nombres/aliases enriquecidos. seedVersion actual es 5: futuros cambios de contenido manteniendo la cantidad de registros requieren incrementar la versión para actualizar bases existentes. Preparar migración cuando corresponda.
11. **Recursos y mantenimiento.** includeAssets menciona favicon.svg, ausente; index.html usa el favicon.png existente. Hay dos generadores de iconos con resultados diferentes. Los scripts antiguos no producen los módulos usados actualmente.
12. **Consistencia de métricas y respaldo.** CSV calcula peso*reps sin excluir calentamientos/incompletas y usa cero para corporal/asistido, a diferencia de estadísticas. El importador valida de forma superficial la estructura y conserva syncMeta; desde v3 sí restaura muscleOverrides. Revisar el comportamiento conjunto con nube.
13. **Cobertura y estructura.** Hay siete pruebas de enfoque muscular y una verificación de navegador ejecutada fuera del repo; sigue sin haber suite general ni CI. Los dos tests Java son ejemplos de plantilla. Varias pantallas reúnen mucha lógica y presentación (History ~49 KB, Settings ~47 KB, Workout ~39 KB), con duplicación de búsqueda, formatos y lectura de peso.

## Verificaciones realizadas y límites

Correctas:
- Inventario de 177 archivos con lectura binaria y SHA-256.
- Los 1.277 IDs son únicos y coinciden entre catálogo, media e instrucciones; todas las instrucciones tienen contenido.
- Comprobación estática de imports relativos de src sin destinos faltantes.
- package.json y raíz del lockfile coinciden en identidad, versión y dependencias.
- node --check sobre los siete .mjs, sin ejecutar sus acciones.
- Los diez XML se analizan correctamente.
- Las 59 imágenes se verifican con Pillow; JAR sin entradas dañadas.
- Comprobaciones aisladas, en memoria y sin archivos de pruebas, sobre isValidSet/volumen por tipo, Epley, resumen y récords, conversión de peso y cálculos de salud. Se usó el código TS transformado por Node y se retiraron imports para aislar funciones puras; esto no valida integración.

No realizadas:
- npm run build o npm run lint: faltan dependencias locales. No se instaló nada.
- UI en navegador, IndexedDB real, restauración interactiva, service worker/offline o actualización PWA.
- Login/sync/Supabase/RLS: no hay configuración de acceso.
- Compilación/emulador/dispositivo Android: faltan dependencias y no se encontró Java en PATH.

El primer cambio funcional de enfoque muscular está completado. Los hallazgos restantes se mantienen como contexto y se atienden según el alcance de cada solicitud.
