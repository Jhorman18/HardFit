import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs/promises'
import crypto from 'node:crypto'
import sharp from 'sharp'
import { catalog } from '../src/data/catalog.ts'
import { exerciseMedia } from '../src/data/exerciseMedia.ts'
import { getExerciseFocusDefinition } from '../src/data/exerciseFocus.ts'
import { catalogAdditions, applyCatalogAdditions } from './catalog-additions.mjs'

const instructions = JSON.parse(await fs.readFile(new URL('../src/data/exerciseInstructions.json',import.meta.url),'utf8'))

test('las cinco fichas solicitadas tienen nombre, tipo, imagen, músculos e instrucciones coherentes',()=>{
  assert.equal(catalogAdditions.length,5)
  for(const definition of catalogAdditions) {
    const {exercise,media}=definition
    const matches=catalog.filter(item=>item.id===exercise.id)
    assert.equal(matches.length,1,exercise.id)
    const actual=matches[0]
    for(const key of ['name','muscleGroup','equipment','type']) assert.equal(actual[key],exercise[key],key)
    for(const alias of exercise.aliases) assert.ok(actual.aliases.includes(alias),alias)
    assert.deepEqual(exerciseMedia[exercise.id],media)
    assert.deepEqual(instructions[exercise.id],definition.instructions)
    assert.equal(media.primary.length,media.primaryEs.length)
    assert.equal(media.secondary.length,media.secondaryEs.length)
    assert.equal(new Set([...media.primary,...media.secondary]).size,media.primary.length+media.secondary.length)
    assert.equal(getExerciseFocusDefinition(exercise.id),null)
  }
  assert.equal(catalog.find(item=>item.id==='abs/hanging-leg-hip-raise').type,'bodyweight_reps')
  assert.match(instructions['abs/hanging-leg-hip-raise'].join(' '),/flexionando las rodillas/)
  assert.equal(catalog.find(item=>item.id==='forearms/dumbbell-reverse-wrist-curl').muscleGroup,'Antebrazos')
  assert.deepEqual(exerciseMedia['delts/cable-standing-rear-delt-row-with-rope'].primary,['back-deltoids'])
  assert.deepEqual(exerciseMedia['glutes/smith-hip-thrust'].primary,['gluteal'])
})

test('aplicar las altas es idempotente y conserva IDs, alias y fichas ajenas',()=>{
  const untouched={id:'unrelated/exercise',name:'Original',muscleGroup:'Core',equipment:'Peso corporal',type:'bodyweight_reps',aliases:['histórico']}
  const previous={...catalogAdditions[0].exercise,name:'Nombre histórico',aliases:['alias previo']}
  const rows=[structuredClone(untouched),previous]
  const media={untouched:{gifUrl:'original'}}
  const steps={untouched:['Original']}
  applyCatalogAdditions(rows,media,steps)
  assert.deepEqual(rows[0],untouched)
  assert.ok(rows.find(item=>item.id===previous.id).aliases.includes('alias previo'))
  assert.ok(rows.find(item=>item.id===previous.id).aliases.includes('Nombre histórico'))
  assert.equal(rows.length,6)
  const first=structuredClone({rows,media,steps})
  applyCatalogAdditions(rows,media,steps)
  assert.deepEqual({rows,media,steps},first)
  assert.deepEqual(media.untouched,{gifUrl:'original'})
  assert.deepEqual(steps.untouched,['Original'])
})

test('las cinco imágenes locales coinciden con los originales suministrados',async()=>{
  const manifest=JSON.parse(await fs.readFile(new URL('../docs/requested-exercises-images.json',import.meta.url),'utf8'))
  assert.equal(manifest.assets.length,5)
  for(const asset of manifest.assets) {
    assert.equal('public'+exerciseMedia[asset.exerciseId].gifUrl,asset.path)
    const bytes=await fs.readFile(new URL('../'+asset.path,import.meta.url))
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),asset.sha256)
    const info=await sharp(bytes).metadata()
    assert.equal(info.width,asset.width)
    assert.equal(info.height,asset.height)
    assert.ok(bytes.length<3*1024*1024)
  }
})
