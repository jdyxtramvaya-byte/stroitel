import {useMemo,useState} from 'react'
import {Check,Trash2,Wrench,Package} from 'lucide-react'

type Room={id:string,name:string,length:number,width:number,height:number}
type Work={id:string,name:string,roomIds:string[],thickness:number,coats:number,reserve:number,done:boolean}
type Material={id:string,name:string,unit:string,qty:number,price:number,bought:boolean,packageSize?:number,packageUnit?:string,packages?:number}
type Project={rooms:Room[],materials:Material[],works?:Work[]}

const presets=[
 {name:'Стяжка пола',kind:'floor'},
 {name:'Штукатурка стен',kind:'wall'},
 {name:'Шпаклёвка стен',kind:'wall'},
 {name:'Покраска стен',kind:'paint'},
 {name:'Укладка плитки',kind:'tile'}
] as const

const packaging:Record<string,{size:number,unit:string}>={
 'Сухая смесь для стяжки|кг':{size:25,unit:'мешок'},
 'Штукатурная смесь|кг':{size:30,unit:'мешок'},
 'Шпаклёвка|кг':{size:20,unit:'мешок'},
 'Грунтовка|л':{size:10,unit:'канистра'},
 'Краска|л':{size:10,unit:'ведро'},
 'Плитка|м²':{size:1.44,unit:'коробка'},
 'Плиточный клей|кг':{size:25,unit:'мешок'}
}

const calc=(work:Work,rooms:Room)=>{
 const selected=rooms.filter(r=>work.roomIds.includes(r.id))
 const floor=selected.reduce((s,r)=>s+r.length*r.width,0)
 const wall=selected.reduce((s,r)=>s+2*(r.length+r.width)*r.height,0)
 const reserve=1+work.reserve/100
 if(work.name==='Стяжка пола')return [{name:'Сухая смесь для стяжки',unit:'кг',qty:floor*(work.thickness/10)*20*reserve}]
 if(work.name==='Штукатурка стен')return [{name:'Штукатурная смесь',unit:'кг',qty:wall*work.thickness*1.2*reserve},{name:'Грунтовка',unit:'л',qty:wall*0.15*reserve}]
 if(work.name==='Шпаклёвка стен')return [{name:'Шпаклёвка',unit:'кг',qty:wall*work.thickness*1*reserve},{name:'Грунтовка',unit:'л',qty:wall*0.12*reserve}]
 if(work.name==='Покраска стен')return [{name:'Краска',unit:'л',qty:wall*0.18*work.coats*reserve},{name:'Грунтовка',unit:'л',qty:wall*0.12*reserve}]
 if(work.name==='Укладка плитки')return [{name:'Плитка',unit:'м²',qty:wall*reserve},{name:'Плиточный клей',unit:'кг',qty:wall*4.5*reserve}]
 return []
}

const pack=(name:string,unit:string,qty:number)=>{
 const p=packaging[name+'|'+unit]
 if(!p)return {packages:0,purchaseQty:qty,packageSize:undefined,packageUnit:undefined}
 const packages=Math.ceil(qty/p.size)
 return {packages,purchaseQty:packages*p.size,packageSize:p.size,packageUnit:p.unit}
}

