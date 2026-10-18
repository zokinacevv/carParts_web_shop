// Owner-only local CLI. Never exposed as an unauthenticated HTTP route.
import { readdir } from 'node:fs/promises'
import { quoteDirectory, readQuote, saveQuote, publicQuote } from '../server/quotes.mjs'
const [command,id,...args]=process.argv.slice(2)
if(command==='list') {
 const files=await readdir(quoteDirectory).catch(e=>{if(e.code==='ENOENT')return [];throw e})
 for(const file of files.filter(f=>/^Q-[A-F0-9]{16}\.json$/.test(f))) {const r=await readQuote(file.slice(0,-5));console.log(JSON.stringify({id:r.id,status:r.status,createdAt:r.createdAt,vehicle:r.vehicle,customer:r.customer,items:r.items}))}
} else if(command==='show') {
 const r=await readQuote(id||'');if(!r)throw Error('Quote not found');console.log(JSON.stringify(publicQuote(r),null,2))
} else if(command==='offer') {
 const r=await readQuote(id||'');if(!r)throw Error('Quote not found')
 if(r.status==='ACCEPTED')throw Error('Accepted quotes cannot be changed')
 const prices=(args[0]||'').split(',').map(Number),delivery=Number(args[1]||0),days=Number(args[2]||7)
 if(prices.length!==r.items.length||prices.some(p=>!Number.isFinite(p)||p<=0)||!Number.isFinite(delivery)||delivery<0||!Number.isInteger(days)||days<1||days>90)throw Error('Provide one positive unit price per requested item, delivery >= 0 and validity 1–90 days')
 const items=r.items.map((item,i)=>({...item,unitPrice:Math.round(prices[i]*100)/100}))
 const subtotal=Math.round(items.reduce((n,item)=>n+item.unitPrice*item.quantity,0)*100)/100
 r.offer={items,currency:'MKD',subtotal,deliveryFee:Math.round(delivery*100)/100,total:Math.round((subtotal+delivery)*100)/100,validUntil:new Date(Date.now()+days*86400000).toISOString(),notes:args[3]||''}
 r.status='OFFERED';r.updatedAt=new Date().toISOString();await saveQuote(r);console.log(`Offer saved: ${r.id}, total ${r.offer.total} MKD`)
} else {console.log('node scripts/quotes.mjs list\nnode scripts/quotes.mjs show Q-ID\nnode scripts/quotes.mjs offer Q-ID 1200,3500 150 7 "Optional note"')}
