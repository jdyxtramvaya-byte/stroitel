import {MATERIAL_CATALOG,getMaterialSpec} from './materialCatalog'
import {useMemo,useState} from 'react'
import {Check,Trash2,Wrench,Package} from 'lucide-react'

type Room={id:string,name:string,length:number,width:number,height:number}
type Work={id:string,name:string,roomIds:string[],thickness:number,coats:number,reserve:number,done:boolean}
type Product={id:string,name:string,brand:string,unit:string,packSize:number,packUnit:string,consumption:number,consumptionUnit:string}
type Material={id:string,name:string,unit:string,qty:number,price:number,bought:boolean,packageSize?:number,packageUnit?:string,packages?:number}
type Project={rooms:Room[],materials:Material[],works?:Work[]}

const products:Record<string,Product[]>= {
 'Стяжка пола':[{id:'screed-standard',name:'Сухая смесь для стяжки',brand:'Стандарт',unit:'кг',packSize:25,packUnit:'мешок',consumption:20,consumptionUnit:'кг/м²/см'}],
 'Штукатурка стен':[{id:'knauf-mp75',name:'MP 75',brand:'Knauf',unit:'кг',packSize:30,packUnit:'мешок',consumption:0.9,consumptionUnit:'кг/м²/мм'},{id:'volma-sloy',name:'Слой',brand:'ВОЛМА',unit:'кг',packSize:30,packUnit:'мешок',consumption:0.9,consumptionUnit:'кг/м²/мм'}],
 'Шпаклёвка стен':[{id:'putty-standard',name:'Шпаклёвка',brand:'Стандарт',unit:'кг',packSize:20,packUnit:'мешок',consumption:1,consumptionUnit:'кг/м²/мм'}],
 'Покраска стен':[{id:'paint-standard',name:'Интерьерная краска',brand:'Стандарт',unit:'л',packSize:10,packUnit:'ведро',consumption:0.18,consumptionUnit:'л/м²/слой'}],
 'Укладка плитки':[{id:'tile-standard',name:'Плитка',brand:'Стандарт',unit:'м²',packSize:1.44,packUnit:'коробка',consumption:1,consumptionUnit:'м²/м²'},{id:'tile-glue-standard',name:'Плиточный клей',brand:'Стандарт',unit:'кг',packSize:25,packUnit:'мешок',consumption:3.5,consumptionUnit:'кг/м²'}]
}

const presets=[
 {name:'Стяжка пола',kind:'floor'},
 {name:'Штукатурка стен',kind:'wall'},
 {name:'Шпаклёвка стен',kind:'wall'},
 {name:'Покраска стен',kind:'paint'},
 {name:'Укладка плитки',kind:'tile'}
] as const

const materialAliases:Record<string,string>={'MP 75':'Штукатурная смесь','Слой':'Штукатурная смесь','Интерьерная краска':'Краска'}
const getSpec=(name:string,unit:string)=>getMaterialSpec(name,unit)??getMaterialSpec(materialAliases[name]??'',unit)

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
 if(work.name==='Стяжка пола')return [{name:work.product?.name||'Сухая смесь для стяжки',unit:work.product?.unit||'кг',qty:floor*(work.thickness/10)*(work.product?.consumption||20)*reserve}]
 if(work.name==='Штукатурка стен')return [{name:work.product?.name||'Штукатурная смесь',unit:work.product?.unit||'кг',qty:wall*work.thickness*(work.product?.consumption||0.9)*reserve},{name:'Грунтовка',unit:'л',qty:wall*0.15*reserve}]
 if(work.name==='Шпаклёвка стен')return [{name:work.product?.name||'Шпаклёвка',unit:work.product?.unit||'кг',qty:wall*work.thickness*(work.product?.consumption||1)*reserve},{name:'Грунтовка',unit:'л',qty:wall*0.12*reserve}]
 if(work.name==='Покраска стен')return [{name:work.product?.name||'Краска',unit:work.product?.unit||'л',qty:wall*(work.product?.consumption||0.18)*work.coats*reserve},{name:'Грунтовка',unit:'л',qty:wall*0.12*reserve}]
 if(work.name==='Укладка плитки')return [{name:'Плитка',unit:'м²',qty:wall*reserve},{name:'Плиточный клей',unit:'кг',qty:wall*3.5*reserve}]
 return []
}

