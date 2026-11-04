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
      <div className="bg-surface border border-line rounded-md p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-1.5 text-white font-semibold text-sm">
              <FileText size={16} className="text-neutral-400" />
              <span>Notas personales</span>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">
              Técnica, sensaciones, ajuste de máquinas, postura o recordatorios.
            </p>
          </div>

          {updatedAt && (
            <span className="label-tech text-neutral-400 whitespace-nowrap shrink-0">
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
          rows={5}
          placeholder="Escribe aquí tu nota personal para este ejercicio..."
          className="field h-auto py-3 leading-relaxed resize-none text-[15px]"
        />

        <div className="flex items-center justify-between pt-2">
          <div className="text-xs text-neutral-400">
            {saveSuccess ? (
              <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                <Check size={14} strokeWidth={2.5} />
                Nota guardada
              </span>
            ) : initialText ? (
              <span>Nota guardada</span>
            ) : (
              <span className="text-neutral-400">Sin nota</span>
            )}
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="btn-primary min-h-12 px-5 text-sm"
          >
            <Check size={16} strokeWidth={2} />
            <span>{isSaving ? 'Guardando...' : 'Guardar nota'}</span>
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
