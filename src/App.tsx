import {MATERIAL_CATALOG,getMaterialSpec} from './materialCatalog'
import {useEffect,useMemo,useState} from 'react'
import type {CSSProperties} from 'react'
import WorkPlanner from './WorkPlanner'
import PriceFinder from './PriceFinder'
import {Building2,Plus,Wrench,MapPin,UserRound,Ruler,Boxes,Calculator,ShoppingCart,BookOpen,AlertTriangle,ArrowLeft,Trash2,Home,ChevronRight,Check,CircleDollarSign,CalendarDays,X,Smartphone,PenLine} from 'lucide-react'

type Room={id:string,name:string,length:number,width:number,height:number}
type Material={id:string,name:string,unit:string,qty:number,price:number,bought:boolean,packageSize?:number,packageUnit?:string,packages?:number}
type DiaryEntry={id:string,date:string,text:string}
type Issue={id:string,title:string,priority:'low'|'medium'|'high',status:'open'|'done'}
type Project={id:string,name:string,address:string,client:string,rooms:Room[],materials:Material[],diary:DiaryEntry[],issues:Issue[],works?:any[],createdAt:string}
type ModuleName='Работы'|'Замеры'|'Материалы'|'Смета'|'Закупки'|'Дневник'|'Проблемы'
const KEY='stroitel-projects-v1'
const uid=()=>crypto.randomUUID?.()??Date.now().toString(36)+Math.random().toString(36).slice(2)
const normalize=(p:any):Project=>({...p,materials:p.materials??[],diary:p.diary??[],issues:p.issues??[],works:p.works??[]})
const load=():Project[]=>{try{return JSON.parse(localStorage.getItem(KEY)||'[]').map(normalize)}catch{return[]}}
const save=(p:Project[])=>localStorage.setItem(KEY,JSON.stringify(p))
const area=(r:Room)=>r.length*r.width
const walls=(r:Room)=>(2*(r.length+r.width))*r.height
const money=(n:number)=>new Intl.NumberFormat('ru-RU',{style:'currency',currency:'RUB',maximumFractionDigits:0}).format(n)

export default function App(){
 const [projects,setProjects]=useState<Project[]>(load),[selected,setSelected]=useState<string|null>(null),[modal,setModal]=useState(false)
 useEffect(()=>save(projects),[projects])
 const project=projects.find(p=>p.id===selected)
 const addProject=(x:Omit<Project,'id'|'rooms'|'materials'|'diary'|'issues'|'createdAt'>)=>{
  const p={...x,id:uid(),rooms:[],materials:[],diary:[],issues:[],works:[],createdAt:new Date().toISOString()}
  setProjects(v=>[p,...v]);setSelected(p.id);setModal(false)
 }
 const updateProject=(next:Project)=>setProjects(v=>v.map(p=>p.id===next.id?next:p))
 if(project)return <ProjectView project={project} onBack={()=>setSelected(null)} onUpdate={updateProject} onDelete={()=>{setProjects(v=>v.filter(p=>p.id!==project.id));setSelected(null)}}/>
 return <><HomeView projects={projects} onOpen={setSelected} onAdd={()=>setModal(true)}/>{modal&&<ProjectModal onClose={()=>setModal(false)} onSave={addProject}/>}</>
}

function HomeView({projects,onOpen,onAdd}:{projects:Project[],onOpen:(id:string)=>void,onAdd:()=>void}){
 return <div className="app"><header className="topbar"><div><div className="eyebrow">СТРОИТЕЛЬ</div><h1>Мои объекты</h1></div><button className="round" onClick={onAdd}><Plus/></button></header>
 <main className="content"><section className="hero"><Building2 size={42}/><div><h2>Всё по объекту — в одном месте</h2><p>Замеры, материалы, смета, закупки и дневник работ.</p></div><button className="primary" onClick={onAdd}>Создать объект</button></section>
 <div className="section-title"><h2>Объекты</h2><span>{projects.length}</span></div>
 {projects.length===0?<div className="empty"><Home size={34}/><b>Пока нет объектов</b><p>Создай первый объект и начни с замеров.</p></div>:<div className="cards">{projects.map(p=><button className="project-card" key={p.id} onClick={()=>onOpen(p.id)}><div className="project-icon"><Building2/></div><div className="card-main"><b>{p.name}</b><span>{p.address||'Адрес не указан'}</span><small>{p.rooms.length} помещений · {p.materials.length} материалов</small></div><ChevronRight/></button>)}</div>}</main>
 <div className="hint"><Smartphone size={16}/> <span>В меню браузера можно добавить «Строитель» на главный экран.</span></div></div>
}

