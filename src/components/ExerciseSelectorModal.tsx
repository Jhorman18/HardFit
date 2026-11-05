import { useState, useMemo } from 'react'
import { useDismissable } from './ui/useDismissable'
import { useLiveQuery } from 'dexie-react-hooks'
import { Search, X, Plus } from 'lucide-react'
import { db } from '../db'
import { ExerciseDemo } from './ExerciseDemo'
import { ExerciseFormModal } from './ExerciseFormModal'
import { ExercisePreviewModal } from './ExercisePreviewModal'
import type { ExerciseType } from '../types'

// Mapa de sinónimos de búsqueda (claves normalizadas en minúsculas y sin tildes).
// Fácil de ampliar agregando nuevas equivalencias: 'termino_buscado': ['termino_en_catalogo']
const SEARCH_SYNONYMS: Record<string, string[]> = {
  'bulgara': ['split squat'],
  'bulgaras': ['split squat'],
}

const PAGE_SIZE = 60

const MUSCLE_GROUPS = [
  'Todos',
  'Pecho',
  'Espalda',
  'Pierna',
  'Hombro',
  'Bíceps',
  'Tríceps',
  'Core',
  'Cardio',
]

const EQUIPMENT_FILTERS = ['Todos', 'Máquina', 'Sin máquina'] as const
type EquipmentFilter = (typeof EQUIPMENT_FILTERS)[number]

const MACHINE_EQUIPMENT: ReadonlySet<string> = new Set(['Máquina', 'Polea'])

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function formatExerciseType(type: ExerciseType): string {
  switch (type) {
    case 'weight_reps':
      return 'Carga y Reps'
    case 'bodyweight_reps':
      return 'Peso Corporal'
    case 'bodyweight_assisted':
      return 'Asistido'
    case 'duration':
      return 'Por Tiempo'
    case 'distance':
      return 'Por Distancia'
    default:
      return type
  }
}

interface ExerciseSelectorModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectExercises: (exerciseIds: string[]) => void
  title?: string
  subtitle?: string
  zIndex?: string
}