const pack=(name:string,unit:string,qty:number)=>{
 const spec=getSpec(name,unit)
 const p=packaging[name+'|'+unit]??(spec?{size:spec.packageSize,unit:spec.packageUnit}:undefined)
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
 const [productId,setProductId]=useState('')
 const productOptions=products[name]??[]
 const product=productOptions.find(x=>x.id===productId)??productOptions[0]

 const totals=useMemo(()=>{
  const map=new Map<string,{unit:string,qty:number}>()
  works.forEach(w=>calc(w,project.rooms).forEach(m=>{
   const key=m.name+'|'+m.unit
   const old=map.get(key)
   map.set(key,{unit:m.unit,qty:(old?.qty??0)+m.qty})
  }))
  return [...map.entries()].map(([key,v])=>({name:key.split('|')[0],...v}))
 },[works,project.rooms])

 const materialsFor=(workList:Work[])=>{
  const map=new Map<string,{unit:string,qty:number}>()
  workList.forEach(w=>calc(w,project.rooms).forEach(m=>{
   const key=m.name+'|'+m.unit,old=map.get(key)
   map.set(key,{unit:m.unit,qty:(old?.qty??0)+m.qty})
  }))
  const calculated=[...map.entries()].map(([key,v])=>({name:key.split('|')[0],...v,...pack(key.split('|')[0],v.unit,v.qty)}))
  const next=project.materials.map(m=>{
   const found=calculated.find(x=>x.name===m.name&&x.unit===m.unit)
   if(!found)return m
   const spec=getSpec(m.name,m.unit)
   return {...m,qty:found.purchaseQty,price:m.price>0?m.price:(spec?.price??0),packageSize:found.packageSize??spec?.packageSize,packageUnit:found.packageUnit??spec?.packageUnit,packages:found.packages||(spec?Math.ceil(found.purchaseQty/spec.packageSize):m.packages)}
  })
  calculated.filter(x=>!project.materials.some(m=>m.name===x.name&&m.unit===x.unit)).forEach(x=>{
   const spec=getSpec(x.name,x.unit)
   next.push({id:crypto.randomUUID(),name:x.name,unit:x.unit,qty:x.purchaseQty,price:spec?.price??0,bought:false,packageSize:x.packageSize??spec?.packageSize,packageUnit:x.packageUnit??spec?.packageUnit,packages:x.packages||(spec?Math.ceil(x.purchaseQty/spec.packageSize):undefined)})
  })
  return next
 }
 const syncMaterials=()=>onUpdate({materials:materialsFor(works)})

 const add=()=>{
  const selected=productOptions.find(x=>x.id===productId)??productOptions[0]
  if(!name||roomIds.length===0||!selected)return
  const work={id:crypto.randomUUID(),name,roomIds,thickness:+thickness||10,coats:+coats||1,reserve:+reserve||0,done:false,productId:selected.id,product:selected}
  const nextWorks=[...works,work]
  onUpdate({works:nextWorks,materials:materialsFor(nextWorks)})
 }

 const toggleRoom=(id:string)=>setRoomIds(v=>v.includes(id)?v.filter(x=>x!==id):[...v,id])

 return <section className="work-planner compact-module"><div className="module-hero"><div><span className="section-kicker">РАБОТЫ</span><h2>Работы</h2><p>{works.length} операций · расчёт материалов автоматически.</p></div><Wrench size={22}/></div>
  <div className="section-title"><div><h2>Что сделать</h2><span>Работы автоматически превращаются в расчёт материалов.</span></div><Wrench size={22}/></div>
  {project.rooms.length===0?<div className="empty compact"><b>Сначала добавь помещение</b><p>После замеров здесь можно назначать работы.</p></div>:<>
   <details className="work-add-details"><summary><Plus size={16}/> Добавить работу</summary><div className="form-card">
    <label>Работа<select value={name} onChange={e=>setName(e.target.value)}>{presets.map(p=><option key={p.name}>{p.name}</option>)}</select></label>
    <label>Конкретный материал<select value={productId||product?.id||''} onChange={e=>setProductId(e.target.value)}>{productOptions.map(p=><option key={p.id} value={p.id}>{p.brand} · {p.name} · {p.packSize} {p.unit}/{p.packUnit}</option>)}</select></label>
    {product&&<div className="info-box">Норма расхода: {product.consumption} {product.consumptionUnit}</div>}
    <label>Помещения</label>
    <div className="room-picker">{project.rooms.map(r=><button type="button" className={roomIds.includes(r.id)?'selected':''} key={r.id} onClick={()=>toggleRoom(r.id)}><span>{roomIds.includes(r.id)&&<Check size={14}/>}</span>{r.name}</button>)}</div>
    <div className="grid3"><label>Толщина, мм<input inputMode="decimal" value={thickness} onChange={e=>setThickness(e.target.value)}/></label><label>Слоёв<input inputMode="numeric" value={coats} onChange={e=>setCoats(e.target.value)}/></label><label>Запас, %<input inputMode="numeric" value={reserve} onChange={e=>setReserve(e.target.value)}/></label></div>
    <button className="primary wide" onClick={add} disabled={!roomIds.length}>Добавить работу</button>
   </div></details>
   {works.length>0&&<div className="work-list">{works.map(w=><div className="work-card" key={w.id}><div><b>{w.name}</b><small>{project.rooms.filter(r=>w.roomIds.includes(r.id)).map(r=>r.name).join(', ')}</small>{calc(w,project.rooms).map(m=><span key={m.name}>{m.name}: {m.qty.toFixed(1)} {m.unit}</span>)}</div><div className="work-actions"><button className="icon-btn" onClick={()=>onUpdate({works:works.map(x=>x.id===w.id?{...x,done:!x.done}:x)})}>{w.done?<Check size={17}/>:<span>○</span>}</button><button className="icon-btn danger" onClick={()=>onUpdate({works:works.filter(x=>x.id!==w.id)})}><Trash2 size={16}/></button></div></div>)}</div>}
   <div className="section-title"><div><h2>Материалы по работам</h2><span>Количество округляется до целой упаковки.</span></div><button className="link" onClick={syncMaterials}>Добавить в материалы</button></div>
   <div className="material-list">{totals.length===0?<div className="empty compact"><b>Добавь первую работу</b></div>:totals.map(m=>{const p=pack(m.name,m.unit,m.qty);return <div className="material-row" key={m.name}><div><b>{m.name}</b><span>Нужно {m.qty.toFixed(1)} {m.unit} · купить {p.packages||'—'} {p.packageUnit||m.unit}</span></div><strong>{p.purchaseQty.toFixed(1)} {m.unit}</strong><Package size={17}/></div>})}</div>
  </>}
 </section>
}