function ProjectView({project,onBack,onUpdate,onDelete}:{project:Project,onBack:()=>void,onUpdate:(p:Project)=>void,onDelete:()=>void}){
 const [active,setActive]=useState<ModuleName>('Замеры'),[roomModal,setRoomModal]=useState(false),[editingRoom,setEditingRoom]=useState<Room|null>(null)
 const floor=useMemo(()=>project.rooms.reduce((s,r)=>s+area(r),0),[project.rooms])
 const wall=useMemo(()=>project.rooms.reduce((s,r)=>s+walls(r),0),[project.rooms])
 const modules:[ModuleName,typeof Ruler,string][]=[['Работы',Wrench,'#eef4ff'],['Замеры',Ruler,'#e9f2ff'],['Материалы',Boxes,'#edf8f0'],['Смета',Calculator,'#fff4df'],['Закупки',ShoppingCart,'#f4ecff'],['Дневник',BookOpen,'#fff0f0'],['Проблемы',AlertTriangle,'#fff7d8']]
 const patch=(x:Partial<Project>)=>onUpdate({...project,...x})
 return <div className="app"><header className="topbar detail"><button className="back" onClick={onBack}><ArrowLeft/></button><div><div className="eyebrow">ОБЪЕКТ</div><h1>{project.name}</h1></div><button className="more" onClick={()=>{if(confirm('Удалить объект?'))onDelete()}}><Trash2/></button></header>
 <main className="content"><div className="project-info">{project.address&&<span><MapPin size={16}/>{project.address}</span>}{project.client&&<span><UserRound size={16}/>{project.client}</span>}</div>
 <div className="stats"><div><b>{floor.toFixed(1)}</b><span>м² пола</span></div><div><b>{wall.toFixed(1)}</b><span>м² стен</span></div><div><b>{project.rooms.length}</b><span>помещений</span></div></div>
 <div className="section-title"><h2>Разделы</h2></div><div className="modules">{modules.map(([name,Icon,bg])=><button className={`module ${active===name?'active':''}`} key={name} onClick={()=>setActive(name)} style={{'--bg':bg} as CSSProperties}><Icon/><b>{name}</b><ChevronRight/></button>)}</div>
 {active==='Работы'&&<WorkPlanner project={project} onUpdate={patch}/>}
 {active==='Замеры'&&<Measurements project={project} onAdd={()=>{setEditingRoom(null);setRoomModal(true)}} onEdit={r=>{setEditingRoom(r);setRoomModal(true)}} onDelete={id=>patch({rooms:project.rooms.filter(r=>r.id!==id)})}/>}
 {active==='Материалы'&&<Materials project={project} onUpdate={patch}/>}
  
 {active==='Смета'&&<Estimate project={project}/>}
 {active==='Закупки'&&<Purchases project={project} onUpdate={patch}/>}
 {active==='Дневник'&&<Diary project={project} onUpdate={patch}/>}
 {active==='Проблемы'&&<Problems project={project} onUpdate={patch}/>}
  </main>{roomModal&&<RoomModal room={editingRoom} onClose={()=>{setRoomModal(false);setEditingRoom(null)}} onSave={r=>{patch({rooms:editingRoom?project.rooms.map(x=>x.id===editingRoom.id?{...r,id:x.id}:x):[...project.rooms,{...r,id:uid()}]});setRoomModal(false);setEditingRoom(null)}}/>}</div>
}

