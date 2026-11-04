import { useState, useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import {
  Pencil,
  Trash2,
  X,
  TrendingUp,
} from 'lucide-react'
import { db } from '../db'
import type { Measurement } from '../types'
import {
  MEASUREMENT_TYPE_KEYS,
  getMeasurementConfig,
  getTimeSeriesData,
  formatDelta,
} from '../utils/measurements'
import { formatNumber, parseDecimal } from '../utils/format'
import { ScreenHeader } from '../components/ui/ScreenHeader'
import { SegTabs } from '../components/ui/SegTabs'

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `meas-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

export function MeasurementsPage() {
  const settings = useLiveQuery(async () => {
    const s = await db.settings.get('app')
    return s && 'units' in s ? s : undefined
  }, [])

  const measurements = useLiveQuery(
    () => db.measurements.orderBy('date').reverse().toArray(),
    []
  )

  const weightUnit = settings?.units ?? 'kg'

  // Pestaña de medida para la gráfica: peso, grasa, perimetros
  const [activeTab, setActiveTab] = useState<'peso' | 'bodyfat' | 'perimetros'>('peso')
  const [perimeterType, setPerimeterType] = useState<string>('waist')

  const chartType = useMemo(() => {
    if (activeTab === 'peso') return 'bodyweight'
    if (activeTab === 'bodyfat') return 'bodyfat'
    return perimeterType
  }, [activeTab, perimeterType])

  // Formulario de registro rápido en cuadrícula
  const [gridInputs, setGridInputs] = useState<Record<string, string>>({
    bodyweight: '',
    bodyfat: '',
    waist: '',
    chest: '',
    arm: '',
    thigh: '',
  })
  const [recordDate, setRecordDate] = useState<string>(() => format(new Date(), 'yyyy-MM-dd'))
  const [customType, setCustomType] = useState<string>('hip')
  const [customValue, setCustomValue] = useState<string>('')
  const [formFeedback, setFormFeedback] = useState<string>('')

  // Estado del filtro de historial
  const [historyFilter, setHistoryFilter] = useState<string>('all')

  // Estado de edición de registro
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState<string>('')
  const [editUnit, setEditUnit] = useState<string>('')
  const [editDate, setEditDate] = useState<string>('')

  // Estado para confirmación de eliminación
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Datos para la gráfica de evolución del tipo seleccionado
  const chartData = useMemo(
    () => getTimeSeriesData(measurements || [], chartType),
    [measurements, chartType]
  )

  const activeChartConfig = useMemo(
    () => getMeasurementConfig(chartType, weightUnit),
    [chartType, weightUnit]
  )

  // Último valor registrado del tipo activo
  const latestMeasurement = useMemo(() => {
    if (!measurements) return null
    return measurements.find((m) => m.type === chartType) || null
  }, [measurements, chartType])

  // Delta respecto a la medida anterior del tipo activo
  const currentDelta = useMemo(() => {
    if (!measurements) return null
    const ofType = measurements.filter((m) => m.type === chartType)
    if (ofType.length < 2) return null
    const diff = ofType[0].value - ofType[1].value
    return Math.round(diff * 10) / 10
  }, [measurements, chartType])

  // Guardar medidas de la cuadrícula
  const handleSaveGrid = async (e: React.FormEvent) => {
    e.preventDefault()
    let timestamp = Date.now()
    if (recordDate) {
      const todayStr = format(new Date(), 'yyyy-MM-dd')
      if (recordDate !== todayStr) {
        timestamp = new Date(`${recordDate}T12:00:00`).getTime()
      }
    }

    const toInsert: Measurement[] = []

    for (const [t, valStr] of Object.entries(gridInputs)) {
      if (!valStr.trim()) continue
      const parsed = parseDecimal(valStr)
      if (parsed !== undefined && parsed > 0 && parsed <= 1000) {
        const cfg = getMeasurementConfig(t, weightUnit)
        toInsert.push({
          id: generateId(),
          type: t,
          value: Math.round(parsed * 10) / 10,
          unit: cfg.defaultUnit,
          date: timestamp,
        })
      }
    }

    // Si además llenó la medida personalizada adicional
    if (customValue.trim()) {
      const parsedCustom = parseDecimal(customValue)
      if (parsedCustom !== undefined && parsedCustom > 0 && parsedCustom <= 1000) {
        const cfg = getMeasurementConfig(customType, weightUnit)
        toInsert.push({
          id: generateId(),
          type: customType,
          value: Math.round(parsedCustom * 10) / 10,
          unit: cfg.defaultUnit,
          date: timestamp,
        })
      }
    }

    if (toInsert.length === 0) {
      setFormFeedback('Introduce al menos un valor numérico para guardar.')
      return
    }

    try {
      await db.measurements.bulkAdd(toInsert)
      setGridInputs({
        bodyweight: '',
        bodyfat: '',
        waist: '',
        chest: '',
        arm: '',
        thigh: '',
      })
      setCustomValue('')
      setFormFeedback(`¡${toInsert.length} ${toInsert.length === 1 ? 'medida guardada' : 'medidas guardadas'} con éxito!`)
      setTimeout(() => setFormFeedback(''), 3000)
    } catch (err) {
      console.error('Error al guardar medidas:', err)
      setFormFeedback('Error al guardar en la base de datos local.')
    }
  }

  // Manejo de edición
  const handleStartEdit = (m: Measurement) => {
    setEditingId(m.id)
    setEditValue(String(m.value).replace('.', ','))
    setEditUnit(m.unit)
    setEditDate(format(new Date(m.date), 'yyyy-MM-dd'))
    setDeletingId(null)
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditValue('')
    setEditUnit('')
    setEditDate('')
  }

  const handleSaveEdit = async (id: string, originalDate: number) => {
    const val = parseDecimal(editValue)
    if (val === undefined || val <= 0 || val > 1000) {
      return
    }

    const timestamp = editDate ? new Date(`${editDate}T12:00:00`).getTime() : originalDate

    try {
      await db.measurements.update(id, {
        value: Math.round(val * 10) / 10,
        unit: editUnit.trim(),
        date: timestamp,
      })
      setEditingId(null)
    } catch (err) {
      console.error('Error actualizando medida:', err)
    }
  }

  const handleDeleteConfirm = async (id: string) => {
    try {
      await db.measurements.delete(id)
      setDeletingId(null)
    } catch (err) {
      console.error('Error eliminando medida:', err)
    }
  }

  // Historial filtrado
  const filteredHistory = useMemo(() => {
    if (!measurements) return []
    if (historyFilter === 'all') return measurements
    return measurements.filter((m) => m.type === historyFilter)
  }, [measurements, historyFilter])

  return (
    <div className="min-h-full flex flex-col bg-black">
      <ScreenHeader
        title="Medidas"
        back="/stats"
      />

      <div className="flex-1 p-4 space-y-6">
        {/* 1. Gráfica de evolución */}
        <div className="bg-surface border border-line rounded-lg p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="label-tech block text-neutral-400">
                {activeChartConfig.label}
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-3xl font-bold text-white num">
                  {latestMeasurement ? formatNumber(latestMeasurement.value, 1, 1) : '—'}
                </span>
                <span className="text-xs text-neutral-400 font-semibold uppercase">
                  {latestMeasurement ? latestMeasurement.unit : activeChartConfig.defaultUnit}
                </span>
              </div>
            </div>

            {currentDelta !== null && latestMeasurement && (
              <div className="text-xs font-semibold text-neutral-300 border border-line rounded-sm px-2 py-1 num">
                {(() => {
                  const d = formatDelta(currentDelta, latestMeasurement.unit)
                  return `${d.icon} ${d.text}`
                })()}
              </div>
            )}
          </div>

          {/* Gráfica Recharts en escala neutra (sin acento en datos) */}
          <div className="w-full h-44 pt-1">
            {chartData.length === 0 ? (
              <div className="w-full h-full flex flex-col items-center justify-center text-center p-4 bg-black/40 rounded-lg border border-line">
                <TrendingUp size={24} className="text-neutral-400 mb-1" strokeWidth={1.75} />
                <p className="text-xs text-neutral-400">
                  Sin registros de {activeChartConfig.label} todavía.
                </p>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Registra un valor abajo para visualizar la curva de progreso.
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--line))" vertical={false} />
                  <XAxis
                    dataKey="formattedDate"
                    stroke="rgb(var(--n-400))"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: 'rgb(var(--line))' }}
                  />
                  <YAxis
                    domain={[(dataMin: number) => Math.max(0, Math.floor(dataMin - 1)), (dataMax: number) => Math.ceil(dataMax + 1)]}
                    stroke="rgb(var(--n-400))"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: 'rgb(var(--line))' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgb(var(--surface))',
                      borderColor: 'rgb(var(--line-strong))',
                      borderRadius: '6px',
                      color: 'rgb(var(--fg))',
                      fontSize: '12px',
                      boxShadow: 'none',
                    }}
                    labelStyle={{ color: 'rgb(var(--n-300))', fontWeight: 'bold' }}
                    formatter={(val: unknown) => [
                      `${formatNumber(Number(val ?? 0), 1, 1)} ${chartData[0]?.unit || activeChartConfig.defaultUnit}`,
                      activeChartConfig.label,
                    ]}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="rgb(var(--n-200))"
                    strokeWidth={2.5}
                    dot={{ fill: 'rgb(var(--surface))', stroke: 'rgb(var(--n-200))', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* 2. SegTabs para alternar la métrica de la gráfica */}
        <div className="space-y-2">
          <SegTabs
            value={activeTab}
            options={[
              { value: 'peso', label: 'Peso' },
              { value: 'bodyfat', label: '% Grasa' },
              { value: 'perimetros', label: 'Perímetros' },
            ]}
            onChange={(val) => setActiveTab(val)}
            label="Tipo de medida"
          />

          {activeTab === 'perimetros' && (
            <div className="flex items-center gap-2 pt-1">
              <span className="text-xs text-neutral-400">Perímetro:</span>
              <select
                value={perimeterType}
                onChange={(e) => setPerimeterType(e.target.value)}
                className="field text-xs h-10 py-1"
              >
                <option value="waist">Cintura</option>
                <option value="chest">Pecho</option>
                <option value="arm">Brazo</option>
                <option value="thigh">Muslo</option>
                <option value="hip">Cadera</option>
                <option value="calf">Pantorrilla</option>
                <option value="shoulders">Hombros</option>
                <option value="neck">Cuello</option>
              </select>
            </div>
          )}
        </div>

        {/* 3. Registro manual en cuadrícula (measure-grid) */}
        <div className="bg-surface border border-line rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-white tracking-tight">
              Registro manual
            </h2>
            <input
              type="date"
              value={recordDate}
              onChange={(e) => setRecordDate(e.target.value)}
              className="bg-elevated border border-line-strong rounded-sm px-2 py-1 text-xs text-white"
            />
          </div>

          <form onSubmit={handleSaveGrid} className="space-y-4">
            <div className="grid grid-cols-2 gap-px bg-line border border-line rounded-sm overflow-hidden">
              {/* Peso */}
              <div className="bg-surface p-3">
                <label htmlFor="grid-weight" className="label-tech block text-neutral-400 mb-1">
                  Peso
                </label>
                <div className="flex items-baseline gap-1">
                  <input
                    id="grid-weight"
                    type="text"
                    inputMode="decimal"
                    placeholder="78,4"
                    value={gridInputs.bodyweight}
                    onChange={(e) => setGridInputs((prev) => ({ ...prev, bodyweight: e.target.value }))}
                    className="field text-xl font-bold num"
                  />
                  <span className="text-xs font-semibold text-neutral-400 uppercase">{weightUnit}</span>
                </div>
              </div>

              {/* % Grasa */}
              <div className="bg-surface p-3">
                <label htmlFor="grid-fat" className="label-tech block text-neutral-400 mb-1">
                  % Grasa
                </label>
                <div className="flex items-baseline gap-1">
                  <input
                    id="grid-fat"
                    type="text"
                    inputMode="decimal"
                    placeholder="14,2"
                    value={gridInputs.bodyfat}
                    onChange={(e) => setGridInputs((prev) => ({ ...prev, bodyfat: e.target.value }))}
                    className="field text-xl font-bold num"
                  />
                  <span className="text-xs font-semibold text-neutral-400">%</span>
                </div>
              </div>

              {/* Cintura */}
              <div className="bg-surface p-3">
                <label htmlFor="grid-waist" className="label-tech block text-neutral-400 mb-1">
                  Cintura
                </label>
                <div className="flex items-baseline gap-1">
                  <input
                    id="grid-waist"
                    type="text"
                    inputMode="decimal"
                    placeholder="81,0"
                    value={gridInputs.waist}
                    onChange={(e) => setGridInputs((prev) => ({ ...prev, waist: e.target.value }))}
                    className="field text-xl font-bold num"
                  />
                  <span className="text-xs font-semibold text-neutral-400">cm</span>
                </div>
              </div>

              {/* Pecho */}
              <div className="bg-surface p-3">
                <label htmlFor="grid-chest" className="label-tech block text-neutral-400 mb-1">
                  Pecho
                </label>
                <div className="flex items-baseline gap-1">
                  <input
                    id="grid-chest"
                    type="text"
                    inputMode="decimal"
                    placeholder="104,5"
                    value={gridInputs.chest}
                    onChange={(e) => setGridInputs((prev) => ({ ...prev, chest: e.target.value }))}
                    className="field text-xl font-bold num"
                  />
                  <span className="text-xs font-semibold text-neutral-400">cm</span>
                </div>
              </div>

              {/* Brazo */}
              <div className="bg-surface p-3">
                <label htmlFor="grid-arm" className="label-tech block text-neutral-400 mb-1">
                  Brazo
                </label>
                <div className="flex items-baseline gap-1">
                  <input
                    id="grid-arm"
                    type="text"
                    inputMode="decimal"
                    placeholder="38,2"
                    value={gridInputs.arm}
                    onChange={(e) => setGridInputs((prev) => ({ ...prev, arm: e.target.value }))}
                    className="field text-xl font-bold num"
                  />
                  <span className="text-xs font-semibold text-neutral-400">cm</span>
                </div>
              </div>

              {/* Muslo */}
              <div className="bg-surface p-3">
                <label htmlFor="grid-thigh" className="label-tech block text-neutral-400 mb-1">
                  Muslo
                </label>
                <div className="flex items-baseline gap-1">
                  <input
                    id="grid-thigh"
                    type="text"
                    inputMode="decimal"
                    placeholder="60,0"
                    value={gridInputs.thigh}
                    onChange={(e) => setGridInputs((prev) => ({ ...prev, thigh: e.target.value }))}
                    className="field text-xl font-bold num"
                  />
                  <span className="text-xs font-semibold text-neutral-400">cm</span>
                </div>
              </div>
            </div>

            {/* Medida personalizada adicional */}
            <div className="flex items-center gap-2 pt-1">
              <select
                value={customType}
                onChange={(e) => setCustomType(e.target.value)}
                className="field text-xs h-12 flex-1"
              >
                <option value="hip">Cadera</option>
                <option value="calf">Pantorrilla</option>
                <option value="shoulders">Hombros</option>
                <option value="neck">Cuello</option>
              </select>
              <div className="flex-1 flex items-baseline gap-1">
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="Valor opcional"
                  value={customValue}
                  onChange={(e) => setCustomValue(e.target.value)}
                  className="field num h-12"
                />
                <span className="text-xs text-neutral-400">cm</span>
              </div>
            </div>

            {formFeedback && (
              <p className="text-xs text-neutral-300 font-medium">{formFeedback}</p>
            )}

            <button
              type="submit"
              className="btn-primary w-full"
            >
              Guardar medidas
            </button>
          </form>
        </div>

        {/* 4. Historial */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-white tracking-tight">
              Historial
            </h2>

            {/* Filtro */}
            <select
              value={historyFilter}
              onChange={(e) => setHistoryFilter(e.target.value)}
              className="bg-elevated border border-line-strong rounded-sm px-2 py-1 text-xs text-white"
            >
              <option value="all">Todas ({measurements?.length || 0})</option>
              {MEASUREMENT_TYPE_KEYS.map((k) => {
                const count = measurements?.filter((m) => m.type === k).length || 0
                if (count === 0) return null
                const cfg = getMeasurementConfig(k, weightUnit)
                return (
                  <option key={k} value={k}>
                    {cfg.label} ({count})
                  </option>
                )
              })}
            </select>
          </div>

          {filteredHistory.length === 0 ? (
            <div className="bg-surface border border-line rounded-lg p-6 text-center text-xs text-neutral-400">
              No hay registros para mostrar.
            </div>
          ) : (
            <ul className="border-t border-b border-line divide-y divide-line list-none">
              {filteredHistory.map((m) => {
                const cfg = getMeasurementConfig(m.type, weightUnit)
                const isEditing = editingId === m.id
                const isDeleting = deletingId === m.id

                if (isEditing) {
                  return (
                    <li key={m.id} className="py-3 space-y-3 bg-surface p-3 rounded-lg border border-line my-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">
                          Editar {cfg.label}
                        </span>
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          className="text-xs text-neutral-400 hover:text-white flex items-center gap-1"
                        >
                          <X size={14} />
                          <span>Cancelar</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="label-tech block mb-1">Valor</label>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="field num"
                          />
                        </div>
                        <div>
                          <label className="label-tech block mb-1">Unidad</label>
                          <input
                            type="text"
                            value={editUnit}
                            onChange={(e) => setEditUnit(e.target.value)}
                            className="field"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="label-tech block mb-1">Fecha</label>
                        <input
                          type="date"
                          value={editDate}
                          onChange={(e) => setEditDate(e.target.value)}
                          className="field"
                        />
                      </div>

                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          className="btn-secondary text-xs min-h-10 py-1"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(m.id, m.date)}
                          className="btn-primary text-xs min-h-10 py-1"
                        >
                          Guardar
                        </button>
                      </div>
                    </li>
                  )
                }

                return (
                  <li
                    key={m.id}
                    className="flex items-center justify-between py-2 min-h-12 text-sm"
                  >
                    <div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-white font-bold num text-[15px]">
                          {formatNumber(m.value, 1, 1)} {m.unit}
                        </span>
                        <span className="text-xs text-neutral-400 font-medium">
                          · {cfg.label}
                        </span>
                      </div>
                      <span className="text-xs text-neutral-400 block capitalize">
                        {format(new Date(m.date), "d MMM yyyy", { locale: es })}
                      </span>
                    </div>

                    {isDeleting ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleDeleteConfirm(m.id)}
                          className="px-2.5 py-1 bg-red-600 text-white rounded-sm text-xs font-bold"
                        >
                          Confirmar
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingId(null)}
                          className="px-2 py-1 text-neutral-400 hover:text-white text-xs"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(m)}
                          className="press min-w-10 min-h-10 flex items-center justify-center text-neutral-400 hover:text-white"
                          aria-label="Editar registro"
                        >
                          <Pencil size={16} strokeWidth={1.75} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingId(m.id)}
                          className="press min-w-10 min-h-10 flex items-center justify-center text-neutral-400 hover:text-red-400"
                          aria-label="Eliminar registro"
                        >
                          <Trash2 size={16} strokeWidth={1.75} />
                        </button>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

export default MeasurementsPage
