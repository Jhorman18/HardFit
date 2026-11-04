import { getLatestBodyweightKg } from '../utils/weightUnits'
import { ExerciseFocusSelector } from '../components/ExerciseFocusSelector'
import { getExerciseFocusDefinition, getExerciseFocusInstructions } from '../data/exerciseFocus'
import { useState, useMemo, useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Search, X, ChevronRight, Plus, Trash2 } from 'lucide-react'
import { db } from '../db'
import { ExerciseDemo } from '../components/ExerciseDemo'
import { BodyMuscleChart } from '../components/BodyMuscleChart'
import { ExerciseFormModal } from '../components/ExerciseFormModal'
import { ExerciseHistoryTab } from '../components/ExerciseHistoryTab'
import { ExerciseNotesTab } from '../components/ExerciseNotesTab'
import { MuscleToggleList } from '../components/MuscleToggleList'
import { exerciseMedia } from '../data/exerciseMedia'
import { getEffectiveMedia } from '../utils/effectiveMuscles'
import type { Exercise, ExerciseType } from '../types'

type DetailTab = 'resumen' | 'historial' | 'notas'

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
      return 'Carga y Repeticiones'
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

export function ExercisesPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedMuscle, setSelectedMuscle] = useState('Todos')
  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentFilter>('Todos')
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null)
  const [detailTab, setDetailTab] = useState<DetailTab>('resumen')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [instructionsMap, setInstructionsMap] = useState<Record<string, string[]> | null>(null)

  useEffect(() => {
    if (selectedExercise && !instructionsMap) {
      import('../data/exerciseInstructions.json').then((module) => {
        setInstructionsMap(module.default as Record<string, string[]>)
      })
    }
  }, [selectedExercise, instructionsMap])

  const exercises = useLiveQuery(() => db.exercises.toArray(), [])
  const workouts = useLiveQuery(() => db.workouts.toArray(), [])
  const measurements = useLiveQuery(() => db.measurements.toArray(), [])
  const settings = useLiveQuery(() => db.settings.get('app'), [])

  const unit = (settings && 'units' in settings && settings.units) || 'kg'

  const latestBodyweight = useMemo(() => getLatestBodyweightKg(measurements), [measurements])

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

  const handleDeleteExercise = async () => {
    if (!selectedExercise || !selectedExercise.isCustom) return
    const confirmed = window.confirm(
      `¿Estás seguro de que deseas eliminar "${selectedExercise.name}"? Esta acción no se puede deshacer.`
    )
    if (!confirmed) return

    try {
      await db.exercises.delete(selectedExercise.id)
      setSelectedExercise(null)
    } catch (err) {
      console.error('Error al eliminar ejercicio:', err)
      alert('Error al intentar eliminar el ejercicio.')
    }
  }

  const selectedOverride = useLiveQuery(
    () => (selectedExercise ? db.muscleOverrides.get(selectedExercise.id) : undefined),
    [selectedExercise?.id]
  )

  const hasBaseMedia = Boolean(selectedExercise && exerciseMedia[selectedExercise.id])
  const effectiveMedia = useMemo(() => {
    if (!selectedExercise) return undefined
    return getEffectiveMedia(selectedExercise.id, selectedOverride)
  }, [selectedExercise, selectedOverride])
  const instructions = selectedExercise
    ? getExerciseFocusInstructions(selectedExercise.id, selectedOverride?.focus) ?? instructionsMap?.[selectedExercise.id]
    : undefined


  return (
    <div className="p-4 space-y-4">
      <div className="border-b border-neutral-800 pb-3 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Ejercicios</h1>
          <p className="text-sm text-neutral-400 mt-1">
            Catálogo local de movimientos de fuerza y acondicionamiento.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="shrink-0 flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-neutral-200 text-black text-xs font-bold rounded-xl transition shadow-sm"
        >
          <Plus size={16} strokeWidth={2.5} />
          <span>Nuevo ejercicio</span>
        </button>
      </div>

      {/* Buscador */}
      <div className="relative">
        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-neutral-400">
          <Search size={16} />
        </span>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Buscar por nombre (ej. Press, Sentadilla)..."
          className="w-full pl-9 pr-8 py-2.5 bg-neutral-900 border border-neutral-800 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-white transition"
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

      {/* Filtros de grupo muscular en scroll horizontal */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {MUSCLE_GROUPS.map((muscle) => {
          const isSelected = selectedMuscle === muscle
          return (
            <button
              key={muscle}
              onClick={() => handleMuscleChange(muscle)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition border ${
                isSelected
                  ? 'bg-white text-black font-semibold border-white shadow-sm'
                  : 'bg-neutral-900 text-neutral-400 hover:text-white border-neutral-800 hover:border-neutral-700'
              }`}
            >
              {muscle}
            </button>
          )
        })}
      </div>

      {/* Filtros de equipo */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <span className="text-xs text-neutral-400 font-medium shrink-0 mr-1">Equipo:</span>
        {EQUIPMENT_FILTERS.map((filter) => {
          const isSelected = selectedEquipment === filter
          return (
            <button
              key={filter}
              type="button"
              onClick={() => handleEquipmentChange(filter)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition border ${
                isSelected
                  ? 'bg-white text-black font-semibold border-white shadow-sm'
                  : 'bg-neutral-900 text-neutral-400 hover:text-white border-neutral-800 hover:border-neutral-700'
              }`}
            >
              {filter}
            </button>
          )
        })}
      </div>

      {/* Contador de resultados */}
      <div className="flex items-center justify-between text-xs text-neutral-400 px-1">
        <span>
          {exercises ? (
            <>
              Mostrando <strong className="text-white">{displayedExercises.length}</strong> de {filteredExercises.length} ejercicios
            </>
          ) : (
            'Cargando librería...'
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

      {/* Lista de ejercicios con miniaturas paginada */}
      {filteredExercises.length > 0 ? (
        <div className="space-y-2">
          {displayedExercises.map((exercise) => (
            <div
              key={exercise.id}
              onClick={() => {
                setSelectedExercise(exercise)
                setDetailTab('resumen')
              }}
              className="bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-xl p-3.5 transition flex items-center justify-between gap-3 cursor-pointer group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <ExerciseDemo exerciseId={exercise.id} variant="thumb" alt={exercise.name} />
                <div className="space-y-1 min-w-0">
                  <h3 className="font-semibold text-white text-sm leading-snug truncate group-hover:text-neutral-200">
                    {exercise.name}
                  </h3>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="inline-flex items-center text-white font-medium">
                      {exercise.muscleGroup}
                    </span>
                    <span className="text-neutral-600">•</span>
                    <span className="text-neutral-400">{exercise.equipment}</span>
                    <span className="text-neutral-600">•</span>
                    <span className="text-neutral-500">
                      {formatExerciseType(exercise.type)}
                    </span>
                  </div>
                </div>
              </div>

              <ChevronRight size={16} className="text-neutral-500 group-hover:text-neutral-300 shrink-0" />
            </div>
          ))}

          {/* Botón Mostrar más */}
          {filteredExercises.length > visibleCount && (
            <div className="pt-2 pb-2 text-center">
              <button
                type="button"
                onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
                className="w-full py-3 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 text-white text-xs font-semibold rounded-xl transition shadow-sm"
              >
                Mostrar más ({filteredExercises.length - visibleCount} restantes)
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8 text-center space-y-2">
          <Search size={32} className="mx-auto text-neutral-600" />
          <h3 className="text-base font-semibold text-white">No se encontraron ejercicios</h3>
          <p className="text-xs text-neutral-400">
            Intenta con otro término de búsqueda o limpia el filtro de músculo seleccionado.
          </p>
          {(searchQuery || selectedMuscle !== 'Todos') && (
            <button
              onClick={() => {
                handleSearchChange('')
                handleMuscleChange('Todos')
              }}
              className="mt-2 text-xs text-white hover:underline font-medium"
            >
              Restablecer filtros
            </button>
          )}
        </div>
      )}

      {/* MODAL DE DETALLE DEL EJERCICIO CON PESTAÑAS (RESUMEN, HISTORIAL, NOTAS) */}
      {selectedExercise && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 max-w-md w-full space-y-4 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            {/* Cabecera modal */}
            <div className="flex items-start justify-between gap-2 border-b border-neutral-800 pb-3">
              <div>
                <h3 className="font-bold text-white text-base leading-snug">
                  {selectedExercise.name}
                </h3>
                <span className="text-xs text-neutral-400 mt-0.5 block">
                  {selectedExercise.muscleGroup} • {selectedExercise.equipment}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedExercise(null)}
                className="w-8 h-8 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white flex items-center justify-center transition shrink-0"
                aria-label="Cerrar detalle"
              >
                <X size={18} />
              </button>
            </div>

            {/* Pestañas: Resumen | Historial | Notas */}
            <div className="flex bg-neutral-950 p-1 rounded-xl border border-neutral-800">
              <button
                type="button"
                onClick={() => setDetailTab('resumen')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition ${
                  detailTab === 'resumen'
                    ? 'bg-neutral-800 text-white shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Resumen
              </button>
              <button
                type="button"
                onClick={() => setDetailTab('historial')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition ${
                  detailTab === 'historial'
                    ? 'bg-neutral-800 text-white shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Historial
              </button>
              <button
                type="button"
                onClick={() => setDetailTab('notas')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition ${
                  detailTab === 'notas'
                    ? 'bg-neutral-800 text-white shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Notas
              </button>
            </div>

            {/* Pestaña: Resumen */}
            {detailTab === 'resumen' && (
              <div className="space-y-4">
                <ExerciseFocusSelector exerciseId={selectedExercise.id} />
                {/* Demostración grande animada */}
                <div className="flex justify-center">
                  <ExerciseDemo
                    exerciseId={selectedExercise.id}
                    gifUrl={effectiveMedia?.gifUrl}
                    variant="full"
                    alt={selectedExercise.name}
                  />
                </div>

                {/* Mapa muscular anatómico */}
                {hasBaseMedia && effectiveMedia ? (
                  <div className="bg-neutral-950 p-3.5 rounded-xl border border-neutral-800 space-y-3">
                    <div className="flex items-center justify-between border-b border-neutral-800/80 pb-2">
                      <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">
                        Mapa Muscular
                      </span>
                      <div className="flex items-center gap-3 text-[10px]">
                        {effectiveMedia.primary.length > 0 && (
                          <span className="flex items-center gap-1.5 text-neutral-300">
                            <span className="w-2 h-2 rounded-full bg-[#dc2626] inline-block" />
                            Primario
                          </span>
                        )}
                        {effectiveMedia.secondary.length > 0 && (
                          <span className="flex items-center gap-1.5 text-neutral-400">
                            <span className="w-2 h-2 rounded-full bg-[#f97316] inline-block" />
                            Secundario
                          </span>
                        )}
                      </div>
                    </div>

                    <BodyMuscleChart
                      primary={effectiveMedia.primary}
                      secondary={effectiveMedia.secondary}
                      size="lg"
                    />

                    <div className="space-y-1 pt-1 text-xs border-t border-neutral-800/60">
                      {effectiveMedia.primaryEs.length > 0 ? (
                        <div className="leading-snug">
                          <span className="font-semibold text-white">Músculos: </span>
                          <span className="text-neutral-200">
                            {effectiveMedia.primaryEs.join(', ')}
                          </span>
                        </div>
                      ) : (
                        <div className="leading-snug text-neutral-500">
                          Sin músculos primarios activos
                        </div>
                      )}
                      {effectiveMedia.secondaryEs.length > 0 && (
                        <div className="leading-snug text-neutral-400">
                          <span className="font-medium text-neutral-400">Secundarios: </span>
                          <span className="text-neutral-400">
                            {effectiveMedia.secondaryEs.join(', ')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 text-center">
                    <span className="text-xs text-neutral-500">Sin datos de músculos</span>
                  </div>
                )}

                {/* Ajuste interactivo de músculos trabajados */}
                {!getExerciseFocusDefinition(selectedExercise.id) && <MuscleToggleList exerciseId={selectedExercise.id} />}

                {/* Instrucciones de técnica */}
                {instructions && instructions.length > 0 && (
                  <div className="bg-neutral-950 p-3.5 rounded-xl border border-neutral-800 space-y-2">
                    <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider block">
                      Cómo se hace
                    </span>
                    <ol className="space-y-1.5 text-xs text-neutral-300 list-decimal list-inside leading-relaxed">
                      {instructions.map((step, idx) => (
                        <li key={idx} className="text-neutral-300">
                          <span className="text-neutral-200">{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {/* Metadatos del ejercicio */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-neutral-950 p-2.5 rounded-xl border border-neutral-800">
                    <span className="text-[10px] uppercase font-bold text-neutral-400 block mb-0.5">
                      Grupo Muscular
                    </span>
                    <span className="font-semibold text-white">{selectedExercise.muscleGroup}</span>
                  </div>

                  <div className="bg-neutral-950 p-2.5 rounded-xl border border-neutral-800">
                    <span className="text-[10px] uppercase font-bold text-neutral-400 block mb-0.5">
                      Equipamiento
                    </span>
                    <span className="font-semibold text-white">{selectedExercise.equipment}</span>
                  </div>

                  <div className="col-span-2 bg-neutral-950 p-2.5 rounded-xl border border-neutral-800 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-neutral-400 block mb-0.5">
                        Tipo de Métrica
                      </span>
                      <span className="font-semibold text-white">
                        {formatExerciseType(selectedExercise.type)}
                      </span>
                    </div>
                    {selectedExercise.isCustom && (
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-300 border border-neutral-700">
                        Personalizado
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Pestaña: Historial */}
            {detailTab === 'historial' && (
              <ExerciseHistoryTab
                exercise={selectedExercise}
                workouts={workouts}
                bodyweightKg={latestBodyweight}
                unit={unit}
              />
            )}

            {/* Pestaña: Notas */}
            {detailTab === 'notas' && (
              <ExerciseNotesTab exerciseId={selectedExercise.id} />
            )}

            {/* Botones de acción */}
            <div className="space-y-2 pt-2 border-t border-neutral-800">
              {selectedExercise.isCustom && (
                <button
                  type="button"
                  onClick={handleDeleteExercise}
                  className="w-full py-2.5 bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-900/50 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-2"
                >
                  <Trash2 size={15} />
                  <span>Eliminar ejercicio</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setSelectedExercise(null)}
                className="w-full py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de creación de ejercicio propio */}
      <ExerciseFormModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  )
}
