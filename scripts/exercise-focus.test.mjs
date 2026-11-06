import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs/promises'
import crypto from 'node:crypto'
import sharp from 'sharp'
import { catalog } from '../src/data/catalog.ts'
import { exerciseMedia } from '../src/data/exerciseMedia.ts'
import { getExerciseFocusDefinition, getSelectedExerciseFocus, resolveExerciseFocus, getExerciseFocusInstructions, HORIZONTAL_PRESS_ID, BILATERAL_PRESS_ID } from '../src/data/exerciseFocus.ts'
import { getAnatomicalPressLayout, getPressFocusDemo, getPressPhaseLayout } from '../src/data/pressFocus.ts'
import { BASIC_CURL_IDS, getCurlGripDemo } from '../src/data/curlGrip.ts'

test('el enfoque existe exclusivamente en las prensas y curls básicos autorizados', () => {
  assert.deepEqual(catalog.filter(e => getExerciseFocusDefinition(e.id)).map(e => e.id).sort(), [HORIZONTAL_PRESS_ID, BILATERAL_PRESS_ID, ...BASIC_CURL_IDS].sort())
  for (const id of [HORIZONTAL_PRESS_ID, BILATERAL_PRESS_ID]) {
    assert.deepEqual(getExerciseFocusDefinition(id).options.map(o => o.id), ['quadriceps', 'posterior-chain', 'calves'])
  }
  for (const id of ['glutes/lever-horizontal-one-leg-press', 'glutes/sled-45-degrees-one-leg-press', 'quads/dumbbell-single-leg-split-squat', 'quads/lever-leg-extension', '__proto__']) {
    assert.equal(getExerciseFocusDefinition(id), null)
    assert.deepEqual(resolveExerciseFocus(id, exerciseMedia[HORIZONTAL_PRESS_ID], 'calves'), exerciseMedia[HORIZONTAL_PRESS_ID])
    assert.equal(getExerciseFocusInstructions(id, 'calves'), undefined)
  }
})
test('cada dominancia ofrece músculos coherentes y conserva los valores predeterminados', () => {
  assert.equal(getSelectedExerciseFocus(HORIZONTAL_PRESS_ID).id, 'calves')
  assert.equal(getSelectedExerciseFocus(BILATERAL_PRESS_ID).id, 'quadriceps')
  for (const id of [HORIZONTAL_PRESS_ID, BILATERAL_PRESS_ID]) {
    for (const option of getExerciseFocusDefinition(id).options) {
      const media = resolveExerciseFocus(id, exerciseMedia[id], option.id)
      assert.deepEqual(media.primary, option.primary)
      assert.deepEqual(media.secondary, option.secondary)
      assert.equal(new Set([...media.primary, ...media.secondary]).size, media.primary.length + media.secondary.length)
      assert.ok(![...media.primary, ...media.secondary].some(m => ['biceps', 'triceps', 'deltoids'].includes(m)))
      assert.ok(getExerciseFocusInstructions(id, option.id).length > 0)
    }
  }
})
test('las seis referencias conservan sus bytes y su correspondencia con ejercicio y enfoque', async () => {
  const manifest = JSON.parse(await fs.readFile(new URL('../docs/press-user-images.json', import.meta.url), 'utf8'))
  assert.equal(manifest.assets.length, 6)
  for (const asset of manifest.assets) {
    const media = resolveExerciseFocus(asset.exerciseId, exerciseMedia[asset.exerciseId], asset.focus)
    assert.equal('public' + media.gifUrl, asset.path)
    const buffer = await fs.readFile(new URL('../' + asset.path, import.meta.url))
    assert.equal(crypto.createHash('sha256').update(buffer).digest('hex'), asset.sha256)
    assert.ok(buffer.length < 3 * 1024 * 1024)
    const info = await sharp(buffer).metadata()
    const layout = getAnatomicalPressLayout(media.gifUrl)
    assert.equal(layout.columns, 2)
    assert.equal(layout.rows, 1)
    assert.equal(layout.frameAspectRatio, (info.width / 2) / info.height)
  }
})

test('solo los diez curls básicos autorizados admiten Prono/Supino', () => {
  assert.equal(BASIC_CURL_IDS.length, 10)
  for (const id of BASIC_CURL_IDS) {
    assert.ok(catalog.some(exercise => exercise.id === id), id)
    assert.deepEqual(getExerciseFocusDefinition(id).options.map(option => option.id), ['supinated', 'pronated'])
  }
  for (const id of [
    'biceps/barbell-drag-curl', 'biceps/barbell-preacher-curl', 'biceps/ez-barbell-spider-curl-1628',
    'biceps/dumbbell-incline-biceps-curl', 'biceps/dumbbell-concentration-curl',
    'biceps/dumbbell-hammer-curl-v-2', 'biceps/dumbbell-zottman-curl',
    'biceps/barbell-biceps-curl-with-arm-blaster', 'biceps/cable-curl',
    'forearms/barbell-wrist-curl-v-2', 'forearms/dumbbell-reverse-wrist-curl', '__proto__',
  ]) {
    assert.equal(getExerciseFocusDefinition(id), null, id)
    if (Object.hasOwn(exerciseMedia, id)) assert.deepEqual(resolveExerciseFocus(id, exerciseMedia[id], 'pronated'), exerciseMedia[id])
  }
})