function Measurements({project,onAdd,onEdit,onDelete}:{project:Project,onAdd:()=>void,onEdit:(room:Room)=>void,onDelete:(id:string)=>void}){
 const floor=project.rooms.reduce((s,r)=>s+area(r),0)
 const wall=project.rooms.reduce((s,r)=>s+walls(r),0)
 const volume=project.rooms.reduce((s,r)=>s+r.length*r.width*r.height,0)
 return <><div className="section-title"><h2>Помещения</h2><button className="link" onClick={onAdd}>＋ Добавить</button></div>
 {project.rooms.length===0?<div className="empty compact"><Ruler size={30}/><b>Добавь первое помещение</b><p>Длина, ширина и высота — площади посчитаются автоматически.</p><button className="primary" onClick={onAdd}>Добавить помещение</button></div>:<>
 <div className="measurement-summary"><div><span>Пол</span><b>{floor.toFixed(1)} м²</b></div><div><span>Стены</span><b>{wall.toFixed(1)} м²</b></div><div><span>Объём</span><b>{volume.toFixed(1)} м³</b></div></div>
 <div className="rooms">{project.rooms.map(r=><div className="room" key={r.id}><div className="room-main"><b>{r.name}</b><span>{r.length} × {r.width} × {r.height} м</span><small>Пол {area(r).toFixed(1)} м² · стены {walls(r).toFixed(1)} м² · объём {(r.length*r.width*r.height).toFixed(1)} м³</small></div><div className="room-side"><strong>{area(r).toFixed(1)} м²</strong><div className="room-actions"><button className="icon-btn" aria-label="Изменить помещение" onClick={()=>onEdit(r)}><PenLine size={15}/></button><button className="icon-btn danger" aria-label="Удалить помещение" onClick={()=>onDelete(r.id)}><Trash2 size={15}/></button></div></div></div>)}</div></>}</>
}

// materials module
function Materials({project,onUpdate}:{project:Project,onUpdate:(x:Partial<Project>)=>void}){
 const [name,setName]=useState(''),[unit,setUnit]=useState('шт'),[qty,setQty]=useState(''),[price,setPrice]=useState('')
 const total=project.materials.reduce((s,m)=>s+m.qty*m.price,0)
 const catalog=MATERIAL_CATALOG
 const selectedSpec=catalog.find(v=>v.name===name&&v.unit===unit)
 const selectMaterial=(value:string)=>{
  const x=catalog.find(v=>v.name===value)
  if(!x){setName('');setPrice('');return}
  setName(x.name);setUnit(x.unit);setPrice(String(x.price))
 }
 const add=()=>{
  const amount=Number(qty.replace(',','.')),unitPrice=Number(price.replace(',','.'))
  if(!name.trim()||!Number.isFinite(amount)||amount<=0||!Number.isFinite(unitPrice)||unitPrice<0)return
  const spec=getMaterialSpec(name.trim(),unit)
  onUpdate({materials:[...project.materials,{id:uid(),name:name.trim(),unit,qty:amount,price:unitPrice,bought:false,packageSize:spec?.packageSize,packageUnit:spec?.packageUnit,packages:spec?Math.ceil(amount/spec.packageSize):undefined}]})
  setName('');setQty('');setPrice('');setUnit('шт')
 }
 return <><div className="section-title"><h2>Материалы</h2><b>{money(total)}</b></div><div className="form-card"><label>Материал<select value={name} onChange={e=>selectMaterial(e.target.value)}><option value="">Выбрать материал</option>{catalog.map(x=><option key={x.name} value={x.name}>{x.name} — {money(x.price)}/{x.unit}</option>)}</select></label><div className="grid3"><label>Ед. измерения<select value={unit} onChange={e=>{setUnit(e.target.value);const spec=getMaterialSpec(name,e.target.value);if(spec)setPrice(String(spec.price))}}><option>шт</option><option>кг</option><option>м²</option><option>м³</option><option>м</option><option>л</option></select></label><label>Количество<input inputMode="decimal" value={qty} onChange={e=>setQty(e.target.value)} placeholder="10"/></label><label>Цена за единицу, ₽<input inputMode="decimal" value={price} onChange={e=>setPrice(e.target.value)} placeholder="Выбери материал"/></label></div>{selectedSpec&&<div className="info-box"><b>Автоцена: {money(selectedSpec.price)} за {selectedSpec.unit}.</b><br/>Упаковка: {selectedSpec.packageSize} {selectedSpec.unit} / {selectedSpec.packageUnit}. Цена ориентировочная, не онлайн-прайс магазина.</div>}<button className="primary wide" onClick={add} disabled={!name.trim()||Number(qty.replace(',','.'))<=0||price.trim()===''||!Number.isFinite(Number(price.replace(',','.')))}>Добавить материал</button></div>
 <div className="material-list">{project.materials.length===0?<div className="empty compact"><Boxes size={28}/><b>Список пока пуст</b><p>Добавляй материалы — здесь будет стоимость объекта.</p></div>:project.materials.map(m=><div className="material-row" key={m.id}><div><b>{m.name}</b><span>{m.qty} {m.unit} × {money(m.price)}{m.packages? ` · ${m.packages} ${m.packageUnit||'уп.'}`:''}</span></div><strong>{money(m.qty*m.price)}</strong><button className="icon-btn" onClick={()=>onUpdate({materials:project.materials.filter(x=>x.id!==m.id)})}><X size={16}/></button></div>)}</div></>
}

