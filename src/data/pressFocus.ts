import type { ExerciseFocusId } from './exerciseFocus'

export type PressMode = 'horizontal' | 'horizontal-single' | 'inclined'
export type PressFocusId = Exclude<ExerciseFocusId, 'glutes'>

// Alcance explícito: no aplicar por equipo ni a otras máquinas de pierna.
const PRESS_MODES: Readonly<Record<string, PressMode>> = {
  'calves/lever-seated-squat-calf-raise-on-leg-press-machine': 'horizontal',
  'glutes/sled-45-leg-press-side-pov': 'inclined',
}

// Referencias exactas del usuario: solo las dos prensas bilaterales solicitadas.
const USER_PRESS_ROOT = '/animations/leg-press-user/'
const USER_PRESS_DEMOS: Readonly<Partial<Record<PressMode, Record<PressFocusId, string>>>> = {
  horizontal: {
    quadriceps: 'horizontal-quadriceps-poses.jpeg',
    'posterior-chain': 'horizontal-posterior-chain-poses.jpeg',
    calves: 'horizontal-calves-poses.jpeg',
  },
  inclined: {
    quadriceps: 'inclined-quadriceps-poses.webp',
    'posterior-chain': 'inclined-posterior-chain-poses.jpeg',
    calves: 'inclined-calves-poses.jpeg',
  },
}

const PLACEMENT: Record<PressFocusId, string> = {
  quadriceps: 'Pies en la zona media-baja, con toda la planta apoyada.',
  'posterior-chain': 'Pies algo más altos, manteniendo la pelvis y la espalda apoyadas.',
  calves: 'Antepié en el borde inferior y talones libres; el movimiento sale del tobillo.',
}

export function isFocusPress(exerciseId: string): boolean {
  return Object.hasOwn(PRESS_MODES, exerciseId)
}

export function getPressFocusDemo(exerciseId: string, focus?: ExerciseFocusId) {
  if (!isFocusPress(exerciseId) || !focus) return undefined
  const mode = PRESS_MODES[exerciseId]
  const unilateral = mode === 'horizontal-single'
  const placement = unilateral ? PLACEMENT[focus].replace('Pies', 'Pie').replace('altos', 'alto').replace('talones libres', 'talón libre') : PLACEMENT[focus]
  const setup = mode === 'inclined'
    ? 'Ajusta el respaldo de la prensa inclinada, apoya la espalda y sujeta las asas. Libera y coloca los seguros según la máquina.'
    : 'Ajusta el asiento de la prensa horizontal para alcanzar la plataforma sin despegar la pelvis del respaldo y sujeta las asas.'
  const support = unilateral
    ? 'Trabaja con una pierna y deja la otra fuera del recorrido móvil. Repite después con el otro lado.'
    : 'Coloca ambos pies a una separación cómoda y mantén las rodillas alineadas con ellos.'
  const movement = focus === 'calves'
    ? [
      'Mantén las rodillas casi extendidas, sin bloquearlas. Deja estable la posición de las rodillas durante la serie.',
      'Empuja con el antepié para elevar los talones y vuelve despacio, moviendo el tobillo sin flexionar las piernas.',
      'Usa un recorrido cómodo y sin rebotes. Realiza esta variante solo si la plataforma y los seguros permiten apoyar el antepié con seguridad.',
    ]
    : [
      focus === 'quadriceps'
        ? 'Flexiona las rodillas de forma controlada, con los talones apoyados y la pelvis estable. Ajusta la altura de los pies si se despegan los talones.'
        : 'Flexiona caderas y rodillas de forma controlada, sin despegar ni redondear la pelvis al bajar. La posición alta cambia el énfasis; el movimiento sigue siendo compuesto.',
      'Empuja la plataforma con control y extiende las piernas sin bloquear las rodillas. No acortes ni fuerces el recorrido para imitar la guía.',
      'Adapta la posición de los pies y la profundidad a tu movilidad y a la máquina; exhala al empujar e inhala al volver.',
    ]
  return {
    gifUrl: USER_PRESS_DEMOS[mode]?.[focus]
      ? USER_PRESS_ROOT + USER_PRESS_DEMOS[mode][focus]
      : '/animations/leg-press-anatomical/' + mode + '-' + focus + '-atlas.png',
    placement,
    instructions: [setup, placement, support, ...movement],
  }
}

export interface PressAnimationLayout {
  columns: number
  rows: number
  frameAspectRatio: number
  frames?: readonly { x: number; clipPoints: string }[]
}

export function getAnatomicalPressLayout(url?: string): PressAnimationLayout | undefined {
  if (!url) return undefined
  const isUserImage = Object.values(USER_PRESS_DEMOS)
    .some((demos) => Object.values(demos).some((filename) => url === USER_PRESS_ROOT + filename))
  if (isUserImage) {
    // Las dos figuras de esta referencia invaden el centro en alturas distintas.
    // Ventanas independientes evitan mostrar fragmentos de la figura vecina.
    const polygon = (points: number[][]) => points.map((point) => point.map((value) => value / 1536).join(',')).join(' ')
    const frames = url === USER_PRESS_ROOT + 'inclined-calves-poses.jpeg' ? [
      { x: 0, clipPoints: polygon([[0, 0], [1376, 0], [1376, 800], [1320, 800], [1320, 1120], [1376, 1120], [1376, 1536], [0, 1536]]) },
      { x: 1328 / 1536, clipPoints: polygon([[48, 0], [1376, 0], [1376, 1536], [48, 1536], [48, 1120], [0, 1120], [0, 800], [48, 800]]) },
    ] : undefined
    return { columns: 2, rows: 1, frameAspectRatio: url.endsWith('.webp') ? 300 / 254 : 1376 / 1536, frames }
  }
  if (url.startsWith('/animations/leg-press-anatomical/') && url.endsWith('-atlas.png')) {
    return { columns: 2, rows: 2, frameAspectRatio: 1 }
  }
  return undefined
}

export function isAnatomicalPressAtlas(url?: string): boolean {
  return getAnatomicalPressLayout(url) !== undefined
}
