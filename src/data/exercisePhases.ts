export interface ExercisePhaseFrame {
  x: number
  y: number
  clip?: { x: number; y: number; width: number; height: number }
  clipPoints?: string
}

export interface ExercisePhaseLayout {
  url: string
  sourceWidth: number
  sourceHeight: number
  frameWidth: number
  frameHeight: number
  imageFilter?: string
  frames: readonly [ExercisePhaseFrame, ExercisePhaseFrame]
}

/** Ventanas de las dos posiciones originales, con la misma escala y referencia espacial. */
export const EXERCISE_PHASE_LAYOUTS: readonly ExercisePhaseLayout[] = [
  {
    "url": "/exercises/user-added/crunch-abdominal-corto-maquina.jpeg",
    "sourceWidth": 764,
    "sourceHeight": 401,
    "frameWidth": 360,
    "frameHeight": 401,
    "frames": [
      {
        "x": 60,
        "y": 0,
        "clip": {
          "x": 0,
          "y": 0,
          "width": 330,
          "height": 401
        }
      },
      {
        "x": 360,
        "y": 0,
        "clip": {
          "x": 30,
          "y": 0,
          "width": 330,
          "height": 401
        }
      }
    ]
  },
  {
    "url": "/exercises/user-added/levantamiento-piernas-barra.jpeg",
    "sourceWidth": 2400,
    "sourceHeight": 1792,
    "frameWidth": 1400,
    "frameHeight": 1792,
    "frames": [
      {
        "x": -500,
        "y": 0
      },
      {
        "x": 1000,
        "y": 0
      }
    ]
  },
  {
    "url": "/exercises/user-added/empuje-cadera-smith.webp",
    "sourceWidth": 1024,
    "sourceHeight": 768,
    "frameWidth": 512,
    "frameHeight": 630,
    "frames": [
      {
        "x": 0,
        "y": 60
      },
      {
        "x": 500,
        "y": 60
      }
    ]
  },
  {
    "url": "/exercises/user-added/tiron-cara.jpg",
    "sourceWidth": 1200,
    "sourceHeight": 675,
    "frameWidth": 600,
    "frameHeight": 675,
    "frames": [
      {
        "x": 0,
        "y": 0
      },
      {
        "x": 600,
        "y": 0
      }
    ]
  },
  {
    "url": "/exercises/user-added/extension-muneca-sentado.webp",
    "sourceWidth": 1024,
    "sourceHeight": 576,
    "frameWidth": 512,
    "frameHeight": 576,
    "frames": [
      {
        "x": 0,
        "y": 0
      },
      {
        "x": 512,
        "y": 0
      }
    ]
  }
]

export function getExercisePhaseLayout(url?: string): ExercisePhaseLayout | undefined {
  return EXERCISE_PHASE_LAYOUTS.find(layout => layout.url === url)
}
