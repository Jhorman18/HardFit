import assert from 'node:assert/strict'
import test from 'node:test'
import {
  KG_PER_LB, convertWeight, weightInKg, convertSetWeight,
  changeWorkoutWeightUnit, changeEntryWeightUnit, stampWorkoutWeightUnits,
  stampRoutineWeightUnits, changeRoutineItemWeightUnit, getLatestBodyweightKg,
} from '../src/utils/weightUnits.ts'

const near=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-7, actual+' != '+expected)
const workout=()=>({
  id:'units-test',name:'Mixed',startedAt:1,finishedAt:2,routineId:null,notes:'',
  weightUnit:'kg',restSeconds:120,
  entries:[
    {exerciseId:'a',sets:[{type:'normal',completed:true,weight:20,reps:10,weightUnit:'kg'}]},
    {exerciseId:'b',weightUnit:'lb',restSeconds:45,sets:[{type:'warmup',completed:false,weight:50,reps:8,weightUnit:'lb'}]},
  ],
})

test('kg y lb se convierten con la equivalencia exacta y conservan el peso al volver',()=>{
  near(convertWeight(1,'lb','kg'),KG_PER_LB)
  near(convertWeight(20,'kg','lb'),44.092452437)
  let value=20
  for(let i=0;i<100;i++)value=convertWeight(convertWeight(value,'kg','lb'),'lb','kg')
  near(value,20)
  assert.equal(convertWeight(0,'kg','lb'),0)
})

test('cambiar la unidad global convierte las entradas heredadas y conserva overrides y descansos',()=>{
  const original=workout(), copy=structuredClone(original)
  const result=changeWorkoutWeightUnit(original,'lb')
  near(result.entries[0].sets[0].weight,44.092452437)
  assert.equal(result.entries[0].sets[0].weightUnit,'lb')
  assert.equal(result.entries[0].weightUnit,undefined)
  assert.deepEqual(result.entries[1],original.entries[1])
  assert.equal(result.restSeconds,120)
  assert.equal(result.entries[0].sets[0].completed,true)
  assert.deepEqual(original,copy)
})

test('un ejercicio puede cambiar de unidad y volver a heredar la global sin cambiar su carga física',()=>{
  const original=workout()
  const own=changeEntryWeightUnit(original,0,'lb')
  near(own.entries[0].sets[0].weight,44.092452437)
  assert.equal(own.entries[0].weightUnit,'lb')
  const inherited=changeEntryWeightUnit(own,0,null)
  near(inherited.entries[0].sets[0].weight,20)
  assert.equal(inherited.entries[0].weightUnit,undefined)
  assert.deepEqual(inherited.entries[1],original.entries[1])
})

test('la migración identifica registros antiguos en lb sin modificar sus números',()=>{
  const old=workout();delete old.weightUnit;delete old.entries[0].sets[0].weightUnit
  const copy=structuredClone(old)
  const migrated=stampWorkoutWeightUnits(old,'lb')
  assert.equal(migrated.weightUnit,'lb')
  assert.equal(migrated.entries[0].sets[0].weight,20)
  assert.equal(migrated.entries[0].sets[0].weightUnit,'lb')
  near(weightInKg(migrated.entries[0].sets[0]),20*KG_PER_LB)
  assert.deepEqual(old,copy)
  assert.deepEqual(stampWorkoutWeightUnits(migrated,'kg'),migrated)
})

test('rutinas conservan unidades originales y convierten objetivos al cambiar el override',()=>{
  const old={id:'r',name:'Routine',folderId:null,order:0,items:[{exerciseId:'a',order:0,targetSets:[{weight:50,reps:10,rpe:8}]}]}
  const migrated=stampRoutineWeightUnits(old,'lb')
  assert.equal(migrated.weightUnit,'lb')
  assert.equal(migrated.items[0].targetSets[0].weightUnit,'lb')
  const changed=changeRoutineItemWeightUnit(migrated.items[0],'lb','kg')
  near(changed.targetSets[0].weight,50*KG_PER_LB)
  assert.equal(changed.targetSets[0].rpe,8)
  const inherited=changeRoutineItemWeightUnit(changed,'lb',null)
  near(inherited.targetSets[0].weight,50)
  assert.equal(inherited.weightUnit,undefined)
})

test('una conversión conserva tiempo, distancia, repeticiones y estados de las series',()=>{
  const set={weight:undefined,weightUnit:'kg',durationSec:65,distanceM:1234,reps:8,completed:false,type:'warmup'}
  const converted=convertSetWeight(set,'lb')
  assert.equal(converted.weight,undefined)
  for(const field of ['durationSec','distanceM','reps','completed','type'])assert.equal(converted[field],set[field])
})

test('el peso corporal se normaliza usando la unidad de la medida y no la etiqueta global',()=>{
  const list=[{id:'old',date:1,type:'bodyweight',value:50,unit:'kg'},{id:'new',date:2,type:'bodyweight',value:220,unit:'lb'}]
  near(getLatestBodyweightKg(list),220*KG_PER_LB)
  assert.equal(list[0].id,'old')
  assert.equal(getLatestBodyweightKg([]),0)
})

test('el mismo peso físico en kg y lb produce el mismo valor para récords',()=>{
  const kg={weight:20,weightUnit:'kg'}
  const lb=convertSetWeight(kg,'lb')
  assert.equal(weightInKg(kg),weightInKg(lb))
  near(weightInKg({weight:20,weightUnit:'lb'}),9.0718474)
})
