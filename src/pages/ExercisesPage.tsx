import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Search, X, ChevronRight, Plus, Star } from 'lucide-react'
import { db } from '../db'
import { ScreenHeader, HeaderIconButton } from '../components/ui/ScreenHeader'
import { SegTabs } from '../components/ui/SegTabs'
import { ExerciseDemo } from '../components/ExerciseDemo'
import { ExerciseFormModal } from '../components/ExerciseFormModal'
import { ExercisePreviewModal } from '../components/ExercisePreviewModal'
import { formatNumber } from '../utils/format'
import type { ExerciseType } from '../types'

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
      return 'Carga y reps'
    case 'bodyweight_reps':
      return 'Peso corporal'
    case 'bodyweight_assisted':
      return 'Asistido'
    case 'duration':
      return 'Por tiempo'
    case 'distance':
      return 'Por distancia'
    default:
      return type
  }
}

export function ExercisesPage() {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedMuscle, setSelectedMuscle] = useState('Todos')
  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentFilter>('Todos')
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  const exercises = useLiveQuery(() => db.exercises.toArray(), [])

  const customCount = useMemo(() => {
    return exercises ? exercises.filter((e) => e.isCustom).length : 0
  }, [exercises])

  const filteredExercises = useMemo(() => {
    if (!exercises) return []
    const q = normalize(searchQuery.trim())
    return exercises.filter((ex) => {
      const matchesAliases = ex.aliases?.some((alias) => normalize(alias).includes(q))
      const matchesSearch = !q || normalize(ex.name).includes(q) || matchesAliases
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

  return (
    <div className="flex flex-col min-h-full bg-black">
      {/* Cabecera ScreenHeader */}
      <ScreenHeader
        title="Ejercicios"
        subtitle={
          exercises ? (
            <span>
              <span className="num">{formatNumber(exercises.length)}</span> ejercicios
              {customCount > 0 ? (
                <>
                  {' '}· <span className="num">{customCount}</span> personalizados
                </>
              ) : (
                ''
              )}
            </span>
          ) : undefined
        }
        actions={
          <HeaderIconButton
            label="Nuevo ejercicio"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <Plus size={22} strokeWidth={1.75} />
          </HeaderIconButton>
        }
      />

      {/* Pestañas de navegación con SegTabs: Rutinas | Ejercicios */}
      <SegTabs
        value="exercises"
        options={[
          { value: 'routines', label: 'Rutinas' },
          { value: 'exercises', label: 'Ejercicios' },
        ]}
        onChange={(val) => {
          if (val === 'routines') {
            navigate('/routines')
          }
        }}
        label="Secciones de entrenamiento"
      />

      <div className="flex-1 p-4 space-y-4">
        {/* Campo de búsqueda con altura táctil cómoda */}
        <div className="relative flex items-center">
          <Search
            size={18}
            strokeWidth={1.75}
            className="absolute left-3.5 text-neutral-400 pointer-events-none"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Buscar por nombre (ej. Press, Sentadilla)..."
            aria-label="Buscar ejercicio"
            className="field pl-10 pr-12 text-sm"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => handleSearchChange('')}
              className="press absolute right-1 min-w-12 min-h-12 flex items-center justify-center text-neutral-400 active:text-white"
              aria-label="Limpiar búsqueda"
            >
              <X size={16} strokeWidth={2} />
            </button>
          )}
        </div>

        {/* Filtros de grupo muscular con chips de al menos 48 px de área táctil */}
        <div className="space-y-2">
          <div
            className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none"
            role="group"
            aria-label="Filtro de grupo muscular"
          >
            {MUSCLE_GROUPS.map((muscle) => {
              const isSelected = selectedMuscle === muscle
              return (
                <button
                  key={muscle}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => handleMuscleChange(muscle)}
                  className={`press min-h-12 px-4 rounded-md text-xs font-semibold whitespace-nowrap border shrink-0 flex items-center ${
                    isSelected
                      ? 'bg-accent border-accent text-on-accent'
                      : 'bg-surface border-line text-neutral-300 hover:text-white hover:border-line-strong'
                  }`}
                >
                  {muscle}
                </button>
              )
            })}
          </div>

          {/* Filtros de equipamiento con chips de al menos 48 px de área táctil */}
          <div
            className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none"
            role="group"
            aria-label="Filtro de equipamiento"
          >
            {EQUIPMENT_FILTERS.map((filter) => {
              const isSelected = selectedEquipment === filter
              return (
                <button
                  key={filter}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => handleEquipmentChange(filter)}
                  className={`press min-h-12 px-4 rounded-md text-xs font-semibold whitespace-nowrap border shrink-0 flex items-center ${
                    isSelected
                      ? 'bg-accent border-accent text-on-accent'
                      : 'bg-surface border-line text-neutral-300 hover:text-white hover:border-line-strong'
                  }`}
                >
                  {filter}
                </button>
              )
            })}
          </div>
        </div>

        {/* Contador de resultados */}
        <div className="flex items-center justify-between text-xs text-neutral-400 pt-1 border-t border-line">
          <span>
            {exercises ? (
              <>
                Mostrando <strong className="num text-white">{displayedExercises.length}</strong> de{' '}
                <strong className="num text-white">{filteredExercises.length}</strong> ejercicios
              </>
            ) : (
              'Cargando catálogo...'
            )}
          </span>
          {(selectedMuscle !== 'Todos' || selectedEquipment !== 'Todos') && (
            <span className="label-tech text-neutral-300">
              {[
                selectedMuscle !== 'Todos' ? selectedMuscle : null,
                selectedEquipment !== 'Todos' ? selectedEquipment : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </span>
          )}
        </div>

        {/* Lista densa de ejercicios */}
        {filteredExercises.length > 0 ? (
          <div className="border border-line rounded-md overflow-hidden bg-surface divide-y divide-line">
            {displayedExercises.map((exercise) => (
              <div
                key={exercise.id}
                onClick={() => setSelectedExerciseId(exercise.id)}
                className="press flex items-center justify-between gap-3 p-3 min-h-14 cursor-pointer hover:bg-surface-elevated select-none"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <ExerciseDemo exerciseId={exercise.id} variant="thumb" alt={exercise.name} />
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-white text-[15px] leading-tight truncate">
                      {exercise.name}
                    </h3>
                    <div className="label-tech text-neutral-400 mt-1 truncate flex items-center gap-1.5">
                      <span className="text-neutral-200">{exercise.muscleGroup}</span>
                      <span>·</span>
                      <span>{exercise.equipment}</span>
                      <span>·</span>
                      <span>{formatExerciseType(exercise.type)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {exercise.isCustom && (
                    <span
                      title="Ejercicio personalizado"
                      aria-label="Ejercicio personalizado"
                      className="label-tech inline-flex items-center gap-1 text-accent border border-line-strong px-1.5 py-0.5 rounded-sm"
                    >
                      <Star size={11} fill="currentColor" strokeWidth={0} />
                      <span className="hidden sm:inline">Propio</span>
                    </span>
                  )}
                  <ChevronRight size={18} strokeWidth={1.75} className="text-neutral-400 shrink-0" />
                </div>
              </div>
            ))}

            {/* Carga por tramos: Botón Mostrar más */}
            {filteredExercises.length > visibleCount && (
              <div className="p-3 bg-surface">
                <button
                  type="button"
                  onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
                  className="btn-secondary w-full"
                >
                  Mostrar más (<span className="num">{filteredExercises.length - visibleCount}</span> restantes)
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="panel p-8 text-center space-y-3">
            <Search size={32} strokeWidth={1.5} className="mx-auto text-neutral-400" />
            <h3 className="section-title">No se encontraron ejercicios</h3>
            <p className="text-xs text-neutral-400 max-w-sm mx-auto">
              Intenta con otro término de búsqueda o limpia los filtros seleccionados.
            </p>
            {(searchQuery || selectedMuscle !== 'Todos' || selectedEquipment !== 'Todos') && (
              <button
                type="button"
                onClick={() => {
                  handleSearchChange('')
                  handleMuscleChange('Todos')
                  handleEquipmentChange('Todos')
                }}
                className="btn-secondary mt-2"
              >
                Restablecer filtros
              </button>
            )}
          </div>
        )}
      </div>

      {/* Modal de detalle y vista previa completa del ejercicio */}
      {selectedExerciseId && (
        <ExercisePreviewModal
          exerciseId={selectedExerciseId}
          onClose={() => setSelectedExerciseId(null)}
        />
      )}

      {/* Modal de creación de ejercicio propio */}
      <ExerciseFormModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={(newId) => {
          setSelectedExerciseId(newId)
        }}
      />
    </div>
  )
}
