import { useState } from 'react'
import { X, Plus, AlertCircle } from 'lucide-react'
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
  { type: 'bodyweight_assisted', label: 'Asistido', description: 'Peso restado / asistencia y repeticiones' },
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
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Cabecera */}
        <div className="p-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-900/80">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-neutral-800 flex items-center justify-center text-white">
              <Plus size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Nuevo Ejercicio</h2>
              <p className="text-xs text-neutral-400">Crea un ejercicio personalizado para tus rutinas.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white flex items-center justify-center transition"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 bg-red-950/50 border border-red-900/80 rounded-xl text-red-300 text-xs flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Nombre */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-neutral-300 block">
              Nombre del ejercicio <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                if (error) setError(null)
              }}
              placeholder="Ej. Press banca declinado, Hip Thrust con barra..."
              autoFocus
              className="w-full px-3 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-white transition"
            />
          </div>

          {/* Grupo muscular */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-neutral-300 block">
              Grupo muscular principal
            </label>
            <select
              value={muscleGroup}
              onChange={(e) => setMuscleGroup(e.target.value)}
              className="w-full px-3 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-white focus:outline-none focus:border-white transition"
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
                className="w-full mt-2 px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white transition"
              />
            )}
          </div>

          {/* Equipamiento */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-neutral-300 block">
              Equipamiento
            </label>
            <select
              value={equipment}
              onChange={(e) => setEquipment(e.target.value)}
              className="w-full px-3 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-white focus:outline-none focus:border-white transition"
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
                className="w-full mt-2 px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white transition"
              />
            )}
          </div>

          {/* Tipo de métrica */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-neutral-300 block">
              Tipo de métrica
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as ExerciseType)}
              className="w-full px-3 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-white focus:outline-none focus:border-white transition"
            >
              {EXERCISE_TYPES.map((et) => (
                <option key={et.type} value={et.type}>
                  {et.label} ({et.description})
                </option>
              ))}
            </select>
          </div>

          {/* Botones de acción */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-neutral-800/80">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl text-xs font-bold bg-white hover:bg-neutral-200 text-black transition shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? 'Creando...' : 'Crear ejercicio'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function ExerciseFormModal({
  isOpen,
  onClose,
  initialName,
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
