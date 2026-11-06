import { exerciseMedia } from './exerciseMedia.ts'

export type AbdominalRegion = 'upper' | 'lower' | 'full'
export type AbdominalRegionFilterValue = 'all' | AbdominalRegion
export type AbdominalMovement =
  | 'trunk-flexion'
  | 'posterior-pelvic-tilt'
  | 'stabilization'
  | 'hip-flexion'
  | 'combined'
  | 'unclear'

export interface AbdominalExecution {
  movement: AbdominalMovement
  reason: string
}

export interface AbdominalClassification extends AbdominalExecution {
  region: AbdominalRegion
  label: string
  cue?: string
}

export const ABDOMINAL_REGION_LABELS: Record<AbdominalRegion, string> = {
  upper: 'Recto abdominal superior',
  lower: 'Recto abdominal inferior',
  full: 'Recto abdominal completo',
}

export const ABDOMINAL_REGION_NOTE =
  'El recto abdominal es un solo músculo y ambas regiones participan. La clasificación indica un mayor énfasis según la ejecución, sin aislamiento.'

// Revisión de la ejecución por ID y demostración, nunca por coincidencia de nombres.
// Las dos fichas con imágenes del usuario también tienen instrucciones específicas.
// Los casos sin predominio suficientemente claro usan "full" de forma conservadora.
export const ABDOMINAL_EXECUTIONS: Readonly<Record<string, AbdominalExecution>> = {
  "abs/crunch-floor": { movement: "trunk-flexion", reason: "La pelvis permanece apoyada mientras el tórax se acerca a ella mediante flexión del tronco." },
  "abs/crunch-hands-overhead": { movement: "trunk-flexion", reason: "Los brazos amplían la palanca; el movimiento principal sigue siendo la flexión del tronco con la pelvis apoyada." },
  "abs/crunch-on-stability-ball": { movement: "trunk-flexion", reason: "El tórax se aproxima a la pelvis al flexionar el tronco sobre el balón, sin una elevación predominante de la pelvis." },
  "abs/crunch-on-stability-ball-arms-straight": { movement: "trunk-flexion", reason: "La flexión del tronco sobre el balón aproxima las costillas a la pelvis; los brazos acompañan la palanca." },
  "abs/decline-crunch": { movement: "trunk-flexion", reason: "La pelvis queda apoyada en el banco declinado y el tórax se acerca a ella con un recorrido corto de flexión." },
  "abs/knee-touch-crunch": { movement: "trunk-flexion", reason: "Las manos se acercan a las rodillas al flexionar el tronco; la pelvis y los pies permanecen apoyados." },
  "abs/negative-crunch": { movement: "trunk-flexion", reason: "La demostración flexiona y extiende el tronco sobre el banco con las piernas fijadas, sin recogida predominante de la pelvis." },
  "abs/weighted-crunch": { movement: "trunk-flexion", reason: "La carga acompaña la flexión del tronco, mientras las piernas elevadas permanecen estables." },
  "abs/weighted-overhead-crunch-on-stability-ball": { movement: "trunk-flexion", reason: "El tórax se aproxima a la pelvis mediante flexión del tronco sobre el balón; la carga aumenta la palanca." },
  "abs/stability-ball-crunch-full-range-hands-behind-head": { movement: "trunk-flexion", reason: "El tronco se flexiona sobre el balón con los pies apoyados y la pelvis estable." },
  "abs/cable-kneeling-crunch": { movement: "trunk-flexion", reason: "De rodillas, el tórax se acerca a la pelvis mediante flexión del tronco contra la resistencia de la polea." },
  "abs/cable-seated-crunch": { movement: "trunk-flexion", reason: "Sentado, el tronco se flexiona y acerca las costillas a la pelvis, que permanece apoyada." },
  "abs/cable-standing-crunch": { movement: "trunk-flexion", reason: "La demostración aproxima el tórax a la pelvis flexionando el tronco contra la polea." },
  "abs/cable-standing-crunch-with-rope-attachment": { movement: "trunk-flexion", reason: "La cuerda acompaña la flexión del tronco; el movimiento abdominal acerca las costillas a la pelvis." },
  "abs/lever-seated-crunch-chest-pad": { movement: "trunk-flexion", reason: "El apoyo del pecho acompaña la flexión del tronco y la pelvis permanece en el asiento." },
  "abs/band-standing-crunch": { movement: "trunk-flexion", reason: "El tórax se aproxima a la pelvis mediante flexión del tronco contra la banda, sin una recogida predominante de la pelvis." },
  "abs/curl-up": { movement: "trunk-flexion", reason: "La demostración realiza una flexión corta del tronco con la pelvis apoyada, aunque el nombre del catálogo sea genérico." },
  "abs/quarter-sit-up": { movement: "trunk-flexion", reason: "La demostración usa un recorrido corto: despega el tórax sin completar una incorporación desde la cadera." },
  "abs/lever-seated-crunch-v-2": { movement: "trunk-flexion", reason: "La ejecución indicada acerca las costillas a la pelvis con una flexión corta del tronco y la cadera estable." },
  "abs/reverse-crunch": { movement: "posterior-pelvic-tilt", reason: "El tórax queda apoyado y la pelvis se enrolla hacia él, despegándose del suelo mediante retroversión pélvica." },
  "abs/cable-reverse-crunch": { movement: "posterior-pelvic-tilt", reason: "La pelvis se recoge y despega del suelo contra la polea; elevar las rodillas acompaña esa retroversión." },
  "abs/suspended-reverse-crunch": { movement: "posterior-pelvic-tilt", reason: "Con los brazos apoyados, la pelvis se recoge hacia el tórax y la zona lumbar se redondea al final del movimiento." },
  "abs/hanging-straight-leg-hip-raise": { movement: "posterior-pelvic-tilt", reason: "La demostración continúa por encima de la elevación de piernas: recoge la pelvis hacia el tórax y flexiona la zona lumbar." },
  "abs/incline-leg-hip-raise-leg-straight": { movement: "posterior-pelvic-tilt", reason: "Con el tórax apoyado en el banco inclinado, la pelvis se enrolla y se despega del respaldo." },
  "abs/lying-leg-hip-raise": { movement: "posterior-pelvic-tilt", reason: "El final del recorrido despega y recoge la pelvis hacia el tórax; no se limita a flexionar las caderas." },
  "abs/hip-raise-bent-knee": { movement: "posterior-pelvic-tilt", reason: "La pelvis se eleva y se enrolla hacia las costillas con las rodillas flexionadas y el tórax apoyado." },
  "abs/smith-hip-raise": { movement: "posterior-pelvic-tilt", reason: "La demostración tumbada eleva y recoge la pelvis hacia el tórax con las piernas verticales; no es un hip thrust de glúteos." },
  "abs/hanging-leg-hip-raise": { movement: "posterior-pelvic-tilt", reason: "La ejecución de esta ficha exige recoger la pelvis al final de la elevación de rodillas, acercándola hacia el tórax." },
  "abs/roller-reverse-crunch": { movement: "hip-flexion", reason: "Aunque se llama reverse crunch, la demostración mueve las piernas sobre el rodillo sin una retroversión pélvica suficientemente clara." },
  "abs/cable-tuck-reverse-crunch": { movement: "combined", reason: "La demostración acerca a la vez el tórax y las piernas; no se establece un predominio regional suficientemente claro." },
  "abs/weighted-hanging-leg-hip-raise": { movement: "unclear", reason: "La demostración eleva las rodillas con carga, pero no muestra una retroversión pélvica suficientemente clara para asignar énfasis inferior." },
  "abs/hanging-leg-raise": { movement: "hip-flexion", reason: "Predomina la elevación de las rodillas mediante flexión de cadera; no se observa una recogida final clara de la pelvis." },
  "abs/hanging-straight-leg-raise": { movement: "hip-flexion", reason: "Las piernas se elevan hasta la horizontal sin una retroversión pélvica final suficientemente clara." },
  "abs/captains-chair-straight-leg-raise": { movement: "hip-flexion", reason: "Se elevan las piernas manteniendo el tronco apoyado; la demostración no muestra una recogida clara de la pelvis." },
  "abs/half-sit-up-male": { movement: "combined", reason: "La demostración combina flexión del tronco e incorporación desde la cadera; no es una flexión corta con predominio regional claro." },
  "abs/prisoner-half-sit-up-male": { movement: "combined", reason: "La demostración combina flexión del tronco e incorporación desde la cadera, sin un predominio regional suficientemente claro." },
  "abs/wheel-rollerout": { movement: "stabilization", reason: "El recto abdominal estabiliza el tronco frente a la extensión durante el avance y el regreso de la rueda." },
  "abs/roller-body-saw": { movement: "stabilization", reason: "El cuerpo se desplaza hacia delante y atrás mientras el recto abdominal estabiliza el tronco frente a la extensión." },
  "abs/weighted-front-plank": { movement: "stabilization", reason: "Predomina mantener el tronco estable frente a la extensión bajo la carga, sin flexión regional predominante." },
}