function Estimate({project}:{project:Project}){
 const materials=project.materials.reduce((s,m)=>s+m.qty*m.price,0), rooms=project.rooms.length, areaTotal=project.rooms.reduce((s,r)=>s+area(r),0)
 return <><div className="section-title"><h2>Смета</h2><CircleDollarSign/></div><div className="estimate-card"><div><span>Материалы</span><b>{money(materials)}</b></div><div><span>Площадь пола</span><b>{areaTotal.toFixed(1)} м²</b></div><div><span>Помещения</span><b>{rooms}</b></div><div className="estimate-total"><span>Итого по материалам</span><b>{money(materials)}</b></div></div><div className="info-box">Сейчас смета считает стоимость материалов. Следующим этапом добавим работы, нормы расхода и прибыль.</div></>
}

function Purchases({project,onUpdate}:{project:Project,onUpdate:(x:Partial<Project>)=>void}){
 const bought=project.materials.filter(m=>m.bought).length
 const toggle=(id:string)=>onUpdate({materials:project.materials.map(m=>m.id===id?{...m,bought:!m.bought}:m)})
 return <><div className="section-title"><h2>Закупки</h2><span>{bought}/{project.materials.length}</span></div>{project.materials.length===0?<div className="empty compact"><ShoppingCart size={28}/><b>Покупать пока нечего</b><p>Сначала добавь материалы.</p></div>:<div className="purchase-list">{project.materials.map(m=><button className={`purchase ${m.bought?'done':''}`} key={m.id} onClick={()=>toggle(m.id)}><span className="check">{m.bought&&<Check size={15}/>}</span><div><b>{m.name}</b><small>{m.qty} {m.unit} · {money(m.qty*m.price)}</small></div></button>)}</div>}</>
}

function Diary({project,onUpdate}:{project:Project,onUpdate:(x:Partial<Project>)=>void}){
 const [text,setText]=useState(''),today=new Date().toLocaleDateString('ru-RU')
 const add=()=>{if(!text.trim())return;onUpdate({diary:[{id:uid(),date:today,text:text.trim()},...project.diary]});setText('')}
 return <><div className="section-title"><h2>Дневник работ</h2><CalendarDays/></div><div className="form-card"><label>Что сделали сегодня?<textarea value={text} onChange={e=>setText(e.target.value)} placeholder="Залили стяжку, приняли материал, встретились с заказчиком..."/></label><button className="primary wide" onClick={add} disabled={!text.trim()}>Добавить запись</button></div><div className="diary-list">{project.diary.map(e=><article className="diary" key={e.id}><small>{e.date}</small><p>{e.text}</p></article>)}</div></>
}

