import { vehicleSubmodels } from './vehicle-submodels.mjs'
import { vehicleMakes, partGroups } from './vehicle-catalog.mjs'
// Adapter contract for a supplier gateway. This does not pretend to speak TecDoc's proprietary API.
const allowedMakes = Object.keys(vehicleMakes)
let cached = null
let expires = 0
let pending = null
function validate(data) {
 if (!data || !data.makes || !Array.isArray(data.partGroups)) throw Error('Invalid catalog contract')
 for (const make of allowedMakes) {
  if (!Array.isArray(data.makes[make]) || data.makes[make].length < 1 || data.makes[make].some(model=>typeof model!=='string'||!model.trim()||model.length>200)) throw Error(`Missing model list: ${make}`)
 }
 if (data.partGroups.some(group=>typeof group.name!=='string'||!Array.isArray(group.parts)||group.parts.some(part=>typeof part!=='string'||!part.trim()||part.length>200))) throw Error('Invalid part groups')
 const submodels = {}
 if (data.submodels !== undefined) {
  if (!data.submodels || typeof data.submodels !== 'object' || Array.isArray(data.submodels)) throw Error('Invalid submodel catalog')
  for (const make of allowedMakes) {
   const families = data.submodels[make] || {}
   if (typeof families !== 'object' || Array.isArray(families)) throw Error('Invalid submodel families')
   submodels[make] = {}
   for (const [model, variants] of Object.entries(families)) {
    if (!data.makes[make].includes(model) || !Array.isArray(variants) || variants.some(v=>typeof v!=='string'||!v.trim()||v.length>200)) throw Error('Invalid submodel list')
    submodels[make][model] = [...new Set(variants)]
   }
  }
 }
 return {makes:Object.fromEntries(allowedMakes.map(make=>[make,[...new Set(data.makes[make])].sort()])),partGroups:data.partGroups,submodels,meta:{coverage:'SUPPLIER_CATALOG',exhaustive:data.exhaustive===true,manualEntry:true,source:typeof data.source==='string'?data.source.slice(0,200):'Добавувач'}}
}
export async function getRequestCatalog() {
 if (!process.env.CATALOG_API_URL) return {makes:vehicleMakes,partGroups,submodels:vehicleSubmodels,meta:{coverage:'PUBLIC_VEHICLE_GUIDES',exhaustive:false,manualEntry:true,source:'mobile.de јавни страници и дополнителни модели', sourceUrl:'https://www.mobile.de/auto/', retrievedAt:'2026-10-14'}}
 if(cached && Date.now()<expires)return cached
 if(pending)return pending
 pending=(async()=>{
  const url=new URL(process.env.CATALOG_API_URL)
  if(url.protocol!=='https:' && !(['localhost','127.0.0.1'].includes(url.hostname)&&url.protocol==='http:'))throw Error('Catalog requires HTTPS')
  const response=await fetch(url,{headers:process.env.CATALOG_API_TOKEN?{Authorization:`Bearer ${process.env.CATALOG_API_TOKEN}`}:{},signal:AbortSignal.timeout(10000),redirect:'error'})
  if(!response.ok)throw Error('Catalog upstream failed')
  const raw=await response.text();if(raw.length>10000000)throw Error('Catalog too large')
  cached=validate(JSON.parse(raw));expires=Date.now()+15*60000;return cached
 })()
 try{return await pending}finally{pending=null}
}
