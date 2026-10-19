import { useState, useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Search, X, Plus } from 'lucide-react'
import { db } from '../db'
import { ExerciseDemo } from './ExerciseDemo'
import { ExerciseFormModal } from './ExerciseFormModal'
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
}

export function ExerciseSelectorModal({
  isOpen,
  onClose,
  onSelectExercises,
}: ExerciseSelectorModalProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedMuscle, setSelectedMuscle] = useState('Todos')
  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentFilter>('Todos')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  const exercises = useLiveQuery(() => db.exercises.toArray(), [])

  const filteredExercises = useMemo(() => {
    if (!exercises) return []
    const q = normalize(searchQuery.trim())
    return exercises.filter((ex) => {
      const matchesSearch = !q || normalize(ex.name).includes(q)
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
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-center p-0 sm:p-4">
      <div className="w-full max-w-md h-full sm:h-[90vh] flex flex-col bg-black sm:border border-neutral-800 sm:rounded-2xl shadow-2xl overflow-hidden">
        {/* Encabezado */}
        <div className="p-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-900/60">
          <div>
            <h2 className="text-lg font-bold text-white">Añadir Ejercicios</h2>
            <p className="text-xs text-neutral-400">
              Toca un ejercicio para añadirlo a tu entrenamiento.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white flex items-center justify-center transition"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Buscador */}
        <div className="p-3 border-b border-neutral-800/80 bg-black space-y-2">
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-neutral-400">
              <Search size={16} />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Buscar por nombre (ej. Press, Sentadilla)..."
              className="w-full pl-9 pr-8 py-2 bg-neutral-900 border border-neutral-800 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-white transition"
            />
            {searchQuery && (
              <button
                onClick={() => handleSearchChange('')}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-neutral-400 hover:text-white"
                aria-label="Limpiar búsqueda"
              >
                <X size={14} />
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
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition border ${
                    isSelected
                      ? 'bg-white text-black font-semibold border-white shadow-sm'
                      : 'bg-neutral-900 text-neutral-400 hover:text-white border-neutral-800'
                  }`}
                >
                  {muscle}
                </button>
              )
            })}
          </div>

          {/* Filtros de equipo */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
            <span className="text-xs text-neutral-400 font-medium shrink-0 mr-1">Equipo:</span>
            {EQUIPMENT_FILTERS.map((filter) => {
              const isSelected = selectedEquipment === filter
              return (
                <button
                  key={filter}
                  type="button"
                  onClick={() => handleEquipmentChange(filter)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition border ${
                    isSelected
                      ? 'bg-white text-black font-semibold border-white shadow-sm'
                      : 'bg-neutral-900 text-neutral-400 hover:text-white border-neutral-800'
                  }`}
                >
                  {filter}
                </button>
              )
            })}
          </div>
        </div>

        {/* Contador */}
        <div className="px-4 py-1.5 text-xs text-neutral-400 bg-neutral-950/60 border-b border-neutral-800/40 flex items-center justify-between">
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
                    onClick={() => handleAdd(exercise.id)}
                    className="p-3 rounded-xl border transition cursor-pointer flex items-center justify-between gap-3 active:scale-[0.99] bg-neutral-900 hover:bg-neutral-800/80 border-neutral-800"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <ExerciseDemo exerciseId={exercise.id} variant="thumb" alt={exercise.name} />
                      <div className="space-y-1 min-w-0">
                        <div className="font-semibold text-white text-sm leading-snug truncate">
                          {exercise.name}
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-white font-medium">{exercise.muscleGroup}</span>
                          <span className="text-neutral-600">•</span>
                          <span className="text-neutral-400">{exercise.equipment}</span>
                          <span className="text-neutral-600">•</span>
                          <span className="text-neutral-500">{formatExerciseType(exercise.type)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Botón de añadir */}
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border border-neutral-700 bg-neutral-800/60 text-neutral-300"
                      aria-label="Añadir"
                    >
                      <Plus size={16} strokeWidth={2.5} />
                    </div>
                  </div>
                )
              })}

              {/* Botón Mostrar más */}
              {filteredExercises.length > visibleCount && (
                <div className="pt-1 pb-2 text-center">
                  <button
                    type="button"
                    onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
                    className="w-full py-2.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 text-white text-xs font-semibold rounded-xl transition shadow-sm"
                  >
                    Mostrar más ({filteredExercises.length - visibleCount} restantes)
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="py-12 text-center text-neutral-400 space-y-3 px-4">
              <Search size={32} className="mx-auto text-neutral-600" />
              <div>
                <p className="text-sm font-semibold text-white">No se encontraron ejercicios</p>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Prueba con otra búsqueda o crea tu propio ejercicio personalizado.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-neutral-200 text-black text-xs font-bold rounded-xl transition shadow-sm mt-1"
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
        <div className="p-3 border-t border-neutral-800 bg-neutral-900/80 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-1.5 text-xs text-neutral-300 hover:text-white transition font-medium"
          >
            <Plus size={14} />
            <span>Crear ejercicio</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition"
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
    </div>
  )
}