const REGIONS_BY_MOVEMENT: Record<AbdominalMovement, AbdominalRegion> = {
  'trunk-flexion': 'upper',
  'posterior-pelvic-tilt': 'lower',
  stabilization: 'full',
  'hip-flexion': 'full',
  combined: 'full',
  unclear: 'full',
}

const CUES: Partial<Record<AbdominalMovement, string>> = {
  'trunk-flexion': 'Acerca las costillas a la pelvis mediante flexión del tronco; evita sustituirla por un movimiento de cadera.',
  'posterior-pelvic-tilt': 'Recoge la pelvis hacia las costillas con control. Elevar las piernas sin esa retroversión no basta para este énfasis.',
  'hip-flexion': 'Elevar las piernas por sí solo no garantiza un mayor énfasis inferior; debe existir retroversión pélvica.',
}

const FALLBACK_EXECUTION: AbdominalExecution = {
  movement: 'unclear',
  reason: 'No se ha establecido un predominio regional suficientemente claro para esta ejecución.',
}

// La demostración de esta ficha es un estiramiento asistido de cuádriceps,
// importado como abs por el catálogo original. No es trabajo del recto abdominal.
const NON_ABDOMINAL_IDS: ReadonlySet<string> = new Set(['abs/assisted-prone-rectus-femoris-stretch'])

