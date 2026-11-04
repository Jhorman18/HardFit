
import fs from 'node:fs/promises'
import path from 'node:path'
import assert from 'node:assert/strict'

const outputDir = 'C:/Users/1233896946/Documents/hard/HardFit/.codex/tmp/units-press-port'
await fs.mkdir(outputDir, { recursive: true })
import { spawn } from 'node:child_process'
import os from 'node:os'
const profileDir=await fs.mkdtemp(path.join(os.tmpdir(),'hardfit-port-'))
const browserProcess=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',[
 '--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--remote-debugging-port=9226','--user-data-dir='+profileDir,'about:blank',
],{windowsHide:true,stdio:'ignore'})
for(let retry=0;retry<80;retry++){
 try{const response=await fetch('http://127.0.0.1:9226/json/version');if(response.ok)break}catch{}
 if(retry===79){browserProcess.kill();throw new Error('Chrome did not start')}
 await new Promise(r=>setTimeout(r,200))
}

const pages = await fetch('http://127.0.0.1:9226/json/list').then((r) => r.json())
const target = pages.find((p) => p.type === 'page' && p.url === 'about:blank') ?? pages.find((p) => p.type === 'page')
const socket = new WebSocket(target.webSocketDebuggerUrl)
await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject })
let id = 0
const pending = new Map()
const runtimeErrors = []
const trace = []
socket.onmessage = ({ data }) => {
  const message = JSON.parse(data)
  if(message.method==='Log.entryAdded'||message.method==='Network.loadingFailed'||(message.method==='Network.responseReceived'&&message.params.response.status>=400))trace.push(message)
  if (message.method === 'Runtime.exceptionThrown') runtimeErrors.push(message.params.exceptionDetails)
  if (message.id && pending.has(message.id)) {
    const task = pending.get(message.id)
    pending.delete(message.id)
    if (message.error) task.reject(new Error(JSON.stringify(message.error)))
    else task.resolve(message.result)
  }
}
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const requestId = ++id
  pending.set(requestId, { resolve, reject })
  socket.send(JSON.stringify({ id: requestId, method, params }))
})
const evaluate = async (expression) => {
  const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, userGesture: true })
  if (result.exceptionDetails) throw new Error(result.result.description ?? result.exceptionDetails.text)
  return result.result.value
}
const waitFor = async (expression) => {
  for (let retry = 0; retry < 120; retry++) {
    if (await evaluate(expression)) return
    await new Promise((resolve) => setTimeout(resolve, 200))
  }
  throw new Error('Timeout: ' + expression)
}
const navigate = async (pathname) => {
  await send('Page.navigate', { url: 'http://127.0.0.1:5174' + pathname })
  await waitFor("document.querySelector('nav') !== null && !document.body.innerText.includes('Iniciando Kitaeru')")
  await evaluate("window.__testStoreUrl = performance.getEntriesByType('resource').map(entry=>entry.name).find(url=>url.includes('/src/store/index.ts?')) || '/src/store/index.ts'")
}
const screenshot = async (name) => {
  await evaluate("document.querySelector('fieldset')?.scrollIntoView({ block: 'center' })")
  await new Promise((resolve) => setTimeout(resolve, 250))
  const result = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
  await fs.writeFile(path.join(outputDir, name), Buffer.from(result.data, 'base64'))
}
const openCatalogExercise = async (name, search, matchIndex = 0) => {
  await waitFor("document.querySelector('input[placeholder^=\"Buscar por nombre\"]') !== null")
  await evaluate(`(() => {
    const input = document.querySelector('input[placeholder^="Buscar por nombre"]')
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, ${JSON.stringify(search)})
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })()`)
  await waitFor(`Array.from(document.querySelectorAll('h3')).some((el) => el.textContent.trim() === ${JSON.stringify(name)})`)
  await evaluate(`Array.from(document.querySelectorAll('h3')).filter((el) => el.textContent.trim() === ${JSON.stringify(name)})[${matchIndex}].click()`)
  await waitFor("document.querySelector('fieldset input[type=radio]') !== null")
}
const chooseFocus = async (focus, exerciseId) => {
  await evaluate(`document.querySelector('input[type=radio][value="${focus}"]').click()`)
  await waitFor(`!document.querySelector('fieldset').disabled && document.querySelector('input[type=radio][value="${focus}"]').checked`)
  const stored = await evaluate(`import('/src/db/db.ts').then(({db}) => db.muscleOverrides.get(${JSON.stringify(exerciseId)}))`)
  assert.equal(stored?.focus ?? await evaluate("import('/src/data/exerciseFocus.ts').then(m=>m.getSelectedExerciseFocus("+JSON.stringify(exerciseId)+").id)"), focus)
}