test('ambos agarres mantienen activos bíceps y antebrazo, con distinto énfasis', () => {
  for (const id of BASIC_CURL_IDS) {
    const original = structuredClone(exerciseMedia[id])
    const supinated = resolveExerciseFocus(id, exerciseMedia[id], 'supinated')
    const pronated = resolveExerciseFocus(id, exerciseMedia[id], 'pronated')
    assert.deepEqual(supinated.primary, ['biceps'])
    assert.deepEqual(supinated.secondary, ['forearm'])
    assert.deepEqual(pronated.primary, ['forearm'])
    assert.deepEqual(pronated.secondary, ['biceps'])
    assert.deepEqual(supinated.primaryEs, ['Bíceps'])
    assert.deepEqual(pronated.primaryEs, ['Antebrazos'])
    for (const media of [supinated, pronated]) {
      assert.deepEqual([...media.primary, ...media.secondary].sort(), ['biceps', 'forearm'])
      assert.equal(new Set([...media.primary, ...media.secondary]).size, 2)
    }
    assert.deepEqual(exerciseMedia[id], original)
  }
})

test('las fichas inversas parten en prono y una preferencia de prensa no se aplica a un curl', () => {
  for (const id of BASIC_CURL_IDS) {
    const expected = id.includes('reverse') || id.includes('revers-grip') ? 'pronated' : 'supinated'
    assert.equal(getSelectedExerciseFocus(id).id, expected)
    assert.equal(getSelectedExerciseFocus(id, 'calves').id, expected)
    assert.equal(getSelectedExerciseFocus(id, 'quadriceps').id, expected)
  }
  assert.equal(getSelectedExerciseFocus(BILATERAL_PRESS_ID, 'pronated').id, 'quadriceps')
  assert.equal(getPressFocusDemo(BILATERAL_PRESS_ID, 'pronated'), undefined)
  assert.equal(getCurlGripDemo('biceps/barbell-curl', 'calves'), undefined)
})

test('las seis demostraciones y su técnica coinciden con el implemento y el agarre', () => {
  const families = [
    ['biceps/barbell-curl', 'biceps/barbell-curl', 'biceps/barbell-reverse-curl'],
    ['biceps/ez-barbell-curl', 'biceps/ez-barbell-curl', 'biceps/ez-barbell-reverse-grip-curl'],
    ['biceps/dumbbell-biceps-curl', 'biceps/dumbbell-biceps-curl', 'biceps/dumbbell-standing-reverse-curl'],
  ]
  for (const [id, supinatedId, pronatedId] of families) {
    assert.equal(resolveExerciseFocus(id, exerciseMedia[id], 'supinated').gifUrl, exerciseMedia[supinatedId].gifUrl)
    assert.equal(resolveExerciseFocus(id, exerciseMedia[id], 'pronated').gifUrl, exerciseMedia[pronatedId].gifUrl)
    for (const grip of ['supinated', 'pronated']) {
      const instructions = getExerciseFocusInstructions(id, grip).join(' ')
      assert.match(instructions, grip === 'supinated' ? /Supino:.*palmas.*arriba/ : /Prono:.*palmas.*abajo/)
      assert.match(instructions, /sin aislar/)
      if (id.includes('ez-bar')) assert.match(instructions, /palmas quedan oblicuas/)
    }
  }
})

test('cambiar de agarre conserva los otros músculos y sus etiquetas sin duplicarlos', () => {
  const base = {
    ...exerciseMedia['biceps/barbell-curl'],
    secondary: ['forearm', 'front-deltoids'],
    secondaryEs: ['Antebrazos', 'Deltoides anterior'],
  }
  const copy = structuredClone(base)
  const result = resolveExerciseFocus('biceps/barbell-curl', base, 'pronated')
  assert.deepEqual(result.primary, ['forearm'])
  assert.deepEqual(result.secondary, ['biceps', 'front-deltoids'])
  assert.deepEqual(result.secondaryEs, ['Bíceps', 'Deltoides anterior'])
  assert.deepEqual(base, copy)
})

test('las seis prensas usan dos fases con los recortes originales y menor saturación solo en horizontal', async () => {
  const manifest = JSON.parse(await fs.readFile(new URL('../docs/press-user-images.json', import.meta.url), 'utf8'))
  for (const asset of manifest.assets) {
    const url = asset.path.replace(/^public/, '')
    const original = getAnatomicalPressLayout(url)
    const phase = getPressPhaseLayout(url)
    assert.ok(phase)
    assert.equal(phase.frames.length, 2)
    assert.equal(phase.frameWidth, original.frameAspectRatio)
    assert.equal(phase.frameHeight, 1)
    assert.equal(phase.sourceWidth, original.frameAspectRatio * 2)
    assert.equal(phase.sourceHeight, 1)
    for (const [index, frame] of phase.frames.entries()) {
      assert.equal(frame.x, original.frames?.[index]?.x ?? index * original.frameAspectRatio)
      assert.equal(frame.clipPoints, original.frames?.[index]?.clipPoints)
    }
    assert.equal(phase.imageFilter, asset.mode === 'horizontal' ? 'saturate(0.45)' : undefined)
  }
  for (const url of [undefined, '', '/animations/leg-press-anatomical/horizontal-single-calves-atlas.png', '/exercises/user-added/tiron-cara.jpg', '__proto__']) {
    assert.equal(getPressPhaseLayout(url), undefined)
  }
})