/** La información muscular solo delimita el catálogo abdominal; no decide la región. */
export function getAbdominalClassification(exerciseId: string): AbdominalClassification | null {
  if (NON_ABDOMINAL_IDS.has(exerciseId) || !Object.hasOwn(exerciseMedia, exerciseId) || !exerciseMedia[exerciseId].primary.includes('abs')) return null
  const execution = Object.hasOwn(ABDOMINAL_EXECUTIONS, exerciseId)
    ? ABDOMINAL_EXECUTIONS[exerciseId]
    : FALLBACK_EXECUTION
  const region = REGIONS_BY_MOVEMENT[execution.movement]
  return { ...execution, region, label: ABDOMINAL_REGION_LABELS[region], cue: CUES[execution.movement] }
}

export function matchesAbdominalRegion(exerciseId: string, region: AbdominalRegionFilterValue): boolean {
  return region === 'all' || getAbdominalClassification(exerciseId)?.region === region
}

function normalize(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

/** Permite buscar por la categoría sin alterar nombres, aliases o registros guardados. */
export function matchesAbdominalSearch(exerciseId: string, query: string): boolean {
  const classification = getAbdominalClassification(exerciseId)
  if (!classification || !query.trim()) return false
  const synonyms: Record<AbdominalRegion, string> = {
    upper: 'abdomen superior abdominales superiores énfasis superior',
    lower: 'abdomen inferior abdominales inferiores énfasis inferior',
    full: 'abdomen completo abdominales completos énfasis completo',
  }
  return normalize(classification.label + ' ' + synonyms[classification.region]).includes(normalize(query.trim()))
}
