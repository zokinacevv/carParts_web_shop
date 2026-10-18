import test from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtemp, rm, readdir, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const sample = { vehicle:{make:'BMW',model:'Unlisted custom historic model',submodel:'320',year:1985,engine:'2.0',vin:''},customer:{name:'Test Customer',phone:'070123456',email:'test@example.com'},items:[{name:'Специфичен заменлив дел',quantity:2,partNumber:'OEM-123',condition:'USED',notes:'Лево'},{name:'Ретровизор',quantity:1,condition:'NEW'}],notes:'Test only' }
async function start(directory) {
 const child=spawn(process.execPath,['server/index.mjs'],{env:{...process.env,API_PORT:'0',QUOTE_DATA_DIR:directory,CATALOG_API_URL:''},stdio:['ignore','pipe','pipe']})
 const base=await new Promise((resolve,reject)=>{let output='';const timer=setTimeout(()=>{child.kill();reject(Error('API startup timed out'))},10000);child.stdout.on('data',data=>{output+=data;const match=output.match(/http:\/\/127\.0\.0\.1:\d+/);if(match){clearTimeout(timer);resolve(match[0])}});child.once('error',e=>{clearTimeout(timer);reject(e)});child.once('exit',code=>{clearTimeout(timer);reject(Error(`API exited ${code}`))})})
 return {child,base,stop:()=>new Promise(resolve=>{child.once('exit',resolve);child.kill()})}
}
async function cli(directory,...args) {
 const child=spawn(process.execPath,['scripts/quotes.mjs',...args],{env:{...process.env,QUOTE_DATA_DIR:directory},stdio:['ignore','pipe','pipe']})
 return new Promise((resolve,reject)=>{let output='';child.stdout.on('data',d=>output+=d);child.stderr.on('data',d=>output+=d);child.once('error',reject);child.once('exit',code=>code===0?resolve(output):reject(Error(output)))})
}
test('request → persisted → private lookup → priced offer → acceptance',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'zona-quotes-test-'));let api
 try {
  api=await start(directory)
  const call=(path,options={})=>fetch(`${api.base}/api/v1/${path}`,options)
  const post=body=>call('quotes',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)})
  const vehicles=await call('vehicles').then(r=>r.json());assert.equal(Object.keys(vehicles.data).length,6);assert.equal(vehicles.meta.exhaustive,false);assert(vehicles.submodels.BMW['3 Series'].includes('3 Series 320d'));assert(!vehicles.submodels.Volkswagen['3 Series'])
  const groups=await call('part-groups').then(r=>r.json());assert.equal(groups.data.length,12)
  for(const invalid of [{...sample,vehicle:{...sample.vehicle,make:'Unsupported'}},{...sample,vehicle:{...sample.vehicle,year:1800}},{...sample,vehicle:{...sample.vehicle,vin:'bad'}},{...sample,items:[]},{...sample,items:[{name:'Bad',quantity:-1}]},{...sample,customer:{...sample.customer,phone:'bad'}}])assert.equal((await post(invalid)).status,422)
  assert.equal((await readdir(directory)).length,0)
  const r=await post(sample);assert.equal(r.status,201);const {data:ref}=await r.json();assert.match(ref.id,/^Q-[A-F0-9]{16}$/);assert.equal(ref.token.length,48)
  const file=await readFile(join(directory,`${ref.id}.json`),'utf8');assert(!file.includes(ref.token));assert(file.includes('tokenHash'))
  assert.equal((await call(`quotes/${ref.id}`)).status,404)
  assert.equal((await call(`quotes/${ref.id}`,{headers:{Authorization:'Bearer wrong'}})).status,404)
  const auth={Authorization:`Bearer ${ref.token}`}
  const read=await call(`quotes/${ref.id}`,{headers:auth});assert.equal(read.status,200);assert.equal(read.headers.get('cache-control'),'no-store');const pending=await read.json();assert.equal(pending.data.status,'REQUESTED');assert(!('tokenHash' in pending.data));assert.equal(pending.data.vehicle.model,sample.vehicle.model);assert.equal(pending.data.vehicle.submodel,"320")
  assert.equal((await call(`quotes/${ref.id}/accept`,{method:'POST',headers:auth})).status,409)
  await api.stop();api=await start(directory)
  assert.equal((await call(`quotes/${ref.id}`,{headers:auth})).status,200)
  await assert.rejects(cli(directory,'offer',ref.id,'100','150','7'))
  await cli(directory,'offer',ref.id,'1200,3500','150','7','Test offer')
  const offered=await call(`quotes/${ref.id}`,{headers:auth}).then(r=>r.json());assert.equal(offered.data.status,'OFFERED');assert.equal(offered.data.offer.total,6050)
  assert.equal((await call(`quotes/${ref.id}/accept`,{method:'POST',headers:{Authorization:'Bearer wrong'}})).status,404)
  const accepted=await call(`quotes/${ref.id}/accept`,{method:'POST',headers:auth}).then(r=>r.json());assert.equal(accepted.data.status,'ACCEPTED');assert(accepted.data.acceptedAt)
  assert.equal((await call(`quotes/${ref.id}/accept`,{method:'POST',headers:auth})).status,409)
  await assert.rejects(cli(directory,'offer',ref.id,'1200,3500','150','7'))
  const expiredRef=(await (await post(sample)).json()).data
  await cli(directory,'offer',expiredRef.id,'100,100','0','1')
  const {writeFile}=await import('node:fs/promises')
  const expiredPath=join(directory,`${expiredRef.id}.json`),record=JSON.parse(await readFile(expiredPath,'utf8'))
  record.offer.validUntil='2000-01-01T00:00:00.000Z';await writeFile(expiredPath,JSON.stringify(record))
  assert.equal((await call(`quotes/${expiredRef.id}/accept`,{method:'POST',headers:{Authorization:`Bearer ${expiredRef.token}`}})).status,409)
 }finally{if(api)await api.stop();await rm(directory,{recursive:true,force:true})}
})
test('supplier adapter validates contract, caches and keeps bearer token server-side',async()=>{
 const originalFetch=globalThis.fetch,previousURL=process.env.CATALOG_API_URL,previousToken=process.env.CATALOG_API_TOKEN
 try {
  process.env.CATALOG_API_URL='https://supplier.example/catalog';process.env.CATALOG_API_TOKEN='test-server-token'
  const {vehicleMakes,partGroups}=await import('./vehicle-catalog.mjs')
  let calls=0
  globalThis.fetch=async(url,options)=>{calls++;assert.equal(String(url),'https://supplier.example/catalog');assert.equal(options.headers.Authorization,'Bearer test-server-token');return new Response(JSON.stringify({makes:vehicleMakes,partGroups,submodels:{BMW:{'3 Series':['3 Series Supplier Variant']}},exhaustive:false,source:'Test gateway'}),{status:200})}
  const {getRequestCatalog}=await import(`./catalog-provider.mjs?test=${Date.now()}`)
  const first=await getRequestCatalog(),second=await getRequestCatalog();assert.equal(calls,1);assert.equal(first,second);assert.equal(first.meta.source,'Test gateway');assert.deepEqual(first.submodels.BMW['3 Series'],['3 Series Supplier Variant']);assert(!JSON.stringify(first).includes('test-server-token'))
  globalThis.fetch=async()=>new Response(JSON.stringify({makes:{BMW:['3 Series']},partGroups:[]}),{status:200})
  const bad=await import(`./catalog-provider.mjs?bad=${Date.now()}`);await assert.rejects(bad.getRequestCatalog())
 }finally{globalThis.fetch=originalFetch;if(previousURL===undefined)delete process.env.CATALOG_API_URL;else process.env.CATALOG_API_URL=previousURL;if(previousToken===undefined)delete process.env.CATALOG_API_TOKEN;else process.env.CATALOG_API_TOKEN=previousToken}
})

