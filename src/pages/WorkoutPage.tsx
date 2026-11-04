import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Dumbbell,
  Plus,
  ClipboardList,
  MoreVertical,
  List,
  Maximize2,
} from 'lucide-react'
import { useWorkoutStore } from '../store'
import { ExerciseSelectorModal } from '../components/ExerciseSelectorModal'
import { ExercisePreviewModal } from '../components/ExercisePreviewModal'
import { RestPicker } from '../components/RestPicker'
import { RestTimerBar } from '../components/RestTimerBar'
import { ScreenHeader, HeaderIconButton, Sheet } from '../components/ui'
import { SheetView } from '../components/workout/SheetView'
import { FocusView } from '../components/workout/FocusView'
import { WorkoutMenuSheet } from '../components/workout/WorkoutMenuSheet'
import { RestExpandedSheet } from '../components/workout/RestExpandedSheet'
import {
  useExerciseMap,
  usePreviousHistoryMap,
  useAppSettings,
} from '../components/workout/useWorkoutData'
import { db } from '../db'
import { changeRoutineItemWeightUnit, getEntryWeightUnit, type WeightUnit } from '../utils/weightUnits'
import { DEFAULT_BAR_KG } from '../utils/plates'

type PickerState = { mode: 'global' } | { mode: 'entry'; entryIndex: number } | null

const VIEW_KEY = 'replog_workout_view'

function readSavedView(): 'sheet' | 'focus' {
  try {
    const v = localStorage.getItem(VIEW_KEY)
    return v === 'focus' ? 'focus' : 'sheet'
  } catch {
    return 'sheet'
  }
}

function saveView(view: 'sheet' | 'focus') {
  try {
    localStorage.setItem(VIEW_KEY, view)
  } catch {
    /* noop */
  }
}

