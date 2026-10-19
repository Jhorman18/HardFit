import { useState, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
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
  BarChart3,
  Plus,
  Pencil,
  Trash2,
  X,
  ChevronRight,
  TrendingUp,
  Ruler,
  Scale,
} from 'lucide-react'
import { db } from '../db'
import type { Measurement } from '../types'
import {
  MEASUREMENT_TYPE_KEYS,
  getMeasurementConfig,
  getDefaultUnitForType,
  getMeasurementsSummary,
  getTimeSeriesData,
  formatDelta,
} from '../utils/measurements'

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `meas-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

const TYPE_COLORS: Record<string, string> = {
  bodyweight: '#ffffff',
  bodyfat: '#ffffff',
  chest: '#ffffff',
  waist: '#ffffff',
  hip: '#ffffff',
  arm: '#ffffff',
  thigh: '#ffffff',
  calf: '#ffffff',
  shoulders: '#ffffff',
  neck: '#ffffff',
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

  // Estado del formulario de registro rápido
  const [selectedType, setSelectedType] = useState<string>('bodyweight')
  const [valueInput, setValueInput] = useState<string>('')
  const [unitInput, setUnitInput] = useState<string>(weightUnit)
  const [dateInput, setDateInput] = useState<string>(() =>
    format(new Date(), 'yyyy-MM-dd')
  )
  const [formError, setFormError] = useState<string>('')
  const [successToast, setSuccessToast] = useState<string>('')

  // Estado del selector de tipo para la gráfica de evolución
  const [chartType, setChartType] = useState<string>('bodyweight')
  const evolutionChartRef = useRef<HTMLDivElement>(null)

  const handleViewBodyweightEvolution = () => {
    setChartType('bodyweight')
    evolutionChartRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // Estado del filtro de historial
  const [historyFilter, setHistoryFilter] = useState<string>('all')

  // Estado de edición de registro
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState<string>('')
  const [editUnit, setEditUnit] = useState<string>('')
  const [editDate, setEditDate] = useState<string>('')

  // Estado para confirmación de eliminación
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Configuración actual del tipo seleccionado en el formulario
  const activeConfig = useMemo(
    () => getMeasurementConfig(selectedType, weightUnit),
    [selectedType, weightUnit]
  )

  // Cuando cambia el tipo seleccionado en el formulario, actualizamos la unidad sugerida
  const handleTypeChange = (newType: string) => {
    setSelectedType(newType)
    setUnitInput(getDefaultUnitForType(newType, weightUnit))
    setFormError('')
  }

  // Manejo de guardado de nueva medida
  const handleAddMeasurement = async (e: React.FormEvent) => {
    e.preventDefault()
    const val = parseFloat(valueInput.replace(',', '.'))
    if (isNaN(val) || val <= 0 || val > 1000) {
      setFormError(`Por favor introduce un valor válido (ej. ${activeConfig.placeholder})`)
      return
    }

    let timestamp = Date.now()
    if (dateInput) {
      const todayStr = format(new Date(), 'yyyy-MM-dd')
      if (dateInput === todayStr) {
        timestamp = Date.now()
      } else {
        timestamp = new Date(`${dateInput}T12:00:00`).getTime()
      }
    }

    try {
      const record: Measurement = {
        id: generateId(),
        type: selectedType,
        value: Math.round(val * 10) / 10,
        unit: unitInput.trim() || activeConfig.defaultUnit,
        date: timestamp,
      }
      await db.measurements.add(record)

      setValueInput('')
      setFormError('')
      setSuccessToast(`¡${activeConfig.label} registrada con éxito!`)
      setTimeout(() => setSuccessToast(''), 3000)

      // Si el gráfico está en otro tipo, mantener o actualizar si el usuario no tenía
      if (!measurements || measurements.length === 0) {
        setChartType(selectedType)
      }
    } catch (err) {
      console.error('Error guardando medida:', err)
      setFormError('Error al guardar en la base de datos local')
    }
  }

  // Manejo de edición
  const handleStartEdit = (m: Measurement) => {
    setEditingId(m.id)
    setEditValue(String(m.value))
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
    const val = parseFloat(editValue.replace(',', '.'))
    if (isNaN(val) || val <= 0 || val > 1000) {
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

  // Manejo de eliminación con confirmación
  const handleDeleteConfirm = async (id: string) => {
    try {
      await db.measurements.delete(id)
      setDeletingId(null)
    } catch (err) {
      console.error('Error eliminando medida:', err)
    }
  }

  // Resumen calculado por tipo
  const summaryList = useMemo(
    () => getMeasurementsSummary(measurements || [], weightUnit),
    [measurements, weightUnit]
  )

  // Separar tarjeta destacada de Peso Corporal y las demás
  const bodyweightSummary = useMemo(
    () => summaryList.find((s) => s.isBodyweight),
    [summaryList]
  )
  const otherSummaries = useMemo(
    () => summaryList.filter((s) => !s.isBodyweight),
    [summaryList]
  )

  // Datos para la gráfica de evolución del tipo seleccionado
  const chartData = useMemo(
    () => getTimeSeriesData(measurements || [], chartType),
    [measurements, chartType]
  )

  const activeChartConfig = useMemo(
    () => getMeasurementConfig(chartType, weightUnit),
    [chartType, weightUnit]
  )

  const chartStroke = TYPE_COLORS[chartType] || '#ffffff'

  // Historial filtrado
  const filteredHistory = useMemo(() => {
    if (!measurements) return []
    if (historyFilter === 'all') return measurements
    return measurements.filter((m) => m.type === historyFilter)
  }, [measurements, historyFilter])

  return (
    <div className="p-4 space-y-6">
      {/* Cabecera */}
      <div className="border-b border-neutral-800 pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Medidas</h1>
          <p className="text-xs text-neutral-400 mt-1">
            Seguimiento de peso corporal, porcentaje graso y perímetros corporales.
          </p>
        </div>
        <Link
          to="/stats"
          className="text-xs font-semibold bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-800 px-3 py-1.5 rounded-xl transition flex items-center gap-1.5"
        >
          <BarChart3 size={16} />
          <span>Estadísticas</span>
        </Link>
      </div>

      {/* 1) FORMULARIO DE REGISTRO RÁPIDO */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <activeConfig.icon size={20} className="text-white" />
            <div>
              <h2 className="text-sm font-bold text-white">Añadir Medida</h2>
              <p className="text-xs text-neutral-400">Registra un nuevo dato corporal</p>
            </div>
          </div>
          {successToast && (
            <span className="text-xs text-white bg-neutral-800 border border-neutral-700 px-2.5 py-1 rounded-lg animate-pulse font-medium">
              {successToast}
            </span>
          )}
        </div>

        <form onSubmit={handleAddMeasurement} className="space-y-3">
          {/* Fila 1: Selector de tipo y fecha */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {/* Selector de Tipo */}
            <div>
              <label className="block text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1">
                Tipo de medida
              </label>
              <select
                value={selectedType}
                onChange={(e) => handleTypeChange(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-white transition cursor-pointer"
              >
                {MEASUREMENT_TYPE_KEYS.map((k) => {
                  const cfg = getMeasurementConfig(k, weightUnit)
                  return (
                    <option key={k} value={k}>
                      {cfg.label}
                    </option>
                  )
                })}
              </select>
            </div>

            {/* Selector de Fecha */}
            <div>
              <label className="block text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1">
                Fecha
              </label>
              <input
                type="date"
                value={dateInput}
                onChange={(e) => setDateInput(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-white transition"
              />
            </div>
          </div>

          {/* Fila 2: Valor, Unidad y Botón */}
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 items-end">
            {/* Valor */}
            <div className="col-span-2">
              <label className="block text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1">
                Valor ({activeConfig.label})
              </label>
              <input
                type="number"
                step={activeConfig.step}
                min={activeConfig.min}
                max={activeConfig.max}
                value={valueInput}
                onChange={(e) => {
                  setValueInput(e.target.value)
                  setFormError('')
                }}
                placeholder={activeConfig.placeholder}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-white transition font-mono"
              />
            </div>

            {/* Unidad */}
            <div>
              <label className="block text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1">
                Unidad
              </label>
              {selectedType === 'bodyweight' ? (
                <select
                  value={unitInput}
                  onChange={(e) => setUnitInput(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-white transition cursor-pointer"
                >
                  <option value="kg">kg</option>
                  <option value="lb">lb</option>
                </select>
              ) : selectedType === 'bodyfat' ? (
                <div className="w-full bg-neutral-950/60 border border-neutral-800 rounded-xl px-2.5 py-2 text-xs text-neutral-400 text-center font-mono">
                  %
                </div>
              ) : (
                <select
                  value={unitInput}
                  onChange={(e) => setUnitInput(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-white transition cursor-pointer"
                >
                  <option value="cm">cm</option>
                  <option value="in">in</option>
                </select>
              )}
            </div>

            {/* Botón Guardar */}
            <div className="col-span-3 sm:col-span-1">
              <button
                type="submit"
                className="w-full py-2.5 px-3 bg-white hover:bg-neutral-200 text-black rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
              >
                <Plus size={16} />
                <span>Registrar</span>
              </button>
            </div>
          </div>

          {formError && <p className="text-xs text-red-400 font-medium">{formError}</p>}
        </form>
      </div>

      {/* 2) RESUMEN POR TIPO (CON DESTACADO DE PESO CORPORAL Y DELTA) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-400">
            Resumen de Medidas
          </h2>
          <span className="text-[11px] text-neutral-500">
            {summaryList.length} {summaryList.length === 1 ? 'métrica' : 'métricas'} activas
          </span>
        </div>

        {summaryList.length === 0 ? (
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 text-center space-y-2">
            <Ruler size={32} className="text-neutral-500 mx-auto" />
            <p className="text-xs text-neutral-400">
              Aún no has registrado ninguna medida corporal.
            </p>
            <p className="text-[11px] text-neutral-500">
              Añade tu peso corporal arriba para vincularlo automáticamente con tus cálculos de
              volumen.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* TARJETA DESTACADA: PESO CORPORAL */}
            {bodyweightSummary && (
              <div
                onClick={() => setChartType('bodyweight')}
                className={`bg-neutral-900 border rounded-2xl p-4 shadow-sm cursor-pointer transition hover:border-neutral-600 ${
                  chartType === 'bodyweight'
                    ? 'border-white ring-1 ring-white/30'
                    : 'border-neutral-800'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-neutral-950 border border-neutral-800 rounded-xl">
                      <Scale size={24} className="text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white tracking-tight">
                          Peso Corporal
                        </span>
                        <span className="text-[10px] uppercase font-bold text-neutral-300 bg-neutral-800 border border-neutral-700 px-2 py-0.5 rounded-full">
                          Principal
                        </span>
                      </div>
                      <span className="text-xs text-neutral-400 block mt-0.5">
                        {format(new Date(bodyweightSummary.latestDate), "d 'de' MMMM, yyyy", {
                          locale: es,
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Delta badge */}
                  {(() => {
                    const d = formatDelta(bodyweightSummary.delta, bodyweightSummary.latestUnit)
                    return (
                      <div className={`px-2.5 py-1 rounded-xl text-xs font-bold border flex items-center gap-1 ${d.bgClass} ${d.colorClass}`}>
                        <span>{d.icon}</span>
                        <span>{d.text}</span>
                      </div>
                    )
                  })()}
                </div>

                <div className="mt-3 pt-3 border-t border-neutral-800 flex items-baseline justify-between">
                  <div>
                    <span className="text-3xl font-extrabold text-white tracking-tight">
                      {bodyweightSummary.latestValue}
                    </span>
                    <span className="text-sm text-neutral-400 font-semibold ml-1.5 uppercase font-mono">
                      {bodyweightSummary.latestUnit}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleViewBodyweightEvolution()
                    }}
                    className="text-[11px] text-neutral-400 hover:text-white flex items-center gap-1 transition cursor-pointer p-1 rounded-lg hover:bg-neutral-800"
                    title="Ver gráfica de evolución del peso corporal"
                  >
                    <span>Ver evolución</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* TARJETAS SECUNDARIAS (GRILLA) */}
            {otherSummaries.length > 0 && (
              <div className="grid grid-cols-2 gap-2.5">
                {otherSummaries.map((item) => {
                  const d = formatDelta(item.delta, item.latestUnit)
                  const isSelected = chartType === item.type
                  const ItemIcon = item.icon

                  return (
                    <div
                      key={item.type}
                      onClick={() => setChartType(item.type)}
                      className={`bg-neutral-900 border rounded-2xl p-3.5 space-y-2 cursor-pointer transition hover:border-neutral-600 ${
                        isSelected
                          ? 'border-white ring-1 ring-white/30'
                          : 'border-neutral-800'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <ItemIcon size={16} className="text-white" />
                          <span className="text-xs font-bold text-white truncate">
                            {item.label}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-baseline justify-between">
                        <div>
                          <span className="text-xl font-extrabold text-white">
                            {item.latestValue}
                          </span>
                          <span className="text-xs text-neutral-400 font-medium ml-1">
                            {item.latestUnit}
                          </span>
                        </div>
                        <div
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded-lg border ${d.bgClass} ${d.colorClass}`}
                        >
                          {d.icon} {d.text}
                        </div>
                      </div>

                      <div className="text-[10px] text-neutral-500 truncate pt-1 border-t border-neutral-800">
                        {format(new Date(item.latestDate), "d MMM yyyy", { locale: es })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3) GRÁFICA DE EVOLUCIÓN (RECHARTS) */}
      <div
        ref={evolutionChartRef}
        id="grafica-evolucion"
        className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-4 shadow-sm"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              <activeChartConfig.icon size={16} className="text-white" />
              <span>Evolución: {activeChartConfig.label}</span>
            </h2>
            <p className="text-xs text-neutral-400">
              Tendencia temporal de registros ordenados cronológicamente
            </p>
          </div>

          {/* Selector de tipo para la gráfica */}
          <select
            value={chartType}
            onChange={(e) => setChartType(e.target.value)}
            className="bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-white transition cursor-pointer"
          >
            {MEASUREMENT_TYPE_KEYS.map((k) => {
              const cfg = getMeasurementConfig(k, weightUnit)
              const count = measurements?.filter((m) => m.type === k).length || 0
              return (
                <option key={k} value={k}>
                  {cfg.label} {count > 0 ? `(${count})` : ''}
                </option>
              )
            })}
          </select>
        </div>

        {/* Gráfica Recharts */}
        <div className="w-full h-56 pt-2">
          {chartData.length === 0 ? (
            <div className="w-full h-full flex flex-col items-center justify-center text-center p-4 bg-neutral-950/40 rounded-xl border border-dashed border-neutral-800">
              <TrendingUp size={28} className="text-neutral-500 mb-1" />
              <p className="text-xs text-neutral-400">
                Sin registros de {activeChartConfig.label} todavía.
              </p>
              <p className="text-[10px] text-neutral-500 mt-0.5">
                Añade una medida arriba para visualizar la curva de progreso.
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                <XAxis
                  dataKey="formattedDate"
                  stroke="#737373"
                  fontSize={10}
                  tickLine={false}
                  axisLine={{ stroke: '#404040' }}
                />
                <YAxis
                  domain={[(dataMin: number) => Math.max(0, Math.floor(dataMin - 1)), (dataMax: number) => Math.ceil(dataMax + 1)]}
                  stroke="#737373"
                  fontSize={10}
                  tickLine={false}
                  axisLine={{ stroke: '#404040' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0a0a0a',
                    borderColor: '#262626',
                    borderRadius: '0.75rem',
                    color: '#ffffff',
                    fontSize: '12px',
                  }}
                  labelStyle={{ color: '#a3a3a3', fontWeight: 'bold' }}
                  formatter={(val: unknown) => [
                    `${val} ${chartData[0]?.unit || activeChartConfig.defaultUnit}`,
                    activeChartConfig.label,
                  ]}
                  labelFormatter={(_label, payload) => {
                    const pt = payload?.[0]?.payload as (typeof chartData)[0] | undefined
                    return pt ? pt.fullDate : String(_label)
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={chartStroke}
                  strokeWidth={2.5}
                  dot={{ fill: '#000000', stroke: chartStroke, strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* 4) HISTORIAL DE REGISTROS Y EDICIÓN/ELIMINACIÓN */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-400">
            Historial de Registros
          </h2>

          {/* Filtro por tipo de medida */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-neutral-500">Filtrar:</span>
            <select
              value={historyFilter}
              onChange={(e) => setHistoryFilter(e.target.value)}
              className="bg-neutral-900 border border-neutral-800 rounded-xl px-2.5 py-1 text-xs text-white focus:outline-none focus:border-white transition cursor-pointer"
            >
              <option value="all">Todas las medidas ({measurements?.length || 0})</option>
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
        </div>

        {filteredHistory.length === 0 ? (
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 text-center text-xs text-neutral-500">
            No hay registros para el filtro seleccionado.
          </div>
        ) : (
          <div className="space-y-2">
            {filteredHistory.map((m) => {
              const cfg = getMeasurementConfig(m.type, weightUnit)
              const dateStr = format(new Date(m.date), "EEEE, d 'de' MMMM 'de' yyyy", {
                locale: es,
              })
              const isEditing = editingId === m.id
              const isDeleting = deletingId === m.id
              const CfgIcon = cfg.icon

              if (isEditing) {
                return (
                  <div
                    key={m.id}
                    className="bg-neutral-900 border border-neutral-600 p-3.5 rounded-2xl space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <CfgIcon size={16} className="text-white" />
                        <span>Editar {cfg.label}</span>
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

                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2">
                        <label className="block text-[10px] text-neutral-400 uppercase font-semibold mb-1">
                          Valor
                        </label>
                        <input
                          type="number"
                          step={cfg.step}
                          min={cfg.min}
                          max={cfg.max}
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-1.5 text-xs text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-neutral-400 uppercase font-semibold mb-1">
                          Unidad
                        </label>
                        <input
                          type="text"
                          value={editUnit}
                          onChange={(e) => setEditUnit(e.target.value)}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-1.5 text-xs text-white font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] text-neutral-400 uppercase font-semibold mb-1">
                        Fecha
                      </label>
                      <input
                        type="date"
                        value={editDate}
                        onChange={(e) => setEditDate(e.target.value)}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-1.5 text-xs text-white"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl text-xs font-semibold"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(m.id, m.date)}
                        className="px-3 py-1.5 bg-white hover:bg-neutral-200 text-black rounded-xl text-xs font-bold"
                      >
                        Guardar cambios
                      </button>
                    </div>
                  </div>
                )
              }

              return (
                <div
                  key={m.id}
                  className="bg-neutral-900 border border-neutral-800 p-3 rounded-xl flex items-center justify-between gap-3 text-xs hover:border-neutral-700 transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-neutral-950 rounded-lg border border-neutral-800">
                      <CfgIcon size={18} className="text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-bold text-sm">
                          {m.value} {m.unit}
                        </span>
                        <span className="text-[11px] font-semibold text-neutral-400">
                          • {cfg.label}
                        </span>
                      </div>
                      <span className="text-neutral-500 block text-[11px] capitalize mt-0.5">
                        {dateStr}
                      </span>
                    </div>
                  </div>

                  {isDeleting ? (
                    <div className="flex items-center gap-1.5 bg-neutral-950 p-1 rounded-xl border border-red-900/50">
                      <button
                        type="button"
                        onClick={() => handleDeleteConfirm(m.id)}
                        className="px-2.5 py-1 bg-red-600 hover:bg-red-500 text-white rounded-lg text-[11px] font-bold transition"
                      >
                        Confirmar
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingId(null)}
                        className="px-2 py-1 text-neutral-400 hover:text-white text-[11px]"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(m)}
                        className="p-1.5 text-neutral-400 hover:text-white transition rounded-lg hover:bg-neutral-800"
                        title="Editar registro"
                        aria-label="Editar registro"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingId(m.id)}
                        className="p-1.5 text-neutral-400 hover:text-red-400 transition rounded-lg hover:bg-neutral-800"
                        title="Eliminar registro"
                        aria-label="Eliminar registro"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