await send('Page.enable')
await send('Runtime.enable')
await send('Network.enable')
await send('Log.enable')
await send('Network.setBlockedURLs', { urls: [ 'https://fonts.googleapis.com/*', 'https://fonts.gstatic.com/*'] })
await send('Browser.setDownloadBehavior', { behavior: 'deny' })
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })


const inPage=(fn,...args)=>evaluate('('+fn.toString()+')('+args.map(arg=>JSON.stringify(arg)).join(',')+')')
const checks=[]
let preview
const near=(actual,expected)=>assert.ok(Math.abs(actual-expected)<0.001,actual+' != '+expected)
const exA='biceps/barbell-drag-curl',exB='quads/lever-leg-extension'
const nameA='Curl de bíceps con barra',nameB='Extensión de cuádriceps en máquina'
const modal=()=>document.querySelector('[role=dialog]')
const openSettings=async(name)=>{
 await inPage(name=>document.querySelector('[aria-label="'+(name?'Configurar descanso y unidad de '+name:'Configurar descanso y unidad global')+'"]').click(),name)
 await waitFor("document.querySelector('[role=dialog] fieldset[aria-label=\"Unidad de peso\"]') !== null")
}
const pick=async unit=>{
 await inPage(unit=>document.querySelector('[role=dialog] input[value="'+unit+'"]').click(),unit)
 await waitFor("document.querySelector('[role=dialog] input[value="+unit+"]')?.checked===true")
}
const closeModal=()=>inPage(()=>document.querySelector('[role=dialog] button[aria-label=Cerrar]').click())
const rest=seconds=>inPage(seconds=>{
 const label=seconds===45?'45s':seconds===90?'1:30':'2:00'
 Array.from(document.querySelectorAll('[role=dialog] button')).find(button=>button.textContent.trim()===label).click()
},seconds)
const fill=async(name,weight,reps)=>inPage((name,weight,reps)=>{
 const heading=Array.from(document.querySelectorAll('h3')).find(el=>el.textContent.trim()===name)
 const inputs=heading.closest('.rounded-2xl').querySelectorAll('input[type=number]')
 for(const [index,value] of [[0,weight],[1,reps]]){
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(inputs[index],String(value))
  inputs[index].dispatchEvent(new Event('input',{bubbles:true}))
 }
},name,weight,reps)
try{
 await send('Network.setBlockedURLs',{urls:['http://127.0.0.1:5174/src/main.tsx*','https://fonts.googleapis.com/*','https://fonts.gstatic.com/*']})
 await send('Page.navigate',{url:'http://127.0.0.1:5174/'})
 await waitFor("location.origin==='http://127.0.0.1:5174' && document.getElementById('root')!==null")
 await inPage(async()=>{
  localStorage.removeItem('replog_active_workout')
  await new Promise((resolve,reject)=>{
   const request=indexedDB.deleteDatabase('replog')
   request.onsuccess=resolve;request.onerror=()=>reject(request.error);request.onblocked=()=>reject(new Error('delete blocked'))
  })
  await new Promise((resolve,reject)=>{
   const request=indexedDB.open('replog',40)
   request.onupgradeneeded=()=>{
    const db=request.result
    const schema={
     exercises:['id','name','muscleGroup','equipment','type','isCustom'],
     folders:['id','name','order'],routines:['id','name','folderId','order'],
     workouts:['id','name','startedAt','finishedAt','routineId'],
     measurements:['id','date','type'],settings:['id'],syncMeta:['key'],
     exerciseNotes:['exerciseId'],muscleOverrides:['exerciseId'],
    }
    for(const [name,[key,...indexes]] of Object.entries(schema)){
     const store=db.createObjectStore(name,{keyPath:key})
     for(const index of indexes)store.createIndex(index,index)
    }
   }
   request.onerror=()=>reject(request.error)
   request.onsuccess=()=>{
    const db=request.result
    const tx=db.transaction(['settings','exercises','routines','workouts','measurements'],'readwrite')
    tx.objectStore('settings').put({id:'app',units:'lb',restSeconds:120,seedVersion:4,createdAt:1,healthOnboarded:true})
    tx.objectStore('exercises').put({id:'units-legacy-ex',name:'Prueba anterior',type:'weight_reps',muscleGroup:'Bíceps',equipment:'Barra',isCustom:true})
    const old={id:'units-legacy-workout',name:'Anterior lb',startedAt:1,finishedAt:2,routineId:null,notes:'',entries:[{exerciseId:'units-legacy-ex',restSeconds:30,sets:[{weight:100,reps:10,type:'normal',completed:true}]}]}
    tx.objectStore('workouts').put(old)
    tx.objectStore('routines').put({id:'units-legacy-routine',name:'Rutina lb',order:0,folderId:null,items:[{exerciseId:'units-legacy-ex',order:0,targetSets:[{weight:50,reps:8}]}]})
    tx.objectStore('settings').put({id:'active_workout',workout:{...old,id:'units-legacy-active',finishedAt:null}})
    tx.objectStore('measurements').put({id:'units-body',date:1,type:'bodyweight',value:100,unit:'kg'})
    tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>reject(tx.error)
   }
  })
 })
 await send('Network.setBlockedURLs',{urls:['https://fonts.googleapis.com/*','https://fonts.gstatic.com/*']})
 await navigate('/workout')
 await waitFor("document.querySelector('input[placeholder=\"Nombre del entreno...\"]')?.value==='Anterior lb'")
 const migration=await inPage(async()=>{
  const{db}=await import('/src/db/db.ts');const{useWorkoutStore}=await import(window.__testStoreUrl)
  return{version:db.verno,old:await db.workouts.get('units-legacy-workout'),routine:await db.routines.get('units-legacy-routine'),active:useWorkoutStore.getState().activeWorkout,settings:await db.settings.get('app')}
 })
 assert.equal(migration.version,5)
 for(const w of [migration.old,migration.active]){
  assert.equal(w.weightUnit,'lb');assert.equal(w.entries[0].sets[0].weightUnit,'lb');assert.equal(w.entries[0].sets[0].weight,100)
 }
 assert.equal(migration.routine.weightUnit,'lb')
 assert.equal(migration.routine.items[0].targetSets[0].weightUnit,'lb')
 assert.equal(migration.settings.legacyWeightUnit,'lb')
 checks.push({migration})
 await inPage(async()=>{
  const{db}=await import('/src/db/db.ts');const{useWorkoutStore}=await import(window.__testStoreUrl)
  await useWorkoutStore.getState().discardWorkout();await db.settings.update('app',{units:'kg'})
 })
 await waitFor("(async()=>{const{useWorkoutStore}=await import(window.__testStoreUrl);return useWorkoutStore.getState().defaultWeightUnit==='kg'})()")
 await inPage((a,b)=>import(window.__testStoreUrl).then(({useWorkoutStore})=>{
  const store=useWorkoutStore.getState();store.startEmptyWorkout('Prueba kg y lb');store.addExercise(a);store.addExercise(b)
 }),exA,exB)
 await navigate('/workout')
 await waitFor("Array.from(document.querySelectorAll('h3')).some(el=>el.textContent==='Extensión de cuádriceps en máquina')")
 await fill(nameA,20,10);await fill(nameB,20,10)
 await openSettings(null);await pick('lb');await rest(90)
 let w=await inPage(()=>import(window.__testStoreUrl).then(({useWorkoutStore})=>useWorkoutStore.getState().activeWorkout))
 assert.equal(w.weightUnit,'lb');near(w.entries[0].sets[0].weight,44.092452437);near(w.entries[1].sets[0].weight,44.092452437)
 await openSettings(nameA);await pick('kg');await rest(45)
 w=await inPage(()=>import(window.__testStoreUrl).then(({useWorkoutStore})=>useWorkoutStore.getState().activeWorkout))
 assert.equal(w.entries[0].weightUnit,'kg');near(w.entries[0].sets[0].weight,20);assert.equal(w.entries[0].restSeconds,45)
 assert.equal(w.entries[1].weightUnit,undefined);near(w.entries[1].sets[0].weight,44.092452437)
 await openSettings(nameA);await pick('global');await closeModal()
 w=await inPage(()=>import(window.__testStoreUrl).then(({useWorkoutStore})=>useWorkoutStore.getState().activeWorkout))
 assert.equal(w.entries[0].weightUnit,undefined);near(w.entries[0].sets[0].weight,44.092452437)
 await openSettings(nameA);await pick('kg');await closeModal()
 await screenshot('mixed-workout-mobile.png')
 await openSettings(nameB);await screenshot('rest-and-units-mobile.png');await closeModal()
 await navigate('/workout')
 w=await inPage(()=>import(window.__testStoreUrl).then(({useWorkoutStore})=>useWorkoutStore.getState().activeWorkout))
 assert.equal(w.entries[0].weightUnit,'kg');assert.equal(w.entries[0].sets[0].weightUnit,'kg');assert.equal(w.entries[1].sets[0].weightUnit,'lb')
 const restResults=await inPage(async()=>{
  const{useWorkoutStore}=await import(window.__testStoreUrl)
  useWorkoutStore.getState().toggleSetCompleted(0,0)
  await new Promise(r=>setTimeout(r,100))
  const first=useWorkoutStore.getState().restTimer?.totalSeconds
  useWorkoutStore.getState().skipRestTimer()
  useWorkoutStore.getState().toggleSetCompleted(1,0)
  await new Promise(r=>setTimeout(r,100))
  const second=useWorkoutStore.getState().restTimer?.totalSeconds
  useWorkoutStore.getState().skipRestTimer()
  return{first,second}
 })
 assert.deepEqual(restResults,{first:45,second:90})
 const finished=await inPage(()=>import(window.__testStoreUrl).then(({useWorkoutStore})=>useWorkoutStore.getState().finishWorkout()))
 const stats=await inPage(async(id,a,b)=>{
  const{db}=await import('/src/db/db.ts');const{workoutVolume,personalRecords,setVolume}=await import('/src/utils/stats.ts')
  const{summarizeWorkout}=await import('/src/utils/workoutSummary.ts')
  const w=await db.workouts.get(id);const map=new Map((await db.exercises.toArray()).map(e=>[e.id,e]))
  return{volume:workoutVolume(w,map,100),a:personalRecords([w],a,'weight_reps',100),b:personalRecords([w],b,'weight_reps',100),summary:summarizeWorkout(w,[w],map,100),assisted:setVolume({weight:20,weightUnit:'lb',reps:10,completed:true,type:'normal'},'bodyweight_assisted',100),bodyweight:setVolume({weight:20,weightUnit:'lb',reps:10,completed:true,type:'normal'},'bodyweight_reps',100)}
 },finished.id,exA,exB)
 near(stats.volume,400);near(stats.a.maxWeight,20);near(stats.b.maxWeight,20);near(stats.summary.totalVolumeKg,400);near(stats.assisted,909.3);near(stats.bodyweight,1090.7)
 checks.push({restResults,stats})
 await navigate('/history/'+finished.id)
 await waitFor("document.body.innerText.includes('20 kg') && document.body.innerText.includes('lb')")
 await screenshot('mixed-history-mobile.png')
 await navigate('/workout/summary/'+finished.id)
 await waitFor("document.getElementById('workout-summary-card')!==null")
 assert.ok(await inPage(()=>document.body.innerText.includes('400')))
 await screenshot('mixed-summary-mobile.png')
 await inPage(async()=>{const{db}=await import('/src/db/db.ts');await db.settings.update('app',{units:'lb'})})
 await navigate('/stats')
 await waitFor("document.body.innerText.includes('220.5 lb')")
 checks.push('Real UI: conversion, per-exercise override/inheritance, reload, rest timer, history, summary and normalized kg/lb statistics')
 await navigate('/routines/units-legacy-routine/edit')
 await waitFor("document.getElementById('routine-name')?.value==='Rutina lb'")
 await openSettings(null);await pick('kg');await rest(90)
 await openSettings('Prueba anterior');await pick('lb');await rest(45)
 await inPage(()=>Array.from(document.querySelectorAll('button')).find(el=>el.textContent.includes('Guardar rutina')).click())
 await waitFor("location.pathname==='/routines'")
 const routine=await inPage(()=>import('/src/db/db.ts').then(({db})=>db.routines.get('units-legacy-routine')))
 assert.equal(routine.weightUnit,'kg');assert.equal(routine.restSeconds,90);assert.equal(routine.items[0].weightUnit,'lb');assert.equal(routine.items[0].restSeconds,45);near(routine.items[0].targetSets[0].weight,50)
 const start=await inPage(()=>import(window.__testStoreUrl).then(({useWorkoutStore})=>useWorkoutStore.getState().startFromRoutine('units-legacy-routine',{force:true})))
 assert.equal(start,true)
 await navigate('/workout');await waitFor("document.body.innerText.includes('Prueba anterior')")
 const activeRoutine=await inPage(()=>import(window.__testStoreUrl).then(({useWorkoutStore})=>useWorkoutStore.getState().activeWorkout))
 assert.equal(activeRoutine.weightUnit,'kg');assert.equal(activeRoutine.entries[0].weightUnit,'lb');assert.equal(activeRoutine.entries[0].restSeconds,45);near(activeRoutine.entries[0].sets[0].weight,50)
 checks.push({routine,activeRoutine})
 const exports=await inPage(async()=>{
  const{db}=await import('/src/db/db.ts');const{buildBackup,importBackupFromText,exportWorkoutsCsv}=await import('/src/utils/exportData.ts')
  const before=await buildBackup()
  const original=URL.createObjectURL
  URL.createObjectURL=blob=>{window.testBlob=blob;return original(blob)}
  await exportWorkoutsCsv()
  const csv=await window.testBlob.text()
  await db.workouts.clear();await db.routines.clear()
  await importBackupFromText(JSON.stringify(before))
  const restored=await buildBackup()
  const legacy={app:'RepLog',version:3,data:{exercises:[],folders:[],routines:[],measurements:[],settings:[{id:'app',units:'lb',healthOnboarded:true,createdAt:1}],workouts:[{id:'import-old',name:'Import lb',startedAt:1,finishedAt:2,routineId:null,notes:'',entries:[{exerciseId:'old',sets:[{weight:80,reps:5,type:'normal',completed:true}]}]}]}}
  await importBackupFromText(JSON.stringify(legacy))
  const imported=await db.workouts.get('import-old')
  await importBackupFromText(JSON.stringify(before))
  return{version:before.version,before:before.data.workouts,restored:restored.data.workouts,imported,csv}
 })
 assert.equal(exports.version,4);assert.deepEqual(exports.before,exports.restored);assert.equal(exports.imported.entries[0].sets[0].weightUnit,'lb');assert.equal(exports.imported.entries[0].sets[0].weight,80)
 assert.ok(exports.csv.includes('unidad_peso'));assert.ok(exports.csv.includes(',kg,'));assert.ok(exports.csv.includes(',lb,'))
 checks.push('Backup v4 restores mixed units; RepLog v3 import preserves lb values; CSV includes units')

 // Enfoques limitados a dos IDs; los demás conservan los checkboxes y su media original.
 await navigate('/exercises')
 const focusIds=await inPage(async()=>{const{catalog}=await import('/src/data/catalog.ts');const{getExerciseFocusDefinition}=await import('/src/data/exerciseFocus.ts');return catalog.filter(e=>getExerciseFocusDefinition(e.id)).map(e=>e.id).sort()})
 assert.deepEqual(focusIds,['calves/lever-seated-squat-calf-raise-on-leg-press-machine','glutes/sled-45-leg-press-side-pov'].sort())
 const openById=async(exerciseId)=>{
  await waitFor("document.querySelector('input[placeholder^=\"Buscar por nombre\"]')!==null")
  const exercise=await inPage(async id=>{const{db}=await import('/src/db/db.ts');return db.exercises.get(id)},exerciseId)
  const expectedUrl=await inPage(async id=>{const{getEffectiveMedia}=await import('/src/utils/effectiveMuscles.ts');const{db}=await import('/src/db/db.ts');return getEffectiveMedia(id,await db.muscleOverrides.get(id)).gifUrl},exerciseId)
  await inPage(name=>{const input=document.querySelector('input[placeholder^="Buscar por nombre"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,name);input.dispatchEvent(new Event('input',{bubbles:true}))},exercise.name)
  await waitFor("Array.from(document.querySelectorAll('h3')).some(e=>e.textContent.trim()==="+JSON.stringify(exercise.name)+")")
  const count=await inPage(name=>Array.from(document.querySelectorAll('h3')).filter(e=>e.textContent.trim()===name).length,exercise.name)
  for(let index=0;index<count;index++){
   await inPage((name,index)=>Array.from(document.querySelectorAll('h3')).filter(e=>e.textContent.trim()===name)[index].click(),exercise.name,index)
   await waitFor("document.querySelector('[aria-label=\"Cerrar detalle\"]')!==null")
   const matches=await inPage(url=>{const root=document.querySelector('[aria-label="Cerrar detalle"]').closest('.max-w-md');return Array.from(root.querySelectorAll('img,image')).some(i=>(i.getAttribute('src')||i.getAttribute('href'))===url)},expectedUrl)
   if(matches){
    if(exerciseId==='calves/lever-seated-squat-calf-raise-on-leg-press-machine'||exerciseId==='glutes/sled-45-leg-press-side-pov'){
     await waitFor("document.querySelector('fieldset input[value=calves]')!==null")
    }
    return exercise
   }
   await inPage(()=>document.querySelector('[aria-label="Cerrar detalle"]').click())
  }
  throw new Error('No matching catalog row for '+exerciseId+' '+exercise.name)
 }
 const focusPresses=[
  ['calves/lever-seated-squat-calf-raise-on-leg-press-machine','horizontal'],
  ['glutes/sled-45-leg-press-side-pov','inclined'],
 ]
 const focusUrl=(mode,focus)=>'/animations/leg-press-user/'+mode+'-'+focus+'-poses.'+(mode==='inclined'&&focus==='quadriceps'?'webp':'jpeg')
 for(const[id,mode]of focusPresses){
  await openById(id)
  assert.equal(await inPage(()=>document.querySelector('[aria-label="Cerrar detalle"]').closest('.max-w-md').querySelectorAll('input[type=checkbox]').length),0)
  for(const focus of ['quadriceps','posterior-chain','calves']){
   await chooseFocus(focus,id)
   const url=focusUrl(mode,focus)
   await waitFor("Array.from(document.querySelectorAll('image')).some(i=>i.getAttribute('href')==="+JSON.stringify(url)+")")
   const loaded=await inPage(url=>new Promise(resolve=>{const i=new Image();i.onload=()=>resolve(i.naturalWidth>0);i.onerror=()=>resolve(false);i.src=url}),url)
   assert.equal(loaded,true)
   const media=await inPage(async id=>{const{getEffectiveMedia}=await import('/src/utils/effectiveMuscles.ts');const{db}=await import('/src/db/db.ts');return getEffectiveMedia(id,await db.muscleOverrides.get(id))},id)
   assert.deepEqual(media.primary,focus==='calves'?['calves']:focus==='quadriceps'?['quadriceps']:['hamstring','gluteal'])
   if(focus==='calves')await screenshot(mode+'-focus-calves.png')
  }
  await inPage(()=>document.querySelector('[aria-label="Cerrar detalle"]').click())
 }
 checks.push('Exactly two bilateral presses offer three focuses, matching images and muscles; no checkboxes in those two details')
 // Los controles anteriores de las unilaterales siguen guardando sus exclusiones.
 const originals=['glutes/lever-horizontal-one-leg-press','glutes/sled-45-degrees-one-leg-press','quads/dumbbell-single-leg-split-squat','quads/lever-leg-extension']
 for(const id of originals){
  await openById(id)
  assert.equal(await inPage(()=>document.querySelector('[aria-label="Cerrar detalle"]').closest('.max-w-md').querySelectorAll('input[type=radio]').length),0)
  const count=await inPage(()=>document.querySelector('[aria-label="Cerrar detalle"]').closest('.max-w-md').querySelectorAll('input[type=checkbox]').length)
  assert.ok(count>0)
  if(id===originals[0]){
   await inPage(()=>document.querySelector('[aria-label="Cerrar detalle"]').closest('.max-w-md').querySelector('input[type=checkbox]').click())
   await new Promise(r=>setTimeout(r,150))
   const override=await inPage(async id=>{const{db}=await import('/src/db/db.ts');return db.muscleOverrides.get(id)},id)
   assert.ok(!override?.focus)
   await screenshot('unilateral-original-checkboxes.png')
  }
  await inPage(()=>document.querySelector('[aria-label="Cerrar detalle"]').click())
 }
 checks.push('Horizontal and inclined unilateral presses, Bulgarian and leg extension retain their original checkboxes; toggling still persists')
 await navigate('/exercises')
 await openById(focusPresses[0][0])
 assert.equal(await inPage(()=>document.querySelector('fieldset input[value=calves]').checked),true)
 await inPage(()=>document.querySelector('[aria-label="Cerrar detalle"]').click())
 // Vista previa desde entrenamiento: misma preferencia y alcance.
 await inPage(id=>import(window.__testStoreUrl).then(({useWorkoutStore})=>{const s=useWorkoutStore.getState();s.startEmptyWorkout('Prueba enfoque');s.addExercise(id)}),focusPresses[0][0])
 await navigate('/workout')
 await waitFor("Array.from(document.querySelectorAll('h3')).some(h=>h.textContent==='Prensa horizontal')")
 await inPage(()=>Array.from(document.querySelectorAll('h3')).find(h=>h.textContent==='Prensa horizontal').click())
 await waitFor("document.querySelector('[aria-labelledby=preview-title] input[value=calves]')?.checked===true")
 await chooseFocus('quadriceps',focusPresses[0][0])
 await screenshot('workout-preview-focus.png')
 await inPage(()=>document.querySelector('[aria-label="Cerrar vista previa"]').click())
 checks.push('Press focus persists after reload and is shared with workout preview and thumbnail')
 // PWA compilada, navegación sin conexión y las seis imágenes.
 const {preview:startPreview}=await import('vite')
 preview=await startPreview({preview:{host:'127.0.0.1',port:4176,strictPort:true}})
 await send('Page.navigate',{url:'http://127.0.0.1:4176/exercises'})
 await waitFor("document.querySelector('input[placeholder^=\"Buscar por nombre\"]')!==null")
 await evaluate("navigator.serviceWorker.ready")
 await send('Page.reload')
 await waitFor("document.querySelector('input[placeholder^=\"Buscar por nombre\"]')!==null&&navigator.serviceWorker.controller!==null")
 const cached=await evaluate("(async()=>{const all=(await Promise.all((await caches.keys()).map(n=>caches.open(n).then(c=>c.keys())))).flat();return all.map(k=>k.url).filter(u=>u.includes('/leg-press-user/'))})()")
 assert.equal(cached.length,6)
 await send('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:0,uploadThroughput:0})
 await send('Page.reload')
 await waitFor("document.querySelector('input[placeholder^=\"Buscar por nombre\"]')!==null")
 for(const[id,mode]of focusPresses){
  // En producción se conserva el orden de los IDs originales por nombre.
  const data=await fs.readFile(path.join(process.cwd(),'src/data/catalog.ts'),'utf8')
  const start=data.indexOf('export const catalog: CatalogExercise[] = ')+ 'export const catalog: CatalogExercise[] = '.length
  const catalog=JSON.parse(data.slice(start,data.lastIndexOf(']')+1))
  const name=catalog.find(e=>e.id===id).name
  await inPage(name=>{const input=document.querySelector('input[placeholder^="Buscar por nombre"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,name);input.dispatchEvent(new Event('input',{bubbles:true}))},name)
  await waitFor("Array.from(document.querySelectorAll('h3')).some(e=>e.textContent.trim()==="+JSON.stringify(name)+")")
  const count=await inPage(name=>Array.from(document.querySelectorAll('h3')).filter(e=>e.textContent.trim()===name).length,name)
  let opened=false
  for(let index=0;index<count;index++){
   await inPage((name,index)=>Array.from(document.querySelectorAll('h3')).filter(e=>e.textContent.trim()===name)[index].click(),name,index)
   await waitFor("document.querySelector('[aria-label=\"Cerrar detalle\"]')!==null")
   if(await evaluate("document.querySelector('[aria-label=\"Cerrar detalle\"]').closest('.max-w-md').querySelector('image[href*=\"/leg-press-user/\"]')!==null")){
    await waitFor("document.querySelector('fieldset input[value=calves]')!==null")
    opened=true;break
   }
   await evaluate("document.querySelector('[aria-label=\"Cerrar detalle\"]').click()")
  }
  assert.ok(opened)
  for(const focus of ['quadriceps','posterior-chain','calves']){
   await evaluate("document.querySelector('input[value="+focus+"]').click()")
   await waitFor("!document.querySelector('fieldset').disabled&&document.querySelector('input[value="+focus+"]')?.checked===true&&Array.from(document.querySelectorAll('image')).some(i=>i.getAttribute('href')==="+JSON.stringify(focusUrl(mode,focus))+")")
   const loaded=await inPage(url=>new Promise(resolve=>{const i=new Image();i.onload=()=>resolve(i.naturalWidth>0);i.onerror=()=>resolve(false);i.src=url}),focusUrl(mode,focus))
   assert.equal(loaded,true)
  }
  await evaluate("document.querySelector('[aria-label=\"Cerrar detalle\"]').click()")
 }
 checks.push('Production PWA precaches six references and both presses can switch all focuses after an offline reload')
 assert.equal(runtimeErrors.length,0)
 await fs.writeFile(path.join(outputDir,'browser-results.json'),JSON.stringify({checks,runtimeErrors},null,2))
 console.log(JSON.stringify({passed:checks.length,runtimeErrors:runtimeErrors.length,outputDir}))
}catch(err){
 await fs.writeFile(path.join(outputDir,'browser-failure.json'),JSON.stringify({error:err.stack,checks,runtimeErrors,trace,body:await evaluate("document.body.innerHTML").catch(()=>null)},null,2))
 const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})
 await fs.writeFile(path.join(outputDir,'failure.png'),Buffer.from(shot.data,'base64'))
 console.error(err);process.exitCode=1
}finally{
 await send('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1}).catch(()=>{})
 if(preview)await new Promise(resolve=>preview.httpServer.close(resolve))
 await send('Browser.close').catch(()=>{})
 socket.close()
 browserProcess.kill()
}