function Problems({project,onUpdate}:{project:Project,onUpdate:(x:Partial<Project>)=>void}){
 const [title,setTitle]=useState(''),[priority,setPriority]=useState<Issue['priority']>('medium')
 const add=()=>{if(!title.trim())return;onUpdate({issues:[{id:uid(),title:title.trim(),priority,status:'open'},...project.issues]});setTitle('')}
 const toggle=(id:string)=>onUpdate({issues:project.issues.map(i=>i.id===id?{...i,status:i.status==='open'?'done':'open'}:i)})
 return <><div className="section-title"><h2>Проблемы</h2><span>{project.issues.filter(i=>i.status==='open').length} открыто</span></div><div className="form-card"><label>Проблема<input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Не хватает материала"/></label><div className="priority"><button className={priority==='low'?'selected':''} onClick={()=>setPriority('low')}>Низкий</button><button className={priority==='medium'?'selected':''} onClick={()=>setPriority('medium')}>Средний</button><button className={priority==='high'?'selected':''} onClick={()=>setPriority('high')}>Высокий</button></div><button className="primary wide" onClick={add} disabled={!title.trim()}>Добавить проблему</button></div><div className="issue-list">{project.issues.map(i=><button className={`issue ${i.status==='done'?'done':''}`} key={i.id} onClick={()=>toggle(i.id)}><span className={`priority-dot ${i.priority}`}></span><div><b>{i.title}</b><small>{i.status==='done'?'Решено':'Открыта'} · {i.priority==='high'?'Высокий':i.priority==='medium'?'Средний':'Низкий'} приоритет</small></div><Check size={18}/></button>)}</div></>
}

function RoomModal({room,onClose,onSave}:{room:Room|null,onClose:()=>void,onSave:(r:Omit<Room,'id'>)=>void}){
 const [name,setName]=useState(room?.name??''),[length,setLength]=useState(room?.length?String(room.length):''),[width,setWidth]=useState(room?.width?String(room.width):''),[height,setHeight]=useState(room?.height?String(room.height):'2.7')
 const ok=!!name.trim()&&+length>0&&+width>0&&+height>0
 const floor=(+length||0)*(+width||0),wall=2*((+length||0)+(+width||0))*(+height||0),volume=floor*(+height||0)
 return <div className="overlay"><div className="modal"><div className="modal-head"><h2>{room?'Изменить помещение':'Новое помещение'}</h2><button className="close" onClick={onClose}>×</button></div>
 <label>Название<input autoFocus value={name} onChange={e=>setName(e.target.value)} placeholder="Например, Кухня"/></label>
 <div className="grid3"><label>Длина, м<input inputMode="decimal" value={length} onChange={e=>setLength(e.target.value)} placeholder="5"/></label><label>Ширина, м<input inputMode="decimal" value={width} onChange={e=>setWidth(e.target.value)} placeholder="4"/></label><label>Высота, м<input inputMode="decimal" value={height} onChange={e=>setHeight(e.target.value)}/></label></div>
 <div className="calc-preview"><div>Пол <b>{floor.toFixed(1)} м²</b></div><div>Стены <b>{wall.toFixed(1)} м²</b></div><div>Объём <b>{volume.toFixed(1)} м³</b></div></div>
 <div className="actions"><button className="secondary" onClick={onClose}>Отмена</button><button className="primary" disabled={!ok} onClick={()=>onSave({name:name.trim(),length:+length,width:+width,height:+height})}>{room?'Сохранить изменения':'Сохранить'}</button></div></div></div>
}

function ProjectModal({onClose,onSave}:{onClose:()=>void,onSave:(p:Omit<Project,'id'|'rooms'|'materials'|'diary'|'issues'|'createdAt'>)=>void}){const [name,setName]=useState(''),[address,setAddress]=useState(''),[client,setClient]=useState('');return <div className="overlay"><div className="modal"><div className="modal-head"><h2>Новый объект</h2><button className="close" onClick={onClose}>×</button></div><label>Название объекта<input autoFocus value={name} onChange={e=>setName(e.target.value)} placeholder="Дом Иванова"/></label><label>Адрес<input value={address} onChange={e=>setAddress(e.target.value)} placeholder="Город, улица"/></label><label>Заказчик<input value={client} onChange={e=>setClient(e.target.value)} placeholder="Имя заказчика"/></label><div className="actions"><button className="secondary" onClick={onClose}>Отмена</button><button className="primary" disabled={!name.trim()} onClick={()=>onSave({name:name.trim(),address,client})}>Создать</button></div></div></div>}
