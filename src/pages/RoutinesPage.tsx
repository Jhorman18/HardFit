import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  Folder as FolderIcon,
  FolderPlus,
  Plus,
  ClipboardList,
  ChevronUp,
  ChevronDown,
  Pencil,
  Trash2,
  Play,
  FileText,
  AlertTriangle,
} from 'lucide-react'
import { db } from '../db'
import { useWorkoutStore } from '../store'
import type { Routine, Folder, Exercise } from '../types'

function generateFolderId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `fld-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

export function RoutinesPage() {
  const navigate = useNavigate()
  const { activeWorkout, startFromRoutine } = useWorkoutStore()

  const folders = useLiveQuery(() => db.folders.orderBy('order').toArray(), [])
  const routines = useLiveQuery(() => db.routines.orderBy('order').toArray(), [])
  const exercises = useLiveQuery(() => db.exercises.toArray(), [])

  // Modales de carpetas
  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [folderToRename, setFolderToRename] = useState<Folder | null>(null)
  const [renameFolderName, setRenameFolderName] = useState('')
  const [folderToDelete, setFolderToDelete] = useState<Folder | null>(null)

  // Modales de rutinas
  const [routineToDelete, setRoutineToDelete] = useState<Routine | null>(null)
  const [pendingRoutineToStart, setPendingRoutineToStart] = useState<Routine | null>(null)

  // Mapa rápido de ejercicios
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
  const handleCreateFolder = async () => {
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

  const handleRenameFolder = async () => {
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
    const labelCount = count === 1 ? '1 ejercicio' : `${count} ejercicios`

    const names = routine.items
      .slice(0, 3)
      .map((item) => exerciseMap.get(item.exerciseId)?.name || 'Ejercicio')
      .join(', ')

    return count > 3 ? `${labelCount}: ${names}…` : `${labelCount}: ${names}`
  }

  const totalRoutines = routines ? routines.length : 0
  const totalFolders = folders ? folders.length : 0

  return (
    <div className="p-4 space-y-6">
      {/* Encabezado y botones de creación */}
      <div className="border-b border-neutral-800 pb-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Rutinas</h1>
            <p className="text-xs text-neutral-400 mt-1">
              Plantillas de entreno organizadas por carpetas y grupos.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setNewFolderName('')
                setIsNewFolderOpen(true)
              }}
              className="py-2 px-3 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
              title="Crear nueva carpeta"
            >
              <FolderPlus size={15} />
              <span className="hidden sm:inline">Nueva carpeta</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/routines/new')}
              className="py-2 px-3.5 bg-white hover:bg-neutral-200 text-black rounded-xl text-xs font-bold transition shadow-md flex items-center gap-1.5"
            >
              <Plus size={16} />
              <span>Nueva rutina</span>
            </button>
          </div>
        </div>
      </div>

      {/* Si no hay ni rutinas ni carpetas */}
      {totalRoutines === 0 && totalFolders === 0 ? (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-neutral-950 border border-neutral-800 text-white flex items-center justify-center mx-auto shadow-inner">
            <ClipboardList size={32} className="text-neutral-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Sin rutinas creadas</h2>
            <p className="text-xs text-neutral-400 max-w-sm mx-auto mt-1 leading-relaxed">
              Crea plantillas para tus sesiones habituales (por ejemplo: Empuje/Tirón/Pierna o Torso/Pierna)
              y organízalas cómodamente en carpetas.
            </p>
          </div>
          <div className="flex justify-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                setNewFolderName('')
                setIsNewFolderOpen(true)
              }}
              className="py-2 px-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
            >
              <FolderPlus size={15} />
              <span>Crear carpeta</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/routines/new')}
              className="py-2 px-4 bg-white hover:bg-neutral-200 text-black rounded-xl text-xs font-bold transition shadow-md flex items-center gap-1.5"
            >
              <Plus size={16} />
              <span>Crear primera rutina</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Listado de Carpetas */}
          {folders &&
            folders.map((folder, folderIdx) => {
              const folderRoutines = routinesByFolderId.get(folder.id) || []

              return (
                <div
                  key={folder.id}
                  className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-sm"
                >
                  {/* Encabezado de la Carpeta */}
                  <div className="p-3.5 bg-neutral-900/90 border-b border-neutral-800 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <FolderIcon size={18} className="text-white" />
                      <h2 className="font-bold text-white text-sm">{folder.name}</h2>
                      <span className="text-[10px] bg-neutral-800 text-neutral-400 px-2 py-0.5 rounded-full border border-neutral-700">
                        {folderRoutines.length}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={folderIdx === 0}
                        onClick={() => handleMoveFolder(folderIdx, 'up')}
                        className={`w-6 h-6 rounded flex items-center justify-center transition ${
                          folderIdx === 0
                            ? 'text-neutral-700 bg-neutral-950/40 cursor-not-allowed'
                            : 'text-neutral-300 bg-neutral-800 hover:bg-neutral-700 hover:text-white'
                        }`}
                        title="Subir carpeta"
                        aria-label="Subir carpeta"
                      >
                        <ChevronUp size={14} />
                      </button>
                      <button
                        type="button"
                        disabled={folderIdx === (folders.length - 1)}
                        onClick={() => handleMoveFolder(folderIdx, 'down')}
                        className={`w-6 h-6 rounded flex items-center justify-center transition ${
                          folderIdx === (folders.length - 1)
                            ? 'text-neutral-700 bg-neutral-950/40 cursor-not-allowed'
                            : 'text-neutral-300 bg-neutral-800 hover:bg-neutral-700 hover:text-white'
                        }`}
                        title="Bajar carpeta"
                        aria-label="Bajar carpeta"
                      >
                        <ChevronDown size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setFolderToRename(folder)
                          setRenameFolderName(folder.name)
                        }}
                        className="w-6 h-6 rounded text-neutral-400 hover:text-white hover:bg-neutral-800 flex items-center justify-center transition"
                        title="Renombrar carpeta"
                        aria-label="Renombrar carpeta"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setFolderToDelete(folder)}
                        className="w-6 h-6 rounded text-neutral-500 hover:text-red-400 hover:bg-neutral-800 flex items-center justify-center transition"
                        title="Eliminar carpeta"
                        aria-label="Eliminar carpeta"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Rutinas dentro de la Carpeta */}
                  <div className="p-3 space-y-2.5">
                    {folderRoutines.length > 0 ? (
                      folderRoutines.map((routine, rIdx) => (
                        <div
                          key={routine.id}
                          className="bg-neutral-950 border border-neutral-800 rounded-xl p-3.5 space-y-2.5 hover:border-neutral-700 transition"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h3 className="font-bold text-white text-sm">{routine.name}</h3>
                              <p className="text-xs text-neutral-400 mt-0.5">
                                {getExerciseSummary(routine)}
                              </p>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                disabled={rIdx === 0}
                                onClick={() => handleMoveRoutine(folderRoutines, rIdx, 'up')}
                                className={`w-6 h-6 rounded flex items-center justify-center transition ${
                                  rIdx === 0
                                    ? 'text-neutral-700 bg-neutral-900/40 cursor-not-allowed'
                                    : 'text-neutral-400 bg-neutral-900 hover:bg-neutral-800 hover:text-white'
                                }`}
                                title="Subir rutina"
                                aria-label="Subir rutina"
                              >
                                <ChevronUp size={14} />
                              </button>
                              <button
                                type="button"
                                disabled={rIdx === folderRoutines.length - 1}
                                onClick={() => handleMoveRoutine(folderRoutines, rIdx, 'down')}
                                className={`w-6 h-6 rounded flex items-center justify-center transition ${
                                  rIdx === folderRoutines.length - 1
                                    ? 'text-neutral-700 bg-neutral-900/40 cursor-not-allowed'
                                    : 'text-neutral-400 bg-neutral-900 hover:bg-neutral-800 hover:text-white'
                                }`}
                                title="Bajar rutina"
                                aria-label="Bajar rutina"
                              >
                                <ChevronDown size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => navigate(`/routines/${routine.id}/edit`)}
                                className="w-6 h-6 rounded text-neutral-400 hover:text-white hover:bg-neutral-800 flex items-center justify-center transition"
                                title="Editar rutina"
                                aria-label="Editar rutina"
                              >
                                <Pencil size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => setRoutineToDelete(routine)}
                                className="w-6 h-6 rounded text-neutral-500 hover:text-red-400 hover:bg-neutral-800 flex items-center justify-center transition"
                                title="Eliminar rutina"
                                aria-label="Eliminar rutina"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>

                          {/* Botón Empezar */}
                          <div className="flex items-center gap-2 pt-1 border-t border-neutral-900">
                            <button
                              type="button"
                              onClick={() => handleStartRoutine(routine)}
                              className="w-full py-2 px-3 bg-white hover:bg-neutral-200 text-black rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5"
                            >
                              <Play size={13} fill="currentColor" />
                              <span>Empezar entreno</span>
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="py-4 text-center text-xs text-neutral-500 space-y-2">
                        <p>No hay rutinas en esta carpeta.</p>
                        <button
                          type="button"
                          onClick={() => navigate(`/routines/new?folderId=${folder.id}`)}
                          className="text-xs text-white hover:underline font-medium"
                        >
                          + Añadir rutina a {folder.name}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}

          {/* Sección Sin Carpeta */}
          {unassignedRoutines.length > 0 && (
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-sm">
              <div className="p-3.5 bg-neutral-900/90 border-b border-neutral-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText size={18} className="text-white" />
                  <h2 className="font-bold text-white text-sm">Sin carpeta</h2>
                  <span className="text-[10px] bg-neutral-800 text-neutral-400 px-2 py-0.5 rounded-full border border-neutral-700">
                    {unassignedRoutines.length}
                  </span>
                </div>
              </div>

              <div className="p-3 space-y-2.5">
                {unassignedRoutines.map((routine, rIdx) => (
                  <div
                    key={routine.id}
                    className="bg-neutral-950 border border-neutral-800 rounded-xl p-3.5 space-y-2.5 hover:border-neutral-700 transition"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-white text-sm">{routine.name}</h3>
                        <p className="text-xs text-neutral-400 mt-0.5">
                          {getExerciseSummary(routine)}
                        </p>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          disabled={rIdx === 0}
                          onClick={() => handleMoveRoutine(unassignedRoutines, rIdx, 'up')}
                          className={`w-6 h-6 rounded flex items-center justify-center transition ${
                            rIdx === 0
                              ? 'text-neutral-700 bg-neutral-900/40 cursor-not-allowed'
                              : 'text-neutral-400 bg-neutral-900 hover:bg-neutral-800 hover:text-white'
                          }`}
                          title="Subir rutina"
                          aria-label="Subir rutina"
                        >
                          <ChevronUp size={14} />
                        </button>
                        <button
                          type="button"
                          disabled={rIdx === unassignedRoutines.length - 1}
                          onClick={() => handleMoveRoutine(unassignedRoutines, rIdx, 'down')}
                          className={`w-6 h-6 rounded flex items-center justify-center transition ${
                            rIdx === unassignedRoutines.length - 1
                              ? 'text-neutral-700 bg-neutral-900/40 cursor-not-allowed'
                              : 'text-neutral-400 bg-neutral-900 hover:bg-neutral-800 hover:text-white'
                          }`}
                          title="Bajar rutina"
                          aria-label="Bajar rutina"
                        >
                          <ChevronDown size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => navigate(`/routines/${routine.id}/edit`)}
                          className="w-6 h-6 rounded text-neutral-400 hover:text-white hover:bg-neutral-800 flex items-center justify-center transition"
                          title="Editar rutina"
                          aria-label="Editar rutina"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setRoutineToDelete(routine)}
                          className="w-6 h-6 rounded text-neutral-500 hover:text-red-400 hover:bg-neutral-800 flex items-center justify-center transition"
                          title="Eliminar rutina"
                          aria-label="Eliminar rutina"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Botón Empezar */}
                    <div className="flex items-center gap-2 pt-1 border-t border-neutral-900">
                      <button
                        type="button"
                        onClick={() => handleStartRoutine(routine)}
                        className="w-full py-2 px-3 bg-white hover:bg-neutral-200 text-black rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5"
                      >
                        <Play size={13} fill="currentColor" />
                        <span>Empezar entreno</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL: Nueva Carpeta */}
      {isNewFolderOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 max-w-xs w-full space-y-4 shadow-2xl">
            <div>
              <h3 className="font-bold text-white text-base">Nueva Carpeta</h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                Agrupa tus rutinas (ej. Empuje, Tirón, Pierna, Fuerza...).
              </p>
            </div>

            <input
              type="text"
              autoFocus
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Nombre de la carpeta..."
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-white"
            />

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsNewFolderOpen(false)}
                className="flex-1 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl text-xs font-medium transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!newFolderName.trim()}
                onClick={handleCreateFolder}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${
                  newFolderName.trim()
                    ? 'bg-white hover:bg-neutral-200 text-black shadow-md'
                    : 'bg-neutral-800 text-neutral-600 cursor-not-allowed'
                }`}
              >
                Crear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Renombrar Carpeta */}
      {folderToRename && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 max-w-xs w-full space-y-4 shadow-2xl">
            <div>
              <h3 className="font-bold text-white text-base">Renombrar Carpeta</h3>
              <p className="text-xs text-neutral-400 mt-0.5">Introduce el nuevo nombre para la carpeta.</p>
            </div>

            <input
              type="text"
              autoFocus
              value={renameFolderName}
              onChange={(e) => setRenameFolderName(e.target.value)}
              placeholder="Nombre de la carpeta..."
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-white"
            />

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setFolderToRename(null)}
                className="flex-1 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl text-xs font-medium transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!renameFolderName.trim()}
                onClick={handleRenameFolder}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${
                  renameFolderName.trim()
                    ? 'bg-white hover:bg-neutral-200 text-black shadow-md'
                    : 'bg-neutral-800 text-neutral-600 cursor-not-allowed'
                }`}
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Confirmar Eliminar Carpeta */}
      {folderToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 max-w-xs w-full space-y-4 text-center shadow-2xl">
            <FolderIcon size={32} className="text-white mx-auto" />
            <div>
              <h3 className="font-bold text-white text-base">¿Eliminar carpeta?</h3>
              <p className="text-xs text-neutral-400 mt-1">
                La carpeta <strong>&quot;{folderToDelete.name}&quot;</strong> será eliminada.
                Sus rutinas <strong>no se borrarán</strong>; pasarán a &quot;Sin carpeta&quot;.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setFolderToDelete(null)}
                className="flex-1 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl text-xs font-medium transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteFolder}
                className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition shadow-md"
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Confirmar Eliminar Rutina */}
      {routineToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 max-w-xs w-full space-y-4 text-center shadow-2xl">
            <Trash2 size={32} className="text-red-400 mx-auto" />
            <div>
              <h3 className="font-bold text-white text-base">¿Eliminar rutina?</h3>
              <p className="text-xs text-neutral-400 mt-1">
                ¿Seguro que deseas eliminar <strong>&quot;{routineToDelete.name}&quot;</strong>?
                Esta acción no se puede deshacer.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setRoutineToDelete(null)}
                className="flex-1 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl text-xs font-medium transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteRoutine}
                className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition shadow-md"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Confirmar Reemplazo de Entreno Activo */}
      {pendingRoutineToStart && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 max-w-xs w-full space-y-4 text-center shadow-2xl">
            <AlertTriangle size={32} className="text-white mx-auto" />
            <div>
              <h3 className="font-bold text-white text-base">Entrenamiento en curso</h3>
              <p className="text-xs text-neutral-400 mt-1">
                Ya tienes una sesión activa ({activeWorkout?.name}). Si inicias{' '}
                <strong>&quot;{pendingRoutineToStart.name}&quot;</strong>, se descartará el progreso
                actual no guardado.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPendingRoutineToStart(null)}
                className="flex-1 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl text-xs font-medium transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmStartWithActiveWorkout}
                className="flex-1 py-2 bg-white hover:bg-neutral-200 text-black rounded-xl text-xs font-bold transition shadow-md"
              >
                Reemplazar y empezar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
