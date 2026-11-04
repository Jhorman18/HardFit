import { useState } from 'react'
import { AlertCircle } from 'lucide-react'
import { Sheet } from './ui/Sheet'
import { db } from '../db'
import type { ExerciseType } from '../types'

const MUSCLE_GROUPS = [
  'Pecho',
  'Espalda',
  'Pierna',
  'Hombro',
  'Bíceps',
  'Tríceps',
  'Core',
  'Cardio',
  'Otro',
]

const EQUIPMENT_OPTIONS = [
  'Barra',
  'Mancuerna',
  'Máquina',
  'Polea',
  'Peso corporal',
  'Banda',
  'Kettlebell',
  'Otro',
]

const EXERCISE_TYPES: { type: ExerciseType; label: string; description: string }[] = [
  { type: 'weight_reps', label: 'Carga y repeticiones', description: 'Peso (kg/lb) y repeticiones' },
  { type: 'bodyweight_reps', label: 'Peso corporal', description: 'Solo repeticiones' },
  { type: 'bodyweight_assisted', label: 'Asistido', description: 'Peso restado y repeticiones' },
  { type: 'duration', label: 'Por tiempo', description: 'Segundos o minutos' },
  { type: 'distance', label: 'Por distancia', description: 'Metros o kilómetros' },
]

export interface ExerciseFormModalProps {
  isOpen: boolean
  onClose: () => void
  initialName?: string
  onCreated?: (id: string) => void
}

function generateCustomId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `custom-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

function ExerciseFormDialog({
  onClose,
  initialName = '',
  onCreated,
}: Omit<ExerciseFormModalProps, 'isOpen'>) {
  const [name, setName] = useState(initialName)
  const [muscleGroup, setMuscleGroup] = useState('Pecho')
  const [customMuscleGroup, setCustomMuscleGroup] = useState('')
  const [equipment, setEquipment] = useState('Barra')
  const [customEquipment, setCustomEquipment] = useState('')
  const [type, setType] = useState<ExerciseType>('weight_reps')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const trimmedName = name.trim()
    if (!trimmedName) {
      setError('El nombre del ejercicio es obligatorio.')
      return
    }

    const resolvedMuscle =
      muscleGroup === 'Otro'
        ? customMuscleGroup.trim() || 'Otro'
        : muscleGroup

    const resolvedEquipment =
      equipment === 'Otro'
        ? customEquipment.trim() || 'Otro'
        : equipment

    const newId = generateCustomId()

    try {
      setIsSubmitting(true)
      setError(null)

      await db.exercises.add({
        id: newId,
        name: trimmedName,
        muscleGroup: resolvedMuscle,
        equipment: resolvedEquipment,
        type,
        isCustom: true,
      })

      onCreated?.(newId)
      onClose()
    } catch (err) {
      console.error('Error al guardar el ejercicio:', err)
      setError('No se pudo guardar el ejercicio. Inténtalo de nuevo.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Sheet
      title="Nuevo ejercicio"
      onClose={onClose}
      footer={
        <button
          type="submit"
          form="exercise-form"
          disabled={isSubmitting}
          className="btn-primary w-full text-base"
        >
          {isSubmitting ? 'Guardando...' : 'Crear ejercicio'}
        </button>
      }
    >
      <form id="exercise-form" onSubmit={handleSubmit} className="space-y-4 pt-1">
        {error && (
          <div className="p-3 bg-surface-elevated border border-red-400 rounded-md text-red-400 text-xs flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Nombre */}
        <div className="space-y-1.5">
          <label htmlFor="exercise-name" className="label-tech block">
            Nombre del ejercicio <span className="text-accent">*</span>
          </label>
          <input
            id="exercise-name"
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              if (error) setError(null)
            }}
            placeholder="Ej. Press inclinado con pausa"
            className="field"
            autoFocus
          />
        </div>

        {/* Grupo muscular */}
        <div className="space-y-1.5">
          <label htmlFor="exercise-muscle" className="label-tech block">
            Grupo muscular principal
          </label>
          <select
            id="exercise-muscle"
            value={muscleGroup}
            onChange={(e) => setMuscleGroup(e.target.value)}
            className="field"
          >
            {MUSCLE_GROUPS.map((mg) => (
              <option key={mg} value={mg}>
                {mg}
              </option>
            ))}
          </select>
          {muscleGroup === 'Otro' && (
            <input
              type="text"
              value={customMuscleGroup}
              onChange={(e) => setCustomMuscleGroup(e.target.value)}
              placeholder="Especifica el grupo muscular..."
              className="field mt-2"
            />
          )}
        </div>

        {/* Equipamiento */}
        <div className="space-y-1.5">
          <label htmlFor="exercise-equipment" className="label-tech block">
            Equipamiento
          </label>
          <select
            id="exercise-equipment"
            value={equipment}
            onChange={(e) => setEquipment(e.target.value)}
            className="field"
          >
            {EQUIPMENT_OPTIONS.map((eq) => (
              <option key={eq} value={eq}>
                {eq}
              </option>
            ))}
          </select>
          {equipment === 'Otro' && (
            <input
              type="text"
              value={customEquipment}
              onChange={(e) => setCustomEquipment(e.target.value)}
              placeholder="Especifica el equipamiento..."
              className="field mt-2"
            />
          )}
        </div>

        {/* Tipo de métrica */}
        <div className="space-y-1.5">
          <label htmlFor="exercise-type" className="label-tech block">
            Tipo de registro
          </label>
          <select
            id="exercise-type"
            value={type}
            onChange={(e) => setType(e.target.value as ExerciseType)}
            className="field"
          >
            {EXERCISE_TYPES.map((t) => (
              <option key={t.type} value={t.type}>
                {t.label} ({t.description})
              </option>
            ))}
          </select>
        </div>
      </form>
    </Sheet>
  )
}

export function ExerciseFormModal({
  isOpen,
  onClose,
  initialName = '',
  onCreated,
}: ExerciseFormModalProps) {
  if (!isOpen) return null

  return (
    <ExerciseFormDialog
      onClose={onClose}
      initialName={initialName}
      onCreated={onCreated}
    />
  )
}
