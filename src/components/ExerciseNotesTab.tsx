import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Check, FileText } from 'lucide-react'
import { db } from '../db'
import { saveExerciseNote } from '../utils/exerciseNotes'

interface ExerciseNotesTabProps {
  exerciseId: string
}

interface ExerciseNotesFormProps {
  exerciseId: string
  initialText: string
  updatedAt?: number
}

function ExerciseNotesForm({ exerciseId, initialText, updatedAt }: ExerciseNotesFormProps) {
  const [text, setText] = useState(initialText)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await saveExerciseNote(exerciseId, text)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 2500)
    } catch (err) {
      console.error('Error al guardar nota:', err)
      alert('Error al guardar la nota.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-3.5 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-1.5 text-white font-semibold text-xs">
              <FileText size={14} className="text-neutral-400" />
              <span>Notas personales</span>
            </div>
            <p className="text-[11px] text-neutral-400 mt-0.5">
              Técnica, sensaciones, ajuste de máquinas, postura o recordatorios para este ejercicio.
            </p>
          </div>

          {updatedAt && (
            <span className="text-[10px] text-neutral-500 whitespace-nowrap shrink-0">
              {format(new Date(updatedAt), "d MMM, HH:mm", { locale: es })}
            </span>
          )}
        </div>

        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            if (saveSuccess) setSaveSuccess(false)
          }}
          rows={6}
          placeholder="Escribe aquí tu nota personal para este ejercicio (ej. Banco en posición 3, enfocar retracción escapular, agarre a la anchura de hombros)..."
          className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-3 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white transition resize-none leading-relaxed"
        />

        <div className="flex items-center justify-between pt-1">
          <div className="text-[11px] text-neutral-400">
            {saveSuccess ? (
              <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                <Check size={13} strokeWidth={2.5} />
                Nota guardada localmente
              </span>
            ) : initialText ? (
              <span>Nota guardada</span>
            ) : (
              <span className="text-neutral-500">Sin nota registrada</span>
            )}
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 bg-white hover:bg-neutral-200 text-black text-xs font-bold rounded-xl transition shadow-sm flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
          >
            <Check size={14} strokeWidth={2.5} />
            <span>{isSaving ? 'Guardando...' : 'Guardar'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export function ExerciseNotesTab({ exerciseId }: ExerciseNotesTabProps) {
  // Suscripción reactiva a la nota del ejercicio en Dexie
  const noteRecord = useLiveQuery(() => db.exerciseNotes.get(exerciseId), [exerciseId])

  return (
    <ExerciseNotesForm
      key={`${exerciseId}-${noteRecord?.updatedAt ?? 'empty'}`}
      exerciseId={exerciseId}
      initialText={noteRecord?.text ?? ''}
      updatedAt={noteRecord?.updatedAt}
    />
  )
}
