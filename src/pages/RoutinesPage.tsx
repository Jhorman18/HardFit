import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  FolderPlus,
  Plus,
  Play,
  ChevronDown,
  ChevronUp,
  Pencil,
  Trash2,
  Copy,
  AlertTriangle,
  MoreVertical,
} from 'lucide-react'
import { db } from '../db'
import { useWorkoutStore } from '../store'
import { ScreenHeader, HeaderIconButton } from '../components/ui/ScreenHeader'
import { SegTabs } from '../components/ui/SegTabs'
import { Sheet } from '../components/ui/Sheet'
import type { Routine, Folder, Exercise } from '../types'

function generateFolderId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `fld-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

function generateRoutineId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `rt-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

export function RoutinesPage() {
  const navigate = useNavigate()
  const { activeWorkout, startFromRoutine } = useWorkoutStore()

  const folders = useLiveQuery(() => db.folders.orderBy('order').toArray(), [])
  const routines = useLiveQuery(() => db.routines.orderBy('order').toArray(), [])
  const exercises = useLiveQuery(() => db.exercises.toArray(), [])

  // Modales
  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [folderToRename, setFolderToRename] = useState<Folder | null>(null)
  const [renameFolderName, setRenameFolderName] = useState('')
  const [folderToDelete, setFolderToDelete] = useState<Folder | null>(null)
  const [folderActionTarget, setFolderActionTarget] = useState<Folder | null>(null)

  const [routineToDelete, setRoutineToDelete] = useState<Routine | null>(null)
  const [routineActionTarget, setRoutineActionTarget] = useState<{
    routine: Routine
    list: Routine[]
    index: number
  } | null>(null)
  const [pendingRoutineToStart, setPendingRoutineToStart] = useState<Routine | null>(null)

  // Estado de carpetas plegadas: Set de folderId colapsadas (las carpetas están abiertas por defecto)
  const [collapsedFolderIds, setCollapsedFolderIds] = useState<Set<string>>(new Set())

  const toggleFolder = (folderId: string) => {
    setCollapsedFolderIds((prev) => {
      const next = new Set(prev)
      if (next.has(folderId)) {
        next.delete(folderId)
      } else {
        next.add(folderId)
      }
      return next
    })
  }

  // Mapa de ejercicios
  const exerciseMap = useMemo(() => {
    const map = new Map<string, Exercise>()
    if (exercises) {
      for (const ex of exercises) {
        map.set(ex.id, ex)
      }
    }
    return map
  }, [exercises])

  // Conjunto de IDs de carpetas válidas
  const folderIdSet = useMemo(() => {
    return new Set(folders?.map((f) => f.id) || [])
  }, [folders])

  // Rutinas sin carpeta
  const unassignedRoutines = useMemo(() => {
    if (!routines) return []
    return routines
      .filter((r) => !r.folderId || !folderIdSet.has(r.folderId))
      .sort((a, b) => a.order - b.order)
  }, [routines, folderIdSet])

  // Rutinas por carpeta
  const routinesByFolderId = useMemo(() => {
    const map = new Map<string, Routine[]>()
    if (folders && routines) {
      for (const f of folders) {
        const list = routines
          .filter((r) => r.folderId === f.id)
          .sort((a, b) => a.order - b.order)
        map.set(f.id, list)
      }
    }
    return map
  }, [folders, routines])

  // Acciones de Carpeta
  const handleCreateFolder = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const trimmed = newFolderName.trim()
    if (!trimmed) return

    const newOrder = folders && folders.length > 0 ? Math.max(...folders.map((f) => f.order)) + 1 : 0
    await db.folders.add({
      id: generateFolderId(),
      name: trimmed,
      order: newOrder,
    })

    setNewFolderName('')
    setIsNewFolderOpen(false)
  }

  const handleRenameFolder = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!folderToRename) return
    const trimmed = renameFolderName.trim()
    if (!trimmed) return

    await db.folders.update(folderToRename.id, { name: trimmed })
    setFolderToRename(null)
    setRenameFolderName('')
  }

  const handleDeleteFolder = async () => {
    if (!folderToDelete) return

    await db.transaction('rw', db.folders, db.routines, async () => {
      // Mover todas las rutinas de esta carpeta a "Sin carpeta"
      const targetRoutines = await db.routines.where('folderId').equals(folderToDelete.id).toArray()
      for (const r of targetRoutines) {
        await db.routines.update(r.id, { folderId: null })
      }
      await db.folders.delete(folderToDelete.id)
    })

    setFolderToDelete(null)
  }

  const handleMoveFolder = async (folderIndex: number, direction: 'up' | 'down') => {
    if (!folders) return
    const targetIndex = direction === 'up' ? folderIndex - 1 : folderIndex + 1
    if (targetIndex < 0 || targetIndex >= folders.length) return

    const current = folders[folderIndex]
    const target = folders[targetIndex]

    await db.transaction('rw', db.folders, async () => {
      await db.folders.update(current.id, { order: target.order })
      await db.folders.update(target.id, { order: current.order })
    })
  }

  // Acciones de Rutina
  const handleDeleteRoutine = async () => {
    if (!routineToDelete) return
    await db.routines.delete(routineToDelete.id)
    setRoutineToDelete(null)
  }

  const handleDuplicateRoutine = async (routine: Routine) => {
    const newRoutine: Routine = {
      ...routine,
      id: generateRoutineId(),
      name: `${routine.name} (copia)`,
      order: Date.now(),
    }
    await db.routines.add(newRoutine)
    setRoutineActionTarget(null)
  }

  const handleMoveRoutine = async (list: Routine[], index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= list.length) return

    const current = list[index]
    const target = list[targetIndex]

    await db.transaction('rw', db.routines, async () => {
      await db.routines.update(current.id, { order: target.order })
      await db.routines.update(target.id, { order: current.order })
    })
  }

  const handleStartRoutine = async (routine: Routine) => {
    if (activeWorkout) {
      setPendingRoutineToStart(routine)
    } else {
      const success = await startFromRoutine(routine.id)
      if (success) {
        navigate('/workout')
      }
    }
  }

  const handleConfirmStartWithActiveWorkout = async () => {
    if (!pendingRoutineToStart) return
    const success = await startFromRoutine(pendingRoutineToStart.id, { force: true })
    setPendingRoutineToStart(null)
    if (success) {
      navigate('/workout')
    }
  }

  const getExerciseSummary = (routine: Routine): string => {
    if (!routine.items || routine.items.length === 0) {
      return 'Sin ejercicios configurados'
    }

    const count = routine.items.length
    const names = routine.items
      .slice(0, 3)
      .map((item) => exerciseMap.get(item.exerciseId)?.name || 'Ejercicio')
      .join(' · ')

    return count > 3 ? `${names}…` : names
  }

  const getRoutineMeta = (routine: Routine): string => {
    const itemsCount = routine.items ? routine.items.length : 0
    const setsCount = routine.items
      ? routine.items.reduce((acc, item) => acc + (item.targetSets?.length || 0), 0)
      : 0
    return `${itemsCount} ${itemsCount === 1 ? 'ejercicio' : 'ejercicios'} · ${setsCount} ${setsCount === 1 ? 'serie' : 'series'}`
  }

  const totalRoutines = routines ? routines.length : 0
  const totalFolders = folders ? folders.length : 0

  return (
    <div className="flex flex-col min-h-full bg-black">
      {/* Cabecera propia de la pantalla con ScreenHeader */}
      <ScreenHeader
        title="Rutinas"
        actions={
          <>
            <HeaderIconButton
              label="Nueva carpeta"
              onClick={() => {
                setNewFolderName('')
                setIsNewFolderOpen(true)
              }}
            >
              <FolderPlus size={20} strokeWidth={1.75} />
            </HeaderIconButton>
            <HeaderIconButton
              label="Nueva rutina"
              onClick={() => navigate('/routines/new')}
            >
              <Plus size={22} strokeWidth={1.75} />
            </HeaderIconButton>
          </>
        }
      />

      {/* Pestañas de navegación Rutinas / Ejercicios */}
      <SegTabs
        value="routines"
        options={[
          { value: 'routines', label: 'Rutinas' },
          { value: 'exercises', label: 'Ejercicios' },
        ]}
        onChange={(val) => {
          if (val === 'exercises') {
            navigate('/exercises')
          }
        }}
        label="Secciones de entrenamiento"
      />

      {/* Contenido principal */}
      <div className="flex-1 p-4 space-y-4">
        {totalRoutines === 0 && totalFolders === 0 ? (
          <div className="panel p-8 text-center space-y-4 my-4">
            <h2 className="section-title">Sin rutinas creadas</h2>
            <p className="text-sm text-neutral-400 max-w-sm mx-auto leading-relaxed">
              Crea plantillas para tus sesiones habituales (por ejemplo: Empuje/Tirón/Pierna o Torso/Pierna)
              y organízalas en carpetas.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setNewFolderName('')
                  setIsNewFolderOpen(true)
                }}
                className="btn-secondary"
              >
                <FolderPlus size={18} strokeWidth={1.75} />
                <span>Nueva carpeta</span>
              </button>
              <button
                type="button"
                onClick={() => navigate('/routines/new')}
                className="btn-primary"
              >
                <Plus size={18} strokeWidth={2} />
                <span>Crear primera rutina</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Listado de Carpetas */}
            {folders &&
              folders.map((folder) => {
                const folderRoutines = routinesByFolderId.get(folder.id) || []
                const isCollapsed = collapsedFolderIds.has(folder.id)

                return (
                  <div key={folder.id} className="border border-line rounded-md overflow-hidden bg-surface">
                    {/* Encabezado de la Carpeta (Plegable) */}
                    <div className="flex items-center justify-between border-b border-line bg-surface-elevated">
                      <button
                        type="button"
                        onClick={() => toggleFolder(folder.id)}
                        aria-expanded={!isCollapsed}
                        className="press flex-1 min-h-12 flex items-center gap-2 px-3 text-left"
                      >
                        <ChevronDown
                          size={18}
                          className={`text-neutral-400 transition-transform duration-150 shrink-0 ${
                            isCollapsed ? '-rotate-90' : 'rotate-0'
                          }`}
                        />
                        <span className="label-tech text-neutral-200 truncate flex-1">
                          {folder.name}
                        </span>
                        <span className="num text-xs text-neutral-400 bg-surface px-2 py-0.5 rounded-sm border border-line shrink-0">
                          {folderRoutines.length}
                        </span>
                      </button>

                      {/* Botón de opciones de la carpeta */}
                      <button
                        type="button"
                        aria-label={`Opciones de carpeta ${folder.name}`}
                        onClick={() => setFolderActionTarget(folder)}
                        className="press min-w-12 min-h-12 flex items-center justify-center text-neutral-400 active:text-white shrink-0 border-l border-line"
                      >
                        <MoreVertical size={18} strokeWidth={1.75} />
                      </button>
                    </div>

                    {/* Rutinas dentro de la Carpeta (si no está colapsada) */}
                    {!isCollapsed && (
                      <div>
                        {folderRoutines.length > 0 ? (
                          <ul className="divide-y divide-line">
                            {folderRoutines.map((routine, rIdx) => (
                              <li key={routine.id} className="flex items-stretch bg-surface hover:bg-surface-elevated">
                                {/* Botón principal que abre el editor de la rutina */}
                                <button
                                  type="button"
                                  onClick={() => navigate(`/routines/${routine.id}/edit`)}
                                  className="press flex-1 min-w-0 p-3 text-left"
                                >
                                  <span className="block text-[16px] font-semibold text-white truncate">
                                    {routine.name}
                                  </span>
                                  <span className="block text-xs font-medium text-neutral-300 mt-0.5">
                                    <span className="num">{getRoutineMeta(routine)}</span>
                                  </span>
                                  <span className="block text-xs text-neutral-400 truncate mt-1">
                                    {getExerciseSummary(routine)}
                                  </span>
                                </button>

                                {/* Opciones de rutina */}
                                <button
                                  type="button"
                                  aria-label={`Opciones de rutina ${routine.name}`}
                                  onClick={() =>
                                    setRoutineActionTarget({
                                      routine,
                                      list: folderRoutines,
                                      index: rIdx,
                                    })
                                  }
                                  className="press min-w-12 min-h-12 flex items-center justify-center text-neutral-400 active:text-white shrink-0 border-l border-line"
                                >
                                  <MoreVertical size={18} strokeWidth={1.75} />
                                </button>

                                {/* Botón de arranque directo de 48 × 48 px */}
                                <button
                                  type="button"
                                  aria-label={`Empezar ${routine.name}`}
                                  onClick={() => handleStartRoutine(routine)}
                                  className="press min-w-12 min-h-12 flex items-center justify-center text-accent active:scale-95 border-l border-line shrink-0"
                                >
                                  <Play size={20} fill="currentColor" strokeWidth={0} />
                                </button>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <div className="p-4 text-center text-xs text-neutral-400 space-y-2">
                            <p>No hay rutinas en esta carpeta.</p>
                            <button
                              type="button"
                              onClick={() => navigate(`/routines/new?folderId=${folder.id}`)}
                              className="text-xs text-white hover:underline font-semibold"
                            >
                              + Añadir rutina a {folder.name}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}

            {/* Sección Sin Carpeta */}
            {unassignedRoutines.length > 0 && (
              <div className="border border-line rounded-md overflow-hidden bg-surface">
                {/* Encabezado plegable Sin carpeta */}
                <div className="flex items-center justify-between border-b border-line bg-surface-elevated">
                  <button
                    type="button"
                    onClick={() => toggleFolder('unassigned')}
                    aria-expanded={!collapsedFolderIds.has('unassigned')}
                    className="press flex-1 min-h-12 flex items-center gap-2 px-3 text-left"
                  >
                    <ChevronDown
                      size={18}
                      className={`text-neutral-400 transition-transform duration-150 shrink-0 ${
                        collapsedFolderIds.has('unassigned') ? '-rotate-90' : 'rotate-0'
                      }`}
                    />
                    <span className="label-tech text-neutral-200 truncate flex-1">
                      Sin carpeta
                    </span>
                    <span className="num text-xs text-neutral-400 bg-surface px-2 py-0.5 rounded-sm border border-line shrink-0">
                      {unassignedRoutines.length}
                    </span>
                  </button>
                </div>

                {!collapsedFolderIds.has('unassigned') && (
                  <ul className="divide-y divide-line">
                    {unassignedRoutines.map((routine, rIdx) => (
                      <li key={routine.id} className="flex items-stretch bg-surface hover:bg-surface-elevated">
                        <button
                          type="button"
                          onClick={() => navigate(`/routines/${routine.id}/edit`)}
                          className="press flex-1 min-w-0 p-3 text-left"
                        >
                          <span className="block text-[16px] font-semibold text-white truncate">
                            {routine.name}
                          </span>
                          <span className="block text-xs font-medium text-neutral-300 mt-0.5">
                            <span className="num">{getRoutineMeta(routine)}</span>
                          </span>
                          <span className="block text-xs text-neutral-400 truncate mt-1">
                            {getExerciseSummary(routine)}
                          </span>
                        </button>

                        <button
                          type="button"
                          aria-label={`Opciones de rutina ${routine.name}`}
                          onClick={() =>
                            setRoutineActionTarget({
                              routine,
                              list: unassignedRoutines,
                              index: rIdx,
                            })
                          }
                          className="press min-w-12 min-h-12 flex items-center justify-center text-neutral-400 active:text-white shrink-0 border-l border-line"
                        >
                          <MoreVertical size={18} strokeWidth={1.75} />
                        </button>

                        <button
                          type="button"
                          aria-label={`Empezar ${routine.name}`}
                          onClick={() => handleStartRoutine(routine)}
                          className="press min-w-12 min-h-12 flex items-center justify-center text-accent active:scale-95 border-l border-line shrink-0"
                        >
                          <Play size={20} fill="currentColor" strokeWidth={0} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Botón inferior Nueva Rutina */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => navigate('/routines/new')}
                className="btn-secondary w-full"
              >
                <Plus size={18} strokeWidth={2} />
                <span>Nueva rutina</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL / SHEET: Nueva Carpeta */}
      {isNewFolderOpen && (
        <Sheet
          title="Nueva carpeta"
          onClose={() => setIsNewFolderOpen(false)}
          footer={
            <button
              type="submit"
              form="new-folder-form"
              disabled={!newFolderName.trim()}
              className="btn-primary w-full"
            >
              Crear carpeta
            </button>
          }
        >
          <form id="new-folder-form" onSubmit={handleCreateFolder} className="space-y-4 pt-1">
            <p className="text-xs text-neutral-400">
              Agrupa tus rutinas según tus bloques de entrenamiento (ej. Fuerza, Hipertrofia, Empuje/Tirón).
            </p>
            <div className="space-y-1.5">
              <label htmlFor="new-folder-name" className="label-tech block">
                Nombre de la carpeta
              </label>
              <input
                id="new-folder-name"
                type="text"
                autoFocus
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Ej. Fuerza · Bloque 3"
                className="field"
              />
            </div>
          </form>
        </Sheet>
      )}

      {/* MODAL / SHEET: Opciones de Carpeta */}
      {folderActionTarget && (
        <Sheet
          title={`Carpeta: ${folderActionTarget.name}`}
          onClose={() => setFolderActionTarget(null)}
        >
          <div className="space-y-1 pt-1">
            {folders && (
              <>
                <button
                  type="button"
                  disabled={folders.findIndex((f) => f.id === folderActionTarget.id) === 0}
                  onClick={() => {
                    const idx = folders.findIndex((f) => f.id === folderActionTarget.id)
                    handleMoveFolder(idx, 'up')
                    setFolderActionTarget(null)
                  }}
                  className="press min-h-12 w-full flex items-center gap-3 px-3 text-left text-sm text-neutral-200 hover:text-white disabled:opacity-30 disabled:pointer-events-none"
                >
                  <ChevronUp size={18} />
                  <span>Subir posición</span>
                </button>
                <button
                  type="button"
                  disabled={
                    folders.findIndex((f) => f.id === folderActionTarget.id) === folders.length - 1
                  }
                  onClick={() => {
                    const idx = folders.findIndex((f) => f.id === folderActionTarget.id)
                    handleMoveFolder(idx, 'down')
                    setFolderActionTarget(null)
                  }}
                  className="press min-h-12 w-full flex items-center gap-3 px-3 text-left text-sm text-neutral-200 hover:text-white disabled:opacity-30 disabled:pointer-events-none"
                >
                  <ChevronDown size={18} />
                  <span>Bajar posición</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => {
                const target = folderActionTarget
                setFolderActionTarget(null)
                setFolderToRename(target)
                setRenameFolderName(target.name)
              }}
              className="press min-h-12 w-full flex items-center gap-3 px-3 text-left text-sm text-neutral-200 hover:text-white"
            >
              <Pencil size={18} />
              <span>Renombrar carpeta</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const target = folderActionTarget
                setFolderActionTarget(null)
                setFolderToDelete(target)
              }}
              className="press min-h-12 w-full flex items-center gap-3 px-3 text-left text-sm text-red-400 hover:text-red-300"
            >
              <Trash2 size={18} />
              <span>Eliminar carpeta</span>
            </button>
          </div>
        </Sheet>
      )}

      {/* MODAL / SHEET: Renombrar Carpeta */}
      {folderToRename && (
        <Sheet
          title="Renombrar carpeta"
          onClose={() => setFolderToRename(null)}
          footer={
            <button
              type="submit"
              form="rename-folder-form"
              disabled={!renameFolderName.trim()}
              className="btn-primary w-full"
            >
              Guardar cambios
            </button>
          }
        >
          <form id="rename-folder-form" onSubmit={handleRenameFolder} className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <label htmlFor="rename-folder-input" className="label-tech block">
                Nuevo nombre
              </label>
              <input
                id="rename-folder-input"
                type="text"
                autoFocus
                value={renameFolderName}
                onChange={(e) => setRenameFolderName(e.target.value)}
                placeholder="Nombre de la carpeta..."
                className="field"
              />
            </div>
          </form>
        </Sheet>
      )}

      {/* MODAL / SHEET: Confirmar Eliminar Carpeta */}
      {folderToDelete && (
        <Sheet
          title="¿Eliminar carpeta?"
          onClose={() => setFolderToDelete(null)}
          footer={
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setFolderToDelete(null)}
                className="btn-secondary flex-1"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteFolder}
                className="press flex-1 min-h-12 bg-red-800 text-white font-semibold rounded-md flex items-center justify-center gap-2"
              >
                Eliminar
              </button>
            </div>
          }
        >
          <div className="space-y-2 pt-1 text-sm text-neutral-300">
            <p>
              La carpeta <strong>&quot;{folderToDelete.name}&quot;</strong> será eliminada.
            </p>
            <p className="text-xs text-neutral-400">
              Sus rutinas no se borrarán: pasarán a la sección &quot;Sin carpeta&quot;.
            </p>
          </div>
        </Sheet>
      )}

      {/* MODAL / SHEET: Opciones de Rutina */}
      {routineActionTarget && (
        <Sheet
          title={routineActionTarget.routine.name}
          onClose={() => setRoutineActionTarget(null)}
        >
          <div className="space-y-1 pt-1">
            <button
              type="button"
              disabled={routineActionTarget.index === 0}
              onClick={() => {
                handleMoveRoutine(
                  routineActionTarget.list,
                  routineActionTarget.index,
                  'up'
                )
                setRoutineActionTarget(null)
              }}
              className="press min-h-12 w-full flex items-center gap-3 px-3 text-left text-sm text-neutral-200 hover:text-white disabled:opacity-30 disabled:pointer-events-none"
            >
              <ChevronUp size={18} />
              <span>Subir posición</span>
            </button>

            <button
              type="button"
              disabled={routineActionTarget.index === routineActionTarget.list.length - 1}
              onClick={() => {
                handleMoveRoutine(
                  routineActionTarget.list,
                  routineActionTarget.index,
                  'down'
                )
                setRoutineActionTarget(null)
              }}
              className="press min-h-12 w-full flex items-center gap-3 px-3 text-left text-sm text-neutral-200 hover:text-white disabled:opacity-30 disabled:pointer-events-none"
            >
              <ChevronDown size={18} />
              <span>Bajar posición</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const r = routineActionTarget.routine
                setRoutineActionTarget(null)
                navigate(`/routines/${r.id}/edit`)
              }}
              className="press min-h-12 w-full flex items-center gap-3 px-3 text-left text-sm text-neutral-200 hover:text-white"
            >
              <Pencil size={18} />
              <span>Editar plantilla</span>
            </button>

            <button
              type="button"
              onClick={() => handleDuplicateRoutine(routineActionTarget.routine)}
              className="press min-h-12 w-full flex items-center gap-3 px-3 text-left text-sm text-neutral-200 hover:text-white"
            >
              <Copy size={18} />
              <span>Duplicar rutina</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const target = routineActionTarget.routine
                setRoutineActionTarget(null)
                setRoutineToDelete(target)
              }}
              className="press min-h-12 w-full flex items-center gap-3 px-3 text-left text-sm text-red-400 hover:text-red-300"
            >
              <Trash2 size={18} />
              <span>Eliminar rutina</span>
            </button>
          </div>
        </Sheet>
      )}

      {/* MODAL / SHEET: Confirmar Eliminar Rutina */}
      {routineToDelete && (
        <Sheet
          title="¿Eliminar rutina?"
          onClose={() => setRoutineToDelete(null)}
          footer={
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setRoutineToDelete(null)}
                className="btn-secondary flex-1"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteRoutine}
                className="press flex-1 min-h-12 bg-red-800 text-white font-semibold rounded-md flex items-center justify-center gap-2"
              >
                Eliminar
              </button>
            </div>
          }
        >
          <div className="space-y-2 pt-1 text-sm text-neutral-300">
            <p>
              ¿Seguro que deseas eliminar <strong>&quot;{routineToDelete.name}&quot;</strong>?
            </p>
            <p className="text-xs text-neutral-400">
              Esta acción no se puede deshacer. Los entrenamientos anteriores completados con esta rutina no se verán afectados.
            </p>
          </div>
        </Sheet>
      )}

      {/* MODAL / SHEET: Confirmar Reemplazo de Entreno Activo */}
      {pendingRoutineToStart && (
        <Sheet
          title="Entrenamiento en curso"
          onClose={() => setPendingRoutineToStart(null)}
          footer={
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPendingRoutineToStart(null)}
                className="btn-secondary flex-1"
              >
                Continuar actual
              </button>
              <button
                type="button"
                onClick={handleConfirmStartWithActiveWorkout}
                className="btn-primary flex-1"
              >
                Reemplazar y empezar
              </button>
            </div>
          }
        >
          <div className="space-y-3 pt-1 text-sm text-neutral-300">
            <div className="flex items-start gap-2.5 p-3 rounded-md bg-surface-elevated border border-line">
              <AlertTriangle size={20} className="text-accent shrink-0 mt-0.5" />
              <div className="text-xs text-neutral-300 leading-relaxed">
                Ya tienes una sesión activa ({activeWorkout?.name || 'Entrenamiento'}). Si inicias{' '}
                <strong>&quot;{pendingRoutineToStart.name}&quot;</strong>, se descartará el progreso
                actual no guardado.
              </div>
            </div>
          </div>
        </Sheet>
      )}
    </div>
  )
}