export function ExerciseSelectorModal({
  isOpen,
  onClose,
  onSelectExercises,
  title = 'Añadir ejercicios',
  subtitle = 'Toca un ejercicio para añadirlo a tu entrenamiento.',
  zIndex = 'z-50',
}: ExerciseSelectorModalProps) {
  useDismissable(onClose, isOpen)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedMuscle, setSelectedMuscle] = useState('Todos')
  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentFilter>('Todos')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [previewExerciseId, setPreviewExerciseId] = useState<string | null>(null)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  const exercises = useLiveQuery(() => db.exercises.toArray(), [])

  const filteredExercises = useMemo(() => {
    if (!exercises) return []
    const q = normalize(searchQuery.trim())

    // Sinónimos aplicables a la búsqueda actual
    const synonymTargets: string[] = []
    if (q) {
      for (const [key, targets] of Object.entries(SEARCH_SYNONYMS)) {
        if (key.includes(q) || q.includes(key)) {
          synonymTargets.push(...targets)
        }
      }
    }

    return exercises.filter((ex) => {
      const normName = normalize(ex.name)
      const matchesAliases = ex.aliases?.some((alias) => normalize(alias).includes(q))
      const matchesSearch =
        !q ||
        normName.includes(q) ||
        matchesAliases ||
        synonymTargets.some((target) => normName.includes(target))
      const matchesMuscle = selectedMuscle === 'Todos' || ex.muscleGroup === selectedMuscle
      const isMachine = MACHINE_EQUIPMENT.has(ex.equipment)
      const matchesEquipment =
        selectedEquipment === 'Todos' ||
        (selectedEquipment === 'Máquina' ? isMachine : !isMachine)
      return matchesSearch && matchesMuscle && matchesEquipment
    })
  }, [exercises, searchQuery, selectedMuscle, selectedEquipment])

  const displayedExercises = useMemo(() => {
    return filteredExercises.slice(0, visibleCount)
  }, [filteredExercises, visibleCount])

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    setVisibleCount(PAGE_SIZE)
  }

  const handleMuscleChange = (muscle: string) => {
    setSelectedMuscle(muscle)
    setVisibleCount(PAGE_SIZE)
  }

  const handleEquipmentChange = (equipment: EquipmentFilter) => {
    setSelectedEquipment(equipment)
    setVisibleCount(PAGE_SIZE)
  }

  if (!isOpen) return null

  // Añade el ejercicio y cierra el modal de inmediato (uno por toque).
  const handleAdd = (id: string) => {
    onSelectExercises([id])
    onClose()
  }

  return (
    <div className={`fixed inset-0 ${zIndex} bg-black/80 flex justify-center p-0 sm:p-4`}>
      <div className="w-full max-w-md h-full sm:h-[90vh] flex flex-col bg-black sm:border border-line sm:rounded-lg overflow-hidden">
        {/* Encabezado */}
        <div className="p-4 border-b border-line flex items-center justify-between bg-surface">
          <div>
            <h2 className="text-lg font-bold text-white">{title}</h2>
            <p className="text-xs text-neutral-400">{subtitle}</p>
          </div>
          <button
            onClick={onClose}
            className="press min-w-12 min-h-12 rounded-md bg-elevated text-neutral-400 hover:text-white flex items-center justify-center"
            aria-label="Cerrar"
          >
            <X size={18} strokeWidth={1.75} />
          </button>
        </div>

        {/* Buscador */}
        <div className="p-3 border-b border-line bg-black space-y-2">
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-neutral-400">
              <Search size={16} strokeWidth={1.75} />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Buscar por nombre (ej. Press, Sentadilla)..."
              className="w-full pl-9 pr-8 field"
            />
            {searchQuery && (
              <button
                onClick={() => handleSearchChange('')}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-neutral-400 hover:text-white"
                aria-label="Limpiar búsqueda"
              >
                <X size={14} strokeWidth={1.75} />
              </button>
            )}
          </div>

          {/* Filtros de grupo muscular */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {MUSCLE_GROUPS.map((muscle) => {
              const isSelected = selectedMuscle === muscle
              return (
                <button
                  key={muscle}
                  type="button"
                  onClick={() => handleMuscleChange(muscle)}
                  className={`press px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap border ${
                    isSelected
                      ? 'bg-accent text-accent-fg font-semibold border-accent'
                      : 'bg-elevated text-neutral-400 hover:text-white border-line'
                  }`}
                >
                  {muscle}
                </button>
              )
            })}
          </div>

          {/* Filtros de equipo */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
            <span className="label-tech shrink-0 mr-1">Equipo:</span>
            {EQUIPMENT_FILTERS.map((filter) => {
              const isSelected = selectedEquipment === filter
              return (
                <button
                  key={filter}
                  type="button"
                  onClick={() => handleEquipmentChange(filter)}
                  className={`press px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap border ${
                    isSelected
                      ? 'bg-accent text-accent-fg font-semibold border-accent'
                      : 'bg-elevated text-neutral-400 hover:text-white border-line'
                  }`}
                >
                  {filter}
                </button>
              )
            })}
          </div>
        </div>

        {/* Contador */}
        <div className="px-4 py-1.5 text-xs text-neutral-400 bg-surface border-b border-line flex items-center justify-between">
          <span>
            {exercises ? (
              <>
                Mostrando <strong className="text-white">{displayedExercises.length}</strong> de {filteredExercises.length} ejercicios
              </>
            ) : (
              'Cargando...'
            )}
          </span>
          {(selectedMuscle !== 'Todos' || selectedEquipment !== 'Todos') && (
            <span className="text-white font-medium">
              Filtro:{' '}
              {[
                selectedMuscle !== 'Todos' ? selectedMuscle : null,
                selectedEquipment !== 'Todos' ? selectedEquipment : null,
              ]
                .filter(Boolean)
                .join(' • ')}
            </span>
          )}
        </div>

        {/* Lista de ejercicios */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {filteredExercises.length > 0 ? (
            <>
              {displayedExercises.map((exercise) => {
                return (
                  <div
                    key={exercise.id}
                    onClick={() => setPreviewExerciseId(exercise.id)}
                    className="p-3 rounded-md border cursor-pointer flex items-center justify-between gap-3 bg-surface hover:bg-elevated border-line group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="shrink-0 rounded-md overflow-hidden">
                        <ExerciseDemo exerciseId={exercise.id} variant="thumb" alt={exercise.name} />
                      </div>
                      <div className="space-y-1 min-w-0">
                        <div className="font-semibold text-white text-sm leading-snug truncate group-hover:text-neutral-200">
                          {exercise.name}
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-white font-medium">{exercise.muscleGroup}</span>
                          <span className="text-neutral-400">•</span>
                          <span className="text-neutral-400">{exercise.equipment}</span>
                          <span className="text-neutral-400">•</span>
                          <span className="text-neutral-400">{formatExerciseType(exercise.type)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Botón de añadir (solo se añade si se pulsa este botón) */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleAdd(exercise.id)
                      }}
                      className="press min-w-12 min-h-12 rounded-md flex items-center justify-center shrink-0 border border-line-strong bg-elevated hover:bg-accent hover:text-accent-fg text-neutral-200"
                      title={`Añadir ${exercise.name}`}
                      aria-label={`Añadir ${exercise.name}`}
                    >
                      <Plus size={18} strokeWidth={2.5} />
                    </button>
                  </div>
                )
              })}

              {/* Botón Mostrar más */}
              {filteredExercises.length > visibleCount && (
                <div className="pt-1 pb-2 text-center">
                  <button
                    type="button"
                    onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
                    className="btn-secondary w-full"
                  >
                    Mostrar más ({filteredExercises.length - visibleCount} restantes)
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="py-12 text-center text-neutral-400 space-y-3 px-4">
              <Search size={32} className="mx-auto text-neutral-400" />
              <div>
                <p className="text-sm font-semibold text-white">No se encontraron ejercicios</p>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Prueba con otra búsqueda o crea tu propio ejercicio personalizado.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="btn-primary inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold mt-1"
              >
                <Plus size={15} strokeWidth={2.5} />
                <span>
                  {searchQuery.trim() ? `Crear "${searchQuery.trim()}"` : 'Crear nuevo ejercicio'}
                </span>
              </button>
            </div>
          )}
        </div>

        {/* Barra inferior */}
        <div className="p-3 border-t border-line bg-surface flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-1.5 text-xs text-neutral-300 hover:text-white font-medium"
          >
            <Plus size={14} />
            <span>Crear ejercicio</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary px-4 py-2 text-xs font-bold"
          >
            Cancelar
          </button>
        </div>
      </div>

      {/* Modal de creación de ejercicio */}
      <ExerciseFormModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        initialName={searchQuery.trim()}
        onCreated={(id) => {
          handleAdd(id)
        }}
      />

      {/* Modal de vista previa de ejercicio */}
      {previewExerciseId && (
        <ExercisePreviewModal
          exerciseId={previewExerciseId}
          onClose={() => setPreviewExerciseId(null)}
          onAdd={(id) => {
            setPreviewExerciseId(null)
            handleAdd(id)
          }}
        />
      )}
    </div>
  )
}