export function WorkoutPage() {
  const navigate = useNavigate()

  const {
    activeWorkout,
    startEmptyWorkout,
    finishWorkout,
    updateWorkoutName,
    updateWorkoutNotes,
    addExercise,
    replaceExercise,
    setWorkoutRest,
    setEntryRest,
    setWorkoutWeightUnit,
    setEntryWeightUnit,
  } = useWorkoutStore()

  const settings = useAppSettings()
  const exerciseMap = useExerciseMap()
  const previousHistoryMap = usePreviousHistoryMap()

  const [view, setView] = useState<'sheet' | 'focus'>(readSavedView)
  const [focusEntry, setFocusEntry] = useState(0)
  const [focusSet, setFocusSet] = useState(0)
  const [isSelectorOpen, setIsSelectorOpen] = useState(false)
  const [restPickerState, setRestPickerState] = useState<PickerState>(null)
  const [previewExerciseId, setPreviewExerciseId] = useState<string | null>(null)
  const [replacingEntryIndex, setReplacingEntryIndex] = useState<number | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [notesOpen, setNotesOpen] = useState(false)
  const [restExpanded, setRestExpanded] = useState(false)
  const [elapsedTime, setElapsedTime] = useState('00:00')

  const appUnit: WeightUnit = (settings && 'units' in settings && settings.units) || 'kg'
  const unit = activeWorkout?.weightUnit ?? appUnit
  const showRpe = !!(settings && 'showRpe' in settings && settings.showRpe)
  const appRestSeconds =
    settings && 'restSeconds' in settings && typeof settings.restSeconds === 'number'
      ? settings.restSeconds
      : 120
  const efectivoGlobal = activeWorkout?.restSeconds ?? appRestSeconds
  const barKg =
    settings && 'barKg' in settings && typeof settings.barKg === 'number'
      ? settings.barKg
      : DEFAULT_BAR_KG

  useEffect(() => {
    if (!activeWorkout) return
    const update = () => {
      const now = Date.now()
      const diffSec = Math.max(0, Math.floor((now - activeWorkout.startedAt) / 1000))
      const hours = Math.floor(diffSec / 3600)
      const minutes = Math.floor((diffSec % 3600) / 60)
      const seconds = diffSec % 60
      if (hours > 0) {
        setElapsedTime(
          `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
        )
      } else {
        setElapsedTime(`${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`)
      }
    }
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [activeWorkout])

  const switchView = useCallback((v: 'sheet' | 'focus') => {
    setView(v)
    saveView(v)
  }, [])

  const openFoco = useCallback(
    (entryIndex: number, setIndex: number) => {
      setFocusEntry(entryIndex)
      setFocusSet(setIndex)
      switchView('focus')
    },
    [switchView]
  )

  // El cambio también queda en la rutina: en un gimnasio hay máquinas en kg y otras en lb.
  const handleToggleEntryUnit = async (entryIndex: number) => {
    const entry = activeWorkout?.entries[entryIndex]
    if (!activeWorkout || !entry) return
    const next: WeightUnit = getEntryWeightUnit(activeWorkout, entry, appUnit) === 'kg' ? 'lb' : 'kg'
    setEntryWeightUnit(entryIndex, next)

    if (!activeWorkout.routineId) return
    try {
      const routine = await db.routines.get(activeWorkout.routineId)
      if (!routine) return
      await db.routines.put({
        ...routine,
        items: routine.items.map((item) =>
          item.exerciseId === entry.exerciseId
            ? changeRoutineItemWeightUnit(item, routine.weightUnit ?? appUnit, next)
            : item
        ),
      })
    } catch (err) {
      console.error('No se pudo guardar la unidad en la rutina:', err)
    }
  }

  const handleFinish = async () => {
    try {
      const w = await finishWorkout()
      if (w && w.id) {
        navigate(`/workout/summary/${w.id}`, { replace: true })
      } else {
        navigate('/')
      }
    } catch (err) {
      console.error('Error al terminar entrenamiento:', err)
    }
  }

  const handleAddExercises = (exerciseIds: string[]) => {
    if (replacingEntryIndex !== null) {
      if (exerciseIds.length > 0) {
        replaceExercise(replacingEntryIndex, exerciseIds[0])
      }
      setReplacingEntryIndex(null)
      return
    }
    for (const id of exerciseIds) {
      addExercise(id)
    }
  }

  if (!activeWorkout) {
    return (
      <div className="flex flex-col min-h-[100dvh]">
        <ScreenHeader title="Entrenar" />
        <div className="flex-1 flex flex-col items-center justify-center px-4 pb-8">
          <div className="w-full max-w-sm text-center space-y-6">
            <div className="w-16 h-16 rounded-md bg-elevated border border-line flex items-center justify-center mx-auto">
              <Dumbbell size={32} className="text-neutral-300" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Comenzar sesión</h2>
              <p className="text-[15px] text-neutral-300 mt-2 max-w-xs mx-auto">
                Empieza un entrenamiento libre, agrega ejercicios y registra tus series en tiempo real.
              </p>
            </div>
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => startEmptyWorkout()}
                className="btn-primary w-full"
              >
                <Plus size={18} strokeWidth={2} />
                <span>Empezar entreno vacío</span>
              </button>
              <button
                type="button"
                onClick={() => navigate('/routines')}
                className="btn-secondary w-full"
              >
                <ClipboardList size={18} strokeWidth={1.75} />
                <span>Iniciar desde una rutina</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[100dvh]">
      {/* Cabecera */}
      <header className="shrink-0 flex items-center gap-1 px-1 pt-[env(safe-area-inset-top)] bg-surface border-b border-line min-h-14">
        {view === 'focus' ? (
          <HeaderIconButton
            label="Cambiar a vista Hoja"
            onClick={() => switchView('sheet')}
          >
            <List size={22} strokeWidth={1.75} />
          </HeaderIconButton>
        ) : null}

        <div className="flex-1 min-w-0 pl-3">
          {view === 'sheet' ? (
            <>
              <input
                type="text"
                value={activeWorkout.name}
                onChange={(e) => updateWorkoutName(e.target.value)}
                placeholder="Nombre del entreno"
                className="w-full bg-transparent text-[17px] font-semibold text-white focus:outline-none truncate"
                aria-label="Nombre del entreno"
              />
              <div className="flex items-center gap-2 mt-0.5">
                <span className="num text-sm text-neutral-300">{elapsedTime}</span>
                {activeWorkout.routineId && (
                  <span className="label-tech text-neutral-400">Rutina</span>
                )}
              </div>
            </>
          ) : (
            <div className="py-1">
              <h1 className="text-[17px] font-semibold text-white truncate">
                {activeWorkout.name || 'Entreno activo'}
              </h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="label-tech text-neutral-400">Modo Foco</span>
                <span className="text-neutral-400 text-xs">·</span>
                <span className="num text-sm text-neutral-300">{elapsedTime}</span>
              </div>
            </div>
          )}
        </div>

        {view === 'sheet' && (
          <HeaderIconButton
            label="Cambiar a vista Foco"
            onClick={() => switchView('focus')}
          >
            <Maximize2 size={20} strokeWidth={1.75} />
          </HeaderIconButton>
        )}

        <HeaderIconButton label="Menú del entreno" onClick={() => setMenuOpen(true)}>
          <MoreVertical size={20} strokeWidth={1.75} />
        </HeaderIconButton>
      </header>

      {/* Contenido principal */}
      {view === 'sheet' ? (
        <>
          <SheetView
            workout={activeWorkout}
            exerciseMap={exerciseMap}
            previousHistoryMap={previousHistoryMap}
            appUnit={appUnit}
            efectivoGlobal={efectivoGlobal}
            barKg={barKg}
            onOpenFoco={openFoco}
            onToggleUnit={handleToggleEntryUnit}
            onOpenSelector={() => setIsSelectorOpen(true)}
            onOpenReplace={(idx) => {
              setReplacingEntryIndex(idx)
              setIsSelectorOpen(true)
            }}
            onOpenRestPicker={(mode) => {
              if (mode === 'global') setRestPickerState({ mode: 'global' })
              else setRestPickerState({ mode: 'entry', entryIndex: mode.entryIndex })
            }}
            onOpenPreview={(id) => setPreviewExerciseId(id)}
          />

          {/* Zona inferior fija en Hoja */}
          <div className="shrink-0 px-4 pb-[env(safe-area-inset-bottom)] bg-black border-t border-line">
            <RestTimerBar onExpand={() => setRestExpanded(true)} />
            <div className="py-2">
              <button
                type="button"
                onClick={handleFinish}
                className="btn-primary w-full"
              >
                Terminar entreno
              </button>
            </div>
          </div>
        </>
      ) : (
        <FocusView
          workout={activeWorkout}
          exerciseMap={exerciseMap}
          previousHistoryMap={previousHistoryMap}
          appUnit={appUnit}
          showRpe={showRpe}
          barKg={barKg}
          focusEntry={focusEntry}
          focusSet={focusSet}
          onChangeFocus={(ei, si) => {
            setFocusEntry(ei)
            setFocusSet(si)
          }}
          onFinishWorkout={handleFinish}
          onToggleUnit={handleToggleEntryUnit}
        />
      )}

      {/* Modales compartidos */}
      <ExerciseSelectorModal
        isOpen={isSelectorOpen}
        onClose={() => {
          setIsSelectorOpen(false)
          setReplacingEntryIndex(null)
        }}
        onSelectExercises={handleAddExercises}
      />

      {restPickerState && (
        <RestPicker
          isOpen={restPickerState !== null}
          title={
            restPickerState.mode === 'global'
              ? 'Descanso y unidad global'
              : exerciseMap.get(
                  activeWorkout.entries[restPickerState.entryIndex]?.exerciseId
                )?.name ?? 'Ejercicio'
          }
          currentWeightUnit={
            restPickerState.mode === 'global'
              ? unit
              : ['duration', 'distance'].includes(
                    exerciseMap.get(
                      activeWorkout.entries[restPickerState.entryIndex]?.exerciseId
                    )?.type ?? ''
                  )
                ? undefined
                : getEntryWeightUnit(
                    activeWorkout,
                    activeWorkout.entries[restPickerState.entryIndex],
                    appUnit
                  )
          }
          globalWeightUnit={unit}
          weightUnitOverride={
            restPickerState.mode === 'entry'
              ? activeWorkout.entries[restPickerState.entryIndex]?.weightUnit
              : undefined
          }
          onWeightUnitChange={(selected) => {
            if (restPickerState.mode === 'global') setWorkoutWeightUnit(selected ?? appUnit)
            else setEntryWeightUnit(restPickerState.entryIndex, selected)
          }}
          currentSeconds={
            restPickerState.mode === 'global'
              ? efectivoGlobal
              : activeWorkout.entries[restPickerState.entryIndex]?.restSeconds ??
                efectivoGlobal
          }
          allowGlobal={restPickerState.mode === 'entry'}
          onSelect={(seconds) => {
            if (restPickerState.mode === 'global') {
              setWorkoutRest(seconds)
            } else {
              setEntryRest(restPickerState.entryIndex, seconds)
            }
          }}
          onUseGlobal={
            restPickerState.mode === 'entry'
              ? () => setEntryRest(restPickerState.entryIndex, null)
              : undefined
          }
          onClose={() => setRestPickerState(null)}
        />
      )}

      {previewExerciseId && (
        <ExercisePreviewModal
          exerciseId={previewExerciseId}
          onClose={() => setPreviewExerciseId(null)}
          onAdd={() => setPreviewExerciseId(null)}
        />
      )}

      {menuOpen && (
        <WorkoutMenuSheet
          onClose={() => setMenuOpen(false)}
          onAddExercise={() => setIsSelectorOpen(true)}
          onOpenRestPicker={() => setRestPickerState({ mode: 'global' })}
          onOpenNotes={() => setNotesOpen(true)}
          onFinishWorkout={handleFinish}
          onDiscarded={() => navigate('/')}
          workoutName={activeWorkout.name}
          restSeconds={efectivoGlobal}
          unit={unit}
        />
      )}

      {notesOpen && (
        <Sheet title="Notas de la sesión" onClose={() => setNotesOpen(false)}>
          <div className="space-y-4 py-2">
            <textarea
              value={activeWorkout.notes}
              onChange={(e) => updateWorkoutNotes(e.target.value)}
              placeholder="Sensaciones generales, descanso, fatiga..."
              rows={4}
              className="w-full field py-2 resize-none"
            />
            <button
              type="button"
              onClick={() => setNotesOpen(false)}
              className="btn-primary w-full"
            >
              Guardar
            </button>
          </div>
        </Sheet>
      )}

      {restExpanded && (
        <RestExpandedSheet
          onClose={() => setRestExpanded(false)}
        />
      )}
    </div>
  )
}
