# Agarre en curls básicos

Implementado el 2026-11-05 en `C:/Users/1233896946/Documents/HardFit`.

El usuario confirmó limitar esta primera entrega a curls básicos con barra recta, barra Z y mancuernas. No se incluyen predicador, inclinado, concentrado, martillo, Zottman, arm blaster, drag curl ni curls de muñeca. No se agrupan, eliminan ni renombran ejercicios.

## Comportamiento

- Supino: bíceps principal; antebrazo secundario.
- Prono: antebrazo principal, con énfasis relativo en braquiorradial; bíceps secundario.
- Ambos músculos siguen activos en los dos agarres. Se conservan los músculos auxiliares.
- Mapa y estadísticas usan las categorías existentes: principal suma 1 y secundario 0,5 por serie válida. Estos valores son una convención de la app, no porcentajes fisiológicos ni mediciones de activación o hipertrofia.
- La preferencia global por ID se guarda en `muscleOverrides.focus`, como en prensa. No crea un agarre por serie ni reescribe rutinas o entrenamientos. Al cambiarla, las estadísticas históricas se recalculan con la preferencia actual.
- Los campos heredados `disabled` se conservan, pero no excluyen músculos en estas diez fichas. Los demás ejercicios conservan sus controles anteriores.
- Las fichas inversas parten en prono; las otras, en supino. Valores de enfoque ajenos al ejercicio vuelven a ese predeterminado.
- Las instrucciones y demostraciones se resuelven con el mismo agarre. Barra Z conserva manos oblicuas y GIF de barra Z.
- No cambia el catálogo, los IDs, el seed ni el esquema de la base de datos.

## IDs autorizados

La lista cerrada está en `src/data/curlGrip.ts`:

1. `biceps/barbell-curl`
2. `biceps/barbell-reverse-curl`
3. `biceps/barbell-standing-reverse-grip-curl`
4. `biceps/ez-barbell-curl`
5. `biceps/ez-barbell-reverse-grip-curl`
6. `biceps/dumbbell-biceps-curl`
7. `biceps/dumbbell-standing-biceps-curl`
8. `biceps/dumbbell-biceps-curl-reverse`
9. `biceps/dumbbell-revers-grip-biceps-curl`
10. `biceps/dumbbell-standing-reverse-curl`

## Demostraciones y criterio del modelo

Se reutilizan seis GIF existentes de `exerciseMedia.ts`: barbell-curl / barbell-reverse-curl, ez-barbell-curl / ez-barbell-reverse-grip-curl, dumbbell-biceps-curl / dumbbell-standing-reverse-curl. No se crean imágenes nuevas ni se modifica la anatomía original. Revisión visual en `.codex/tmp/curl-grips/grip-demos.png`.

El cambio se representa como énfasis relativo, sin afirmar que la pronación siempre aumenta la activación absoluta del antebrazo. La investigación depende del protocolo y no permite convertir EMG en porcentajes universales de estímulo:

- Kleiber et al., 2015: https://pubmed.ncbi.nlm.nih.gov/26300781/
- Coratella et al., 2023: https://pubmed.ncbi.nlm.nih.gov/36976950/

## Verificación

Pruebas de alcance, presencia de ambos músculos, predeterminados heredados, demostraciones por implemento, instrucciones y conservación de músculos auxiliares en `scripts/exercise-focus.test.mjs`. Las pruebas de prensa siguen comprobando sus seis recursos originales.

Validación final: 16 pruebas correctas (unidades y enfoque/recursos), lint correcto y build TypeScript/Vite/PWA correcto. Nueve grupos de navegador en perfil aislado, móvil390×844 y escritorio1365×900; cero excepciones. Se comprobó persistencia, ambas intensidades anatómicas, contribuciones4/2 y2/4 para cuatro series válidas, exclusión de calentamientos/incompletas, datos de entreno/rutina intactos y controles originales de prensa/predicador. Resultados y capturas en `.codex/tmp/curl-grips`. Sin compilación APK ni prueba en Android/Supabase real.
