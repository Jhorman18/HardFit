import { exerciseMedia } from './exerciseMedia.ts'
import type { ExerciseFocusId } from './exerciseFocus'

export type CurlGripId = 'supinated' | 'pronated'
type CurlEquipment = 'barbell' | 'ez-bar' | 'dumbbell'

interface BasicCurl {
  equipment: CurlEquipment
  defaultGrip: CurlGripId
}

// Lista cerrada de curls básicos bilaterales. No clasificar por nombre o grupo muscular.
const BASIC_CURLS: Readonly<Record<string, BasicCurl>> = {
  'biceps/barbell-curl': { equipment: 'barbell', defaultGrip: 'supinated' },
  'biceps/barbell-reverse-curl': { equipment: 'barbell', defaultGrip: 'pronated' },
  'biceps/barbell-standing-reverse-grip-curl': { equipment: 'barbell', defaultGrip: 'pronated' },
  'biceps/ez-barbell-curl': { equipment: 'ez-bar', defaultGrip: 'supinated' },
  'biceps/ez-barbell-reverse-grip-curl': { equipment: 'ez-bar', defaultGrip: 'pronated' },
  'biceps/dumbbell-biceps-curl': { equipment: 'dumbbell', defaultGrip: 'supinated' },
  'biceps/dumbbell-standing-biceps-curl': { equipment: 'dumbbell', defaultGrip: 'supinated' },
  'biceps/dumbbell-biceps-curl-reverse': { equipment: 'dumbbell', defaultGrip: 'pronated' },
  'biceps/dumbbell-revers-grip-biceps-curl': { equipment: 'dumbbell', defaultGrip: 'pronated' },
  'biceps/dumbbell-standing-reverse-curl': { equipment: 'dumbbell', defaultGrip: 'pronated' },
}

export const BASIC_CURL_IDS: readonly string[] = Object.keys(BASIC_CURLS)

const DEMO_IDS: Record<CurlEquipment, Record<CurlGripId, string>> = {
  barbell: {
    supinated: 'biceps/barbell-curl',
    pronated: 'biceps/barbell-reverse-curl',
  },
  'ez-bar': {
    supinated: 'biceps/ez-barbell-curl',
    pronated: 'biceps/ez-barbell-reverse-grip-curl',
  },
  dumbbell: {
    supinated: 'biceps/dumbbell-biceps-curl',
    pronated: 'biceps/dumbbell-standing-reverse-curl',
  },
}

export function getBasicCurl(exerciseId: string): BasicCurl | null {
  return Object.hasOwn(BASIC_CURLS, exerciseId) ? BASIC_CURLS[exerciseId] : null
}

export function getCurlGripDemo(exerciseId: string, focus?: ExerciseFocusId) {
  const curl = getBasicCurl(exerciseId)
  if (!curl || (focus !== 'supinated' && focus !== 'pronated')) return undefined

  const supinated = focus === 'supinated'
  const equipment = curl.equipment === 'barbell'
    ? 'la barra recta'
    : curl.equipment === 'ez-bar' ? 'la barra Z' : 'las mancuernas'
  const placement = supinated
    ? 'Supino: palmas hacia delante al empezar y hacia arriba al flexionar los codos.'
    : 'Prono: dorso de las manos hacia delante al empezar y palmas hacia abajo al flexionar los codos.'
  const emphasis = supinated
    ? 'El agarre supino da más énfasis relativo al bíceps; el antebrazo también participa.'
    : 'El agarre prono da más énfasis relativo al antebrazo, especialmente al braquiorradial; el bíceps también participa.'
  const ezPlacement = curl.equipment === 'ez-bar'
    ? 'En la barra Z, usa los tramos inclinados: las palmas quedan oblicuas, sin forzar una supinación o pronación completa.'
    : undefined

  return {
    gifUrl: exerciseMedia[DEMO_IDS[curl.equipment][focus]].gifUrl,
    placement: ezPlacement ? placement + ' ' + ezPlacement : placement,
    instructions: [
      'De pie, con los pies a una separación cómoda, sujeta ' + equipment + ' y mantén el tronco estable.',
      placement,
      ...(ezPlacement ? [ezPlacement] : []),
      'Mantén las muñecas alineadas con los antebrazos y los codos cerca del cuerpo.',
      'Flexiona los codos con control sin balancear el tronco ni adelantar los hombros para levantar la carga.',
      'Baja despacio y conserva el agarre durante el recorrido. Ajusta la carga para mantener la técnica.',
      emphasis + ' Cambia el énfasis, sin aislar ni dejar de trabajar el otro músculo.',
    ],
  }
}
