import { useId, useMemo, useState } from 'react'
type Props={make:string;models:string[];submodels:Record<string,string[]>;value:string;onChange:(value:string)=>void;label?:string;placeholder?:string;selectionKey?:string}
export default function ModelPicker(props:Props){
 return <ModelSelect key={props.selectionKey??props.make} {...props}/>
}

function ModelSelect({make,models,submodels,value,onChange,label="Модел / подмодел *",placeholder="Избери подмодел"}:Props){
 const [manual,setManual]=useState(false)
 const id=useId()
 const entries=useMemo(()=>{
  const seen=new Set<string>(),all:string[]=[]
  for(const model of models){
   for(const name of [model,...(submodels[model]||[])]){
    const clean=name.normalize('NFKC').trim().replace(/\s+/g,' ')
    const key=clean.toLocaleLowerCase()
    if(clean&&!seen.has(key)){all.push(clean);seen.add(key)}
   }
  }
  return all
 },[models,submodels])
 const manualEntry=manual||Boolean(value&&!entries.includes(value))
 return <label htmlFor={id}>
  {label}
  <select id={id} required disabled={!make} value={manualEntry?'__manual':value} onChange={e=>{
   const isManual=e.target.value==='__manual'
   setManual(isManual)
   onChange(isManual?'':e.target.value)
  }}>
   <option value="">{make?placeholder:'Прво избери модел'}</option>
   {entries.map(entry=><option key={entry} value={entry}>{entry}</option>)}
   <option value="__manual">Друг подмодел — внеси рачно</option>
  </select>
  {manualEntry&&<input required disabled={!make} aria-label="Внеси подмодел" value={value} onChange={e=>onChange(e.target.value)} placeholder="Внеси подмодел" maxLength={200}/>}
 </label>
}
