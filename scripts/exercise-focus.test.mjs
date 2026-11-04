import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs/promises'
import crypto from 'node:crypto'
import sharp from 'sharp'
import { catalog } from '../src/data/catalog.ts'
import { exerciseMedia } from '../src/data/exerciseMedia.ts'
import { getExerciseFocusDefinition, getSelectedExerciseFocus, resolveExerciseFocus, getExerciseFocusInstructions, HORIZONTAL_PRESS_ID, BILATERAL_PRESS_ID } from '../src/data/exerciseFocus.ts'
import { getAnatomicalPressLayout } from '../src/data/pressFocus.ts'

test('el enfoque existe exclusivamente para las dos prensas bilaterales solicitadas', () => {
  assert.deepEqual(catalog.filter(e => getExerciseFocusDefinition(e.id)).map(e => e.id).sort(), [HORIZONTAL_PRESS_ID, BILATERAL_PRESS_ID].sort())
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