export default function WorkPlanner({project,onUpdate}:{project:Project,onUpdate:(x:Partial<Project>)=>void}){
 const works=project.works??[]
 const [name,setName]=useState('Стяжка пола')
 const [roomIds,setRoomIds]=useState<string[]>(project.rooms[0]?[project.rooms[0].id]:[])
 const [thickness,setThickness]=useState('50')
 const [coats,setCoats]=useState('2')
 const [reserve,setReserve]=useState('10')

 const totals=useMemo(()=>{
  const map=new Map<string,{unit:string,qty:number}>()
  works.forEach(w=>calc(w,project.rooms).forEach(m=>{
   const key=m.name+'|'+m.unit
   const old=map.get(key)
   map.set(key,{unit:m.unit,qty:(old?.qty??0)+m.qty})
  }))
  return [...map.entries()].map(([key,v])=>({name:key.split('|')[0],...v}))
 },[works,project.rooms])

 const syncMaterials=()=>{
  const calculated=totals.map(m=>({...m,...pack(m.name,m.unit,m.qty)}))
  const next=project.materials.map(m=>{
   const found=calculated.find(x=>x.name===m.name&&x.unit===m.unit)
   return found?{...m,qty:found.purchaseQty,packageSize:found.packageSize,packageUnit:found.packageUnit,packages:found.packages}:m
  })
  calculated.filter(x=>!project.materials.some(m=>m.name===x.name&&m.unit===x.unit)).forEach(x=>next.push({id:crypto.randomUUID(),name:x.name,unit:x.unit,qty:x.purchaseQty,price:0,bought:false,packageSize:x.packageSize,packageUnit:x.packageUnit,packages:x.packages}))
  onUpdate({materials:next})
 }

 const add=()=>{
  if(!name||roomIds.length===0)return
  const work={id:crypto.randomUUID(),name,roomIds,thickness:+thickness||10,coats:+coats||1,reserve:+reserve||0,done:false}
  onUpdate({works:[...works,work]})
 }

 const toggleRoom=(id:string)=>setRoomIds(v=>v.includes(id)?v.filter(x=>x!==id):[...v,id])

 return <section className="work-planner">
  <div className="section-title"><div><h2>Что сделать</h2><span>Работы автоматически превращаются в расчёт материалов.</span></div><Wrench size={22}/></div>
  {project.rooms.length===0?<div className="empty compact"><b>Сначала добавь помещение</b><p>После замеров здесь можно назначать работы.</p></div>:<>
   <div className="form-card">
    <label>Работа<select value={name} onChange={e=>setName(e.target.value)}>{presets.map(p=><option key={p.name}>{p.name}</option>)}</select></label>
    <label>Помещения</label>
    <div className="room-picker">{project.rooms.map(r=><button type="button" className={roomIds.includes(r.id)?'selected':''} key={r.id} onClick={()=>toggleRoom(r.id)}><span>{roomIds.includes(r.id)&&<Check size={14}/>}</span>{r.name}</button>)}</div>
    <div className="grid3"><label>Толщина, мм<input inputMode="decimal" value={thickness} onChange={e=>setThickness(e.target.value)}/></label><label>Слоёв<input inputMode="numeric" value={coats} onChange={e=>setCoats(e.target.value)}/></label><label>Запас, %<input inputMode="numeric" value={reserve} onChange={e=>setReserve(e.target.value)}/></label></div>
    <button className="primary wide" onClick={add} disabled={!roomIds.length}>Добавить работу</button>
   </div>
   {works.length>0&&<div className="work-list">{works.map(w=><div className="work-card" key={w.id}><div><b>{w.name}</b><small>{project.rooms.filter(r=>w.roomIds.includes(r.id)).map(r=>r.name).join(', ')}</small>{calc(w,project.rooms).map(m=><span key={m.name}>{m.name}: {m.qty.toFixed(1)} {m.unit}</span>)}</div><div className="work-actions"><button className="icon-btn" onClick={()=>onUpdate({works:works.map(x=>x.id===w.id?{...x,done:!x.done}:x)})}>{w.done?<Check size={17}/>:<span>○</span>}</button><button className="icon-btn danger" onClick={()=>onUpdate({works:works.filter(x=>x.id!==w.id)})}><Trash2 size={16}/></button></div></div>)}</div>}
   <div className="section-title"><div><h2>Материалы по работам</h2><span>Количество округляется до целой упаковки.</span></div><button className="link" onClick={syncMaterials}>Добавить в материалы</button></div>
   <div className="material-list">{totals.length===0?<div className="empty compact"><b>Добавь первую работу</b></div>:totals.map(m=>{const p=pack(m.name,m.unit,m.qty);return <div className="material-row" key={m.name}><div><b>{m.name}</b><span>Нужно {m.qty.toFixed(1)} {m.unit} · купить {p.packages||'—'} {p.packageUnit||m.unit}</span></div><strong>{p.purchaseQty.toFixed(1)} {m.unit}</strong><Package size={17}/></div>})}</div>
  </>}
 </section>
}
