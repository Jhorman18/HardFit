import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs/promises'
import sharp from 'sharp'
import { EXERCISE_PHASE_LAYOUTS, getExercisePhaseLayout } from '../src/data/exercisePhases.ts'

test('las cinco láminas originales tienen exactamente dos ventanas de fase',async()=>{
  const manifest=JSON.parse(await fs.readFile(new URL('../docs/requested-exercises-images.json',import.meta.url),'utf8'))
  assert.equal(EXERCISE_PHASE_LAYOUTS.length,5)
  for(const asset of manifest.assets){
    const layout=getExercisePhaseLayout(asset.path.replace(/^public/,''))
    assert.ok(layout,asset.path)
    assert.equal(layout.frames.length,2)
    assert.equal(layout.sourceWidth,asset.width)
    assert.equal(layout.sourceHeight,asset.height)
    const info=await sharp(await fs.readFile(new URL('../'+asset.path,import.meta.url))).metadata()
    assert.equal(layout.sourceWidth,info.width)
    assert.equal(layout.sourceHeight,info.height)
    assert.ok(layout.frameWidth>0 && layout.frameHeight>0)
    for(const frame of layout.frames){
      assert.ok(frame.y>=0 && frame.y+layout.frameHeight<=layout.sourceHeight)
      assert.ok(frame.x+layout.frameWidth<=layout.sourceWidth)
      if(frame.clip){
        assert.ok(frame.clip.x>=0 && frame.clip.y>=0)
        assert.ok(frame.clip.x+frame.clip.width<=layout.frameWidth)
        assert.ok(frame.clip.y+frame.clip.height<=layout.frameHeight)
      }
    }
  }
})

test('las ventanas de piernas dejan espacio al recorrido sin incluir la figura vecina',()=>{
  const layout=getExercisePhaseLayout('/exercises/user-added/levantamiento-piernas-barra.jpeg')
  assert.equal(layout.frames[0].x+layout.frameWidth,900)
  assert.equal(layout.frames[1].x,1000)
  // El margen izquierdo del inicio reserva el espacio que ocuparán las piernas elevadas.
  assert.equal(layout.frames[1].x-layout.frames[0].x,1500)
  assert.equal(layout.frameWidth,1400)
})

test('el recorte por fases no se aplica a GIF ni a otros ejercicios',()=>{
  for(const url of [
    undefined,'','/exercises/user-added/desconocido.jpg',
    '/animations/leg-press-user/horizontal-calves-poses.jpeg',
    'https://cdn.jsdelivr.net/gh/JahelCuadrado/ExerciseGymGifsDB@v1.1.0/lats/cable-twisting-pull.gif',
  ]) assert.equal(getExercisePhaseLayout(url),undefined)
})
