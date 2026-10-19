# RepLog — Registro de Entrenamiento Personal

Aplicación **web (PWA)** y **Android (Capacitor)** para llevar el seguimiento de rutinas de fuerza,
entrenamientos, medidas corporales, estadísticas de progreso y temporizador de descanso.
Funciona **100% offline-first** (los datos viven en tu dispositivo) con **sincronización opcional** en la nube.

> Proyecto **personal y educativo**. No afiliado a ninguna app comercial. Lee la sección
> [Créditos y aviso legal](#-créditos-y-aviso-legal) antes de reutilizar los datos de ejercicios.

---

## ✨ Funcionalidades

- **Entrenamientos**: empieza vacío o desde una rutina; añade ejercicios de uno en uno; series con reps/peso,
  mínimo 1 serie por ejercicio, RPE **opcional** (se activa en Ajustes).
- **Temporizador de descanso**: global por entrenamiento y configurable por ejercicio (con override); `0` = sin timer.
- **Rutinas y carpetas**: crea, edita y organiza rutinas reutilizables.
- **Catálogo de +1200 ejercicios** con búsqueda, filtro por grupo muscular y por **equipo (máquina / sin máquina)**,
  instrucciones en español y demostración animada (gif desde CDN).
- **Ejercicios personalizados**: crea y elimina los tuyos.
- **Mapa muscular anatómico** (frente + espalda) con heatmap propio rojo → naranja → amarillo según carga.
- **Estadísticas**: resumen y avanzadas — progreso por ejercicio (buscador), distribución por músculo (radar),
  ejercicios principales, mapa corporal por período, informe mensual, récords personales, 1RM estimado, volumen y rachas.
- **Medidas corporales**: registro manual y gráfica de evolución (peso y otras medidas).
- **Datos de prueba**: genera/borra ~1 mes de datos de ejemplo para explorar las gráficas.
- **Exportar datos**: JSON y CSV.
- **Sincronización opcional** (Supabase): login por email/contraseña, local-first con resolución de conflictos
  por última-escritura. Sin configurar o sin sesión, la app funciona igual, offline.
- **Tema oscuro** (negro con texto/íconos blancos), íconos lucide, PWA instalable e icono nativo.

## 🧱 Stack

React 19 · Vite · TypeScript · Tailwind · Dexie (IndexedDB) · Zustand · React Router · Recharts · date-fns ·
vite-plugin-pwa · Capacitor 8 (Android) · Supabase (sync opcional).

---

## 🚀 Desarrollo local

Requisitos: **Node.js 20+**.

```bash
npm install
npm run dev        # http://localhost:5173  (usa --host para la red local)
```

### Sincronización opcional (Supabase)
Copia `.env.example` a `.env` y rellena tus credenciales. Sin este archivo la app corre en modo offline/local.

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

(La clave *anon/publishable* es pública por diseño; el acceso se protege con RLS por usuario. `.env` está ignorado por git.)

---

## 📲 Instalación

- **PWA**: despliega `dist/` en cualquier hosting HTTPS (Vercel, Netlify, Cloudflare Pages, GitHub Pages) o
  corre `npm run dev -- --host`, abre la URL en Chrome/Safari del móvil y usa **«Instalar aplicación»** / **«Añadir a pantalla de inicio»**.
- **Android (APK)**: hay un APK de *debug* listo en la raíz del repo → **[`RepLog.apk`](./RepLog.apk)**.
  Transfiérelo al teléfono y permite «instalar de orígenes desconocidos».

### Reconstruir el APK
Requiere **JDK 21** y **Android SDK** (`ANDROID_HOME` configurado).
```bash
npm run build
npx cap sync android
cd android && ./gradlew assembleDebug      # Windows: .\gradlew.bat assembleDebug
# salida: android/app/build/outputs/apk/debug/app-debug.apk
```

---

## 🛠️ Scripts

- `npm run dev` — servidor de desarrollo Vite.
- `npm run build` — chequeo de tipos + build de producción a `dist/`.
- `npm run lint` — Oxlint.
- `npm run fetch:catalog` — regenera el catálogo de ejercicios (ver créditos).
- `node scripts/generate-icons.mjs` / `make-official-icon.mjs` — genera íconos PWA/Android con Sharp.

---

## 🔒 Privacidad

Todos tus datos se guardan en el dispositivo (IndexedDB). La sincronización en la nube es **opcional** y solo se
activa si configuras Supabase e inicias sesión. Los gifs de demostración se cargan bajo demanda desde un CDN público.

---

## 📜 Créditos y aviso legal

Este es un proyecto **personal, educativo y sin ánimo de lucro**. El código propio de la app se publica bajo la
licencia **MIT** (ver [`LICENSE`](./LICENSE)). Sin embargo, **parte de los datos y recursos provienen de terceros**
y conservan sus propios términos. El detalle completo está en **[`CREDITS.md`](./CREDITS.md)**. Resumen:

- **Datos de ejercicios** (nombres, instrucciones en español, grupos musculares y URLs de gifs): basados en el
  dataset **ExerciseDB** redistribuido en
  [github.com/JahelCuadrado/ExerciseGymGifsDB](https://github.com/JahelCuadrado/ExerciseGymGifsDB). Su **origen y
  licencia original no son claros**; se incluyen **solo con fines personales y educativos, NO comerciales**. Los
  **gifs no se redistribuyen** en este repositorio: se cargan en tiempo de ejecución desde un CDN público (jsDelivr).
- **Mapa muscular**: figuras SVG **portadas** de
  [HichamELBSI/react-native-body-highlighter](https://github.com/HichamELBSI/react-native-body-highlighter) (**MIT**).
- **Íconos**: [lucide](https://lucide.dev) (ISC).

**Descargo de responsabilidad**: el autor **no reclama propiedad** sobre los datos/recursos de terceros arriba
mencionados, **se desliga de cualquier uso comercial** que un tercero haga de ellos y entrega el software **«tal cual»,
sin garantías** de ningún tipo. Si eres titular de derechos de alguno de estos materiales y deseas que se retire o
se ajuste la atribución, **abre un issue** y se atenderá.