test('every imported mobile.de series and submodel is available under its own make', async()=>{
 const {default:snapshot}=await import('./data/mobile-vehicles.json',{with:{type:'json'}})
 const {vehicleMakes}=await import('./vehicle-catalog.mjs')
 const {vehicleSubmodels}=await import('./vehicle-submodels.mjs')
 assert.equal(snapshot.series.length,151)
 assert.equal(snapshot.series.reduce((count,series)=>count+series.submodels.length,0),486)
 assert.deepEqual([...new Set(snapshot.series.map(series=>series.make))].sort(),['Audi','BMW','Mercedes-Benz','Porsche','SEAT','Volkswagen'])
 for(const series of snapshot.series){
  assert(vehicleMakes[series.make].includes(series.model),`${series.make} / ${series.model}`)
  assert(series.source.startsWith('https://www.mobile.de/auto/'))
  for(const variant of series.submodels){assert(vehicleSubmodels[series.make][series.model].includes(variant));assert(variant.length<=200)}
 }
 assert(vehicleSubmodels.BMW['1 Series'].some(variant=>variant.includes('F40')))
 assert(vehicleSubmodels['Mercedes-Benz']['E-Class'].length>0)
 assert(vehicleSubmodels.Audi.A3.length>0)
 assert(vehicleSubmodels.Volkswagen.Passat.length>0)
 assert(vehicleSubmodels.SEAT.Ibiza.length>0)
 assert(vehicleSubmodels.Porsche.Cayenne.length>0)
})
