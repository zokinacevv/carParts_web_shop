import { randomBytes, createHash, timingSafeEqual } from 'node:crypto'
import { mkdir, readFile, writeFile, rename } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { vehicleMakes } from './vehicle-catalog.mjs'
export const quoteDirectory = process.env.QUOTE_DATA_DIR || fileURLToPath(new URL('./data/quotes/', import.meta.url))
const hash = value => createHash('sha256').update(value).digest('hex')
const text = (value,max=200) => typeof value === 'string' ? value.trim().slice(0,max) : ''
export function validateQuote(input) {
 const vehicle = input?.vehicle || {}, customer = input?.customer || {}
 if (!Object.hasOwn(vehicleMakes,vehicle.make)) throw Error('Избери една од шесте марки.')
 const year = Number(vehicle.year)
 if (!text(vehicle.model) || !Number.isInteger(year) || year < 1900 || year > new Date().getFullYear()+1) throw Error('Внеси модел и валидна година.')
 const vin = text(vehicle.vin,30).toUpperCase()
 if (vin && !/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)) throw Error('VIN бројот треба да има 17 знаци, без I, O и Q. За постаро возило внеси број на шасија во напомената.')
 if (!text(customer.name) || !/^[+\d\s()/.-]{6,30}$/.test(text(customer.phone,30))) throw Error('Внеси име и валиден телефон.')
 const email = text(customer.email,254)
 if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw Error('Внеси валидна е-пошта.')
 if (!Array.isArray(input.items) || input.items.length < 1 || input.items.length > 30) throw Error('Додај од 1 до 30 делови.')
 const items = input.items.map(item=>{
  if (!text(item.name) || !Number.isInteger(item.quantity) || item.quantity<1 || item.quantity>100) throw Error('Секој дел мора да има име и количина од 1 до 100.')
  return {name:text(item.name),quantity:item.quantity,partNumber:text(item.partNumber,100),condition:['NEW','USED','ANY'].includes(item.condition)?item.condition:'ANY',notes:text(item.notes,1000)}
 })
 return {vehicle:{make:vehicle.make,model:text(vehicle.model),submodel:text(vehicle.submodel),year,engine:text(vehicle.engine),generation:text(vehicle.generation),fuel:text(vehicle.fuel,40),vin},customer:{name:text(customer.name),phone:text(customer.phone,30),email},items,notes:text(input.notes,2000)}
}
export async function createQuote(input) {
 const clean=validateQuote(input), id=`Q-${randomBytes(8).toString('hex').toUpperCase()}`, token=randomBytes(24).toString('hex')
 const record={id,tokenHash:hash(token),createdAt:new Date().toISOString(),status:'REQUESTED',...clean,offer:null}
 await mkdir(quoteDirectory,{recursive:true,mode:0o700})
 await writeFile(join(quoteDirectory,`${id}.json`),JSON.stringify(record,null,2),{flag:'wx',mode:0o600})
 return {id,token,status:record.status}
}
export async function readQuote(id) {
 if (!/^Q-[A-F0-9]{16}$/.test(id)) return null
 try {return JSON.parse(await readFile(join(quoteDirectory,`${id}.json`),'utf8'))}catch(e){if(e.code==='ENOENT')return null;throw e}
}
export function canReadQuote(record,token) {
 return typeof token==='string' && token.length<=100 && timingSafeEqual(Buffer.from(record.tokenHash,'hex'),Buffer.from(hash(token),'hex'))
}
export function publicQuote(record) {const {tokenHash,...data}=record;void tokenHash;return data}
export async function saveQuote(record) {
 const path=join(quoteDirectory,`${record.id}.json`),tmp=`${path}.${randomBytes(6).toString('hex')}.tmp`
 await writeFile(tmp,JSON.stringify(record,null,2),{mode:0o600});await rename(tmp,path)
}
