import test from 'node:test'
import assert from 'node:assert/strict'
import { formatSetSummary } from '../src/utils/setSummary.ts'
import { convertSetWeight } from '../src/utils/weightUnits.ts'

test('los resúmenes distinguen valores vacíos de ceros y conservan coma decimal', () => {
  assert.equal(formatSetSummary({}, 'weight_reps', 'kg'), '— kg × — reps')
  assert.equal(formatSetSummary({ weight: 0, reps: 0 }, 'weight_reps', 'kg'), '0 kg × 0 reps')
  assert.equal(formatSetSummary({ weight: 77.55, reps: 10 }, 'weight_reps', 'kg'), '77,55 kg × 10 reps')
})

test('la unidad visible usa cargas ya convertidas y no modifica el número guardado', () => {
  const original = { weight: 50, weightUnit: 'lb', reps: 8 }
  assert.equal(formatSetSummary(convertSetWeight(original, 'kg'), 'weight_reps', 'kg'), '22,68 kg × 8 reps')
  assert.equal(formatSetSummary(original, 'weight_reps', 'lb'), '50 lb × 8 reps')
  assert.equal(original.weight, 50)
  assert.equal(original.weightUnit, 'lb')
})

test('peso corporal diferencia las repeticiones solas del lastre añadido', () => {
  assert.equal(formatSetSummary({ reps: 12 }, 'bodyweight_reps', 'kg'), '12 reps · Peso corporal')
  assert.equal(formatSetSummary({ weight: 0, reps: 12 }, 'bodyweight_reps', 'kg'), '12 reps · Peso corporal')
  assert.equal(formatSetSummary({ weight: 10, reps: 12 }, 'bodyweight_reps', 'lb'), '+10 lb × 12 reps')
})

test('la asistencia se identifica explícitamente y no se presenta como lastre', () => {
  assert.equal(formatSetSummary({ weight: 25, reps: 8 }, 'bodyweight_assisted', 'kg'), '25 kg asistencia × 8 reps')
  assert.equal(formatSetSummary({ reps: 8 }, 'bodyweight_assisted', 'kg'), '— kg asistencia × 8 reps')
})

test('las series por tiempo distinguen ausencia, cero y minutos completos', () => {
  assert.equal(formatSetSummary({}, 'duration', 'kg'), '— s')
  assert.equal(formatSetSummary({ durationSec: 0 }, 'duration', 'kg'), '00:00')
  assert.equal(formatSetSummary({ durationSec: 95 }, 'duration', 'kg'), '01:35')
  assert.equal(formatSetSummary({ durationSec: 3600 }, 'duration', 'kg'), '60:00')
})

test('distancia conserva metros decimales y solo añade tiempo cuando existe', () => {
  assert.equal(formatSetSummary({ distanceM: 1234.5 }, 'distance', 'lb'), '1.234,5 m')
  assert.equal(formatSetSummary({ distanceM: 1000, durationSec: 300 }, 'distance', 'kg'), '1.000 m · 05:00')
  assert.equal(formatSetSummary({ durationSec: 0 }, 'distance', 'kg'), '— m · 00:00')
})
