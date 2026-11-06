import test from 'node:test'
import assert from 'node:assert/strict'
import { catalog } from '../src/data/catalog.ts'
import { exerciseMedia } from '../src/data/exerciseMedia.ts'
import {
  ABDOMINAL_EXECUTIONS,
  ABDOMINAL_REGION_NOTE,
  getAbdominalClassification,
  matchesAbdominalRegion,
  matchesAbdominalSearch,
} from '../src/data/abdominalRegions.ts'

const regionOf = id => getAbdominalClassification(id)?.region

test('los crunches de flexión de tronco tienen énfasis superior, incluido el corto en máquina', () => {
  for (const slug of ['crunch-floor', 'crunch-hands-overhead', 'decline-crunch', 'cable-kneeling-crunch', 'cable-seated-crunch', 'lever-seated-crunch-chest-pad', 'lever-seated-crunch-v-2', 'weighted-crunch']) {
    assert.equal(regionOf('abs/' + slug), 'upper', slug)
    assert.equal(getAbdominalClassification('abs/' + slug).movement, 'trunk-flexion')
  }
})

test('el énfasis inferior requiere una ejecución revisada con retroversión pélvica', () => {
  for (const slug of ['reverse-crunch', 'cable-reverse-crunch', 'hanging-leg-hip-raise', 'hanging-straight-leg-hip-raise', 'incline-leg-hip-raise-leg-straight', 'hip-raise-bent-knee', 'lying-leg-hip-raise']) {
    const classification = getAbdominalClassification('abs/' + slug)
    assert.equal(classification.region, 'lower', slug)
    assert.equal(classification.movement, 'posterior-pelvic-tilt')
    assert.match(classification.cue, /sin esa retroversión no basta/)
  }
})

test('elevar piernas, estar colgado o añadir carga no asigna énfasis inferior automáticamente', () => {
  for (const slug of ['hanging-leg-raise', 'hanging-straight-leg-raise', 'captains-chair-straight-leg-raise', 'weighted-hanging-leg-hip-raise', 'lying-leg-raise-flat-bench', 'band-lying-straight-leg-raise', 'seated-leg-raise']) {
    assert.equal(regionOf('abs/' + slug), 'full', slug)
  }
  assert.equal(regionOf('abs/hanging-leg-hip-raise'), 'lower')
  assert.equal(regionOf('abs/hanging-straight-leg-hip-raise'), 'lower')
})

test('la ejecución prevalece sobre nombres como reverse crunch, hip raise o curl', () => {
  assert.equal(regionOf('abs/roller-reverse-crunch'), 'full')
  assert.equal(regionOf('abs/cable-tuck-reverse-crunch'), 'full')
  assert.equal(regionOf('abs/smith-hip-raise'), 'lower')
  assert.equal(regionOf('glutes/smith-hip-thrust'), undefined)
  assert.equal(regionOf('abs/curl-up'), 'upper')
  assert.equal(regionOf('biceps/barbell-curl'), undefined)
})

test('plancha, body saw y ab wheel son completos; la falta de predominio también usa completo', () => {
  for (const slug of ['weighted-front-plank', 'roller-body-saw', 'wheel-rollerout']) {
    const classification = getAbdominalClassification('abs/' + slug)
    assert.equal(classification.region, 'full')
    assert.equal(classification.movement, 'stabilization')
  }
  for (const slug of ['russian-twist', 'air-bike', 'tuck-crunch']) {
    assert.equal(regionOf('abs/' + slug), 'full')
  }
})

test('las clasificaciones conservan un músculo único y solo cubren IDs abdominales existentes', () => {
  assert.match(ABDOMINAL_REGION_NOTE, /un solo músculo y ambas regiones participan/)
  assert.match(ABDOMINAL_REGION_NOTE, /sin aislamiento/)
  const original = structuredClone(exerciseMedia)
  const abdominalIds = catalog.filter(e => exerciseMedia[e.id]?.primary.includes('abs') && e.id !== 'abs/assisted-prone-rectus-femoris-stretch').map(e => e.id)
  assert.ok(abdominalIds.length > 100)
  for (const id of abdominalIds) {
    assert.ok(['upper', 'lower', 'full'].includes(regionOf(id)), id)
  }
  for (const [id, execution] of Object.entries(ABDOMINAL_EXECUTIONS)) {
    assert.ok(abdominalIds.includes(id), id)
    assert.ok(execution.reason.length > 40, id)
    if (regionOf(id) === 'lower') assert.equal(execution.movement, 'posterior-pelvic-tilt')
  }
  for (const id of ['abs/assisted-prone-rectus-femoris-stretch', 'abs/unreviewed-leg-raise', 'custom-crunch-inferior', '__proto__', 'constructor', 'calves/lever-seated-squat-calf-raise-on-leg-press-machine']) {
    assert.equal(getAbdominalClassification(id), null, id)
  }
  assert.deepEqual(exerciseMedia, original)
})

test('búsqueda y filtro comparten categorías y respetan los ejercicios ajenos', () => {
  assert.equal(matchesAbdominalSearch('abs/reverse-crunch', 'RECTO ABDOMINAL INFERIOR'), true)
  assert.equal(matchesAbdominalSearch('abs/lever-seated-crunch-v-2', 'énfasis superior'), true)
  assert.equal(matchesAbdominalSearch('abs/wheel-rollerout', 'abdomen completo'), true)
  assert.equal(matchesAbdominalSearch('abs/hanging-straight-leg-raise', 'abdomen inferior'), false)
  assert.equal(matchesAbdominalSearch('biceps/barbell-curl', 'abdomen completo'), false)
  assert.equal(matchesAbdominalSearch('abs/reverse-crunch', '  '), false)
  assert.equal(matchesAbdominalRegion('abs/reverse-crunch', 'lower'), true)
  assert.equal(matchesAbdominalRegion('abs/reverse-crunch', 'upper'), false)
  assert.equal(matchesAbdominalRegion('biceps/barbell-curl', 'full'), false)
  assert.equal(matchesAbdominalRegion('biceps/barbell-curl', 'all'), true)
})
