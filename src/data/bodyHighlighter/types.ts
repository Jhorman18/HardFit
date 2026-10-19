// Portado de HichamELBSI/react-native-body-highlighter, MIT

export type HighlighterSlug =
  | 'abs'
  | 'adductors'
  | 'ankles'
  | 'biceps'
  | 'calves'
  | 'chest'
  | 'deltoids'
  | 'feet'
  | 'forearm'
  | 'gluteal'
  | 'hair'
  | 'hamstring'
  | 'hands'
  | 'head'
  | 'knees'
  | 'lower-back'
  | 'neck'
  | 'obliques'
  | 'quadriceps'
  | 'tibialis'
  | 'trapezius'
  | 'triceps'
  | 'upper-back'

export interface BodyPartPath {
  common?: string[]
  left?: string[]
  right?: string[]
}

export interface BodyPart {
  slug: HighlighterSlug
  color?: string
  path: BodyPartPath
}
