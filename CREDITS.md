# Créditos, atribuciones y aviso legal

RepLog es un proyecto **personal, educativo y sin ánimo de lucro**. El **código propio** se publica bajo
licencia **MIT** (ver [`LICENSE`](./LICENSE)). Este documento detalla los **materiales de terceros** que la app
usa y sus términos. Algunos de esos materiales tienen un **origen y una licencia original poco claros**; se
incluyen aquí **únicamente con fines personales y educativos, NO comerciales**.

## Datos de ejercicios (catálogo, instrucciones en español, grupos musculares y gifs)

- **Fuente redistribuida**: [github.com/JahelCuadrado/ExerciseGymGifsDB](https://github.com/JahelCuadrado/ExerciseGymGifsDB)
- **Dataset de origen**: **ExerciseDB** (base de datos de ejercicios de gimnasio ampliamente redistribuida en
  internet). El **titular original y la licencia exacta no están claros**.
- **Qué usa RepLog**: nombres de ejercicios, instrucciones traducidas al español, grupos musculares primarios/
  secundarios y las **URLs** de los gifs de demostración.
- **Importante**: los **archivos GIF no se incluyen ni se redistribuyen** en este repositorio. Se cargan en tiempo
  de ejecución desde un **CDN público (jsDelivr)** y el navegador los cachea. Este repo solo contiene metadatos
  (texto) derivados de esa fuente.
- **Uso**: **personal y educativo, no comercial.**

## Mapa muscular (figuras anatómicas frente/espalda)

- **Fuente**: [HichamELBSI/react-native-body-highlighter](https://github.com/HichamELBSI/react-native-body-highlighter)
- **Licencia**: **MIT**.
- **Qué usa RepLog**: los *paths* SVG del cuerpo (muñeco masculino, vistas anterior y posterior), **portados** de
  React Native a React Web. El esquema de colores (heatmap rojo → naranja → amarillo) es propio.

## Íconos e interfaz

- **[lucide](https://lucide.dev)** (licencia **ISC**) vía `lucide-react`.
- Tipografías del sistema; sin recursos de marcas comerciales.

## Dependencias de código abierto

Las librerías de `package.json` (React, Vite, Tailwind, Dexie, Zustand, Recharts, date-fns, Capacitor,
Supabase JS, etc.) conservan sus respectivas licencias de código abierto.

---

## Descargo de responsabilidad

- El autor **no reclama propiedad** sobre los datos, textos y recursos de terceros mencionados arriba.
- Este proyecto **no está afiliado ni respaldado** por ninguna aplicación o servicio comercial.
- El autor **se desliga de cualquier uso comercial** que terceros hagan de estos materiales. El software se
  entrega **«tal cual», sin garantías** de ningún tipo (ver cláusula de la licencia MIT).
- Si eres **titular de derechos** de alguno de estos materiales y deseas que se **retire** el contenido o se
  **ajuste la atribución**, por favor **abre un issue** en este repositorio y se atenderá a la brevedad.

## Tipografía

- **Archivo** (Omnibus-Type), distribuida con la app mediante `@fontsource-variable/archivo`, bajo licencia **SIL Open Font License 1.1**.

## Imágenes aportadas para cinco ejercicios

El usuario suministró cinco láminas para crunch en máquina, piernas en barra, hip thrust Smith, face pull y extensión de muñeca. Se conservan completas, sin modificar sus bytes ni las marcas presentes. La procedencia por archivo y los hashes constan en [el manifest de imágenes](docs/requested-exercises-images.json). No se atribuye una licencia adicional a estos materiales.
