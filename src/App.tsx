import {MATERIAL_CATALOG,getMaterialSpec} from './materialCatalog'
import {useEffect,useMemo,useState} from 'react'
import type {CSSProperties} from 'react'
import WorkPlanner from './WorkPlanner'
import PriceFinder from './PriceFinder'
import {Building2,Plus,Wrench,MapPin,UserRound,Ruler,Boxes,Calculator,ShoppingCart,BookOpen,AlertTriangle,ArrowLeft,Trash2,Home,ChevronRight,Check,CircleDollarSign,CalendarDays,X,Smartphone,PenLine,Grid2X2,Eye,Printer,Share2} from 'lucide-react'

type Room={id:string,name:string,length:number,width:number,height:number}
type Material={id:string,name:string,unit:string,qty:number,price:number,bought:boolean,packageSize?:number,packageUnit?:string,packages?:number}
type DiaryEntry={id:string,date:string,text:string}
type Issue={id:string,title:string,priority:'low'|'medium'|'high',status:'open'|'done'}
type Project={id:string,name:string,address:string,client:string,rooms:Room[],materials:Material[],diary:DiaryEntry[],issues:Issue[],works?:any[],profitPercent?:number,createdAt:string}
type ModuleName='Работы'|'Замеры'|'Материалы'|'Смета'|'Закупки'|'Дневник'|'Проблемы'
type ProjectTab='Обзор'|ModuleName
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
 <main className="content"><section className="dashboard-hero"><div className="dashboard-copy"><span className="dashboard-label">РАБОЧИЙ СТОЛ</span><h2>Управляй объектами без лишней бумаги</h2><p>Замеры, работы, материалы и деньги собраны в одной системе.</p></div><button className="primary dashboard-add" onClick={onAdd}><Plus size={17}/> Новый объект</button></section>
 <div className="portfolio-stats"><div><b>{projects.length}</b><span>объектов</span></div><div><b>{projects.reduce((s,p)=>s+p.rooms.length,0)}</b><span>помещений</span></div><div><b>{projects.reduce((s,p)=>s+p.materials.length,0)}</b><span>позиций</span></div></div>
 <div className="section-title"><div><h2>Мои объекты</h2><small className="section-caption">Рабочие проекты</small></div><span>{projects.length}</span></div>
 {projects.length===0?<div className="empty"><Home size={34}/><b>Пока нет объектов</b><p>Создай первый объект и начни с замеров.</p></div>:<div className="cards">{projects.map(p=><button className="project-card" key={p.id} onClick={()=>onOpen(p.id)}><div className="project-icon"><Building2/></div><div className="card-main"><b>{p.name}</b><span>{p.address||'Адрес не указан'}</span><small>{p.rooms.length} помещений · {p.materials.length} материалов</small></div><ChevronRight/></button>)}</div>}</main>
 <div className="hint"><Smartphone size={16}/> <span>Можно установить приложение на главный экран телефона.</span></div></div>
}

function ProjectView({project,onBack,onUpdate,onDelete}:{project:Project,onBack:()=>void,onUpdate:(p:Project)=>void,onDelete:()=>void}){
 const [active,setActive]=useState<ProjectTab>('Обзор'),[roomModal,setRoomModal]=useState(false),[editingRoom,setEditingRoom]=useState<Room|null>(null),[moreOpen,setMoreOpen]=useState(false)
 const floor=useMemo(()=>project.rooms.reduce((s,r)=>s+area(r),0),[project.rooms])
 const wall=useMemo(()=>project.rooms.reduce((s,r)=>s+walls(r),0),[project.rooms])
 const materialTotal=useMemo(()=>project.materials.reduce((s,m)=>s+m.qty*m.price,0),[project.materials])
 const openIssues=project.issues.filter(i=>i.status==='open').length
 const progress=Math.min(100,Math.round(((project.rooms.length>0?1:0)+(project.materials.length>0?1:0)+(project.works?.length?1:0)+(project.diary.length>0?1:0))/4*100))
 const modules:[ModuleName,typeof Ruler,string][]=[['Работы',Wrench,'#eef4ff'],['Замеры',Ruler,'#e9f2ff'],['Материалы',Boxes,'#edf8f0'],['Смета',Calculator,'#fff4df'],['Закупки',ShoppingCart,'#f4ecff'],['Дневник',BookOpen,'#fff0f0'],['Проблемы',AlertTriangle,'#fff7d8']]
 const patch=(x:Partial<Project>)=>onUpdate({...project,...x})
 const go=(tab:ProjectTab)=>{setActive(tab);setMoreOpen(false);window.scrollTo({top:0,behavior:'smooth'})}
 const showRoomModal=()=>{setEditingRoom(null);setRoomModal(true)}
 return <div className="app project-app">
  <header className="topbar detail"><button className="back" onClick={onBack}><ArrowLeft/></button><div><div className="eyebrow">ОБЪЕКТ</div><h1>{project.name}</h1></div><button className="more" onClick={()=>{if(confirm('Удалить объект?'))onDelete()}}><Trash2/></button></header>
  <main className="content project-content">
   <section className="project-head-card">
    <div className="project-head-top"><div className="project-mark"><Building2 size={22}/></div><div className="project-head-copy"><span>АКТИВНЫЙ ОБЪЕКТ</span><h2>{project.name}</h2></div></div>
    <div className="project-meta">{project.address&&<span><MapPin size={14}/>{project.address}</span>}{project.client&&<span><UserRound size={14}/>{project.client}</span>}</div>
    <div className="project-progress"><div><span>Заполнено</span><b>{progress}%</b></div><div className="progress-track"><i style={{width:`${progress}%`}}/></div></div>
   </section>

   {active==='Обзор'&&<ProjectOverview project={project} floor={floor} materialTotal={materialTotal} openIssues={openIssues} progress={progress} onGo={go} onAddRoom={showRoomModal}/>}
   {active!=='Обзор'&&<div className="module-content">
    <div className="module-breadcrumb"><span>РАЗДЕЛ</span><b>{active}</b></div>
    {active==='Работы'&&<WorkPlanner project={project} onUpdate={patch}/>}
    {active==='Замеры'&&<Measurements project={project} onAdd={showRoomModal} onEdit={r=>{setEditingRoom(r);setRoomModal(true)}} onDelete={id=>patch({rooms:project.rooms.filter(r=>r.id!==id)})}/>}
    {active==='Материалы'&&<Materials project={project} onUpdate={patch}/>}
    {active==='Смета'&&<Estimate project={project} onUpdate={patch}/>}
    {active==='Закупки'&&<Purchases project={project} onUpdate={patch}/>}
    {active==='Дневник'&&<Diary project={project} onUpdate={patch}/>}
    {active==='Проблемы'&&<Problems project={project} onUpdate={patch}/>}
   </div>}
  </main>

  {moreOpen&&<div className="more-sheet"><button className="sheet-backdrop" aria-label="Закрыть меню" onClick={()=>setMoreOpen(false)}/><div className="more-sheet-card"><div className="sheet-handle"/><div className="sheet-title"><div><span>РАЗДЕЛЫ ОБЪЕКТА</span><b>Все инструменты</b></div><button className="close" onClick={()=>setMoreOpen(false)}>×</button></div><div className="more-grid">{modules.map(([name,Icon,bg])=><button key={name} className={`more-item ${active===name?'active':''}`} onClick={()=>go(name)} style={{'--bg':bg} as CSSProperties}><span className="more-item-icon"><Icon size={19}/></span><span>{name}</span><ChevronRight size={16}/></button>)}</div></div></div>}

  <nav className="bottom-nav" aria-label="Навигация по объекту">
   <button className={active==='Обзор'?'active':''} onClick={()=>go('Обзор')}><Home size={20}/><span>Обзор</span></button>
   <button className={active==='Замеры'?'active':''} onClick={()=>go('Замеры')}><Ruler size={20}/><span>Замеры</span></button>
   <button className={active==='Работы'?'active':''} onClick={()=>go('Работы')}><Wrench size={20}/><span>Работы</span></button>
   <button className={active==='Материалы'?'active':''} onClick={()=>go('Материалы')}><Boxes size={20}/><span>Материалы</span></button>
   <button className={moreOpen?'active':''} onClick={()=>setMoreOpen(v=>!v)}><Grid2X2 size={19}/><span>Ещё</span></button>
  </nav>

  {roomModal&&<RoomModal room={editingRoom} onClose={()=>{setRoomModal(false);setEditingRoom(null)}} onSave={r=>{patch({rooms:editingRoom?project.rooms.map(x=>x.id===editingRoom.id?{...r,id:x.id}:x):[...project.rooms,{...r,id:uid()}]});setRoomModal(false);setEditingRoom(null)}}/>}
 </div>
}

function ProjectOverview({project,floor,materialTotal,openIssues,progress,onGo,onAddRoom}:{project:Project,floor:number,materialTotal:number,openIssues:number,progress:number,onGo:(tab:ProjectTab)=>void,onAddRoom:()=>void}){
 const recentDiary=project.diary.slice(0,2)
 return <div className="overview">
  <div className="overview-heading"><div><span className="section-kicker">ОБЗОР ОБЪЕКТА</span><h2>Что происходит сейчас</h2></div><span className="overview-status">{progress}%</span></div>
  <div className="overview-kpis">
   <button onClick={()=>onGo('Замеры')}><span><Ruler size={17}/></span><b>{floor.toFixed(1)} м²</b><small>Площадь пола</small></button>
   <button onClick={()=>onGo('Материалы')}><span><CircleDollarSign size={17}/></span><b>{money(materialTotal)}</b><small>Материалы</small></button>
   <button onClick={()=>onGo('Проблемы')}><span><AlertTriangle size={17}/></span><b>{openIssues}</b><small>Открытых проблем</small></button>
   <button onClick={()=>onGo('Работы')}><span><Wrench size={17}/></span><b>{project.works?.length??0}</b><small>Работ</small></button>
  </div>
  <div className="quick-actions">
   <div className="section-title"><div><h2>Быстрые действия</h2><small className="section-caption">Добавляй данные прямо с объекта</small></div></div>
   <div className="quick-grid">
    <button onClick={onAddRoom}><Ruler size={19}/><span>Добавить замер</span></button>
    <button onClick={()=>onGo('Работы')}><Wrench size={19}/><span>Добавить работу</span></button>
    <button onClick={()=>onGo('Материалы')}><Boxes size={19}/><span>Добавить материал</span></button>
    <button onClick={()=>onGo('Дневник')}><BookOpen size={19}/><span>Записать в дневник</span></button>
   </div>
  </div>
  <div className="overview-columns">
   <section className="overview-panel"><div className="panel-head"><div><span>ПОСЛЕДНИЕ ЗАПИСИ</span><b>Дневник</b></div><button onClick={()=>onGo('Дневник')}>Все</button></div>{recentDiary.length===0?<div className="panel-empty"><BookOpen size={20}/><span>Записей пока нет</span></div>:recentDiary.map(e=><article className="activity-row" key={e.id}><span className="activity-dot"/><div><b>{e.date}</b><p>{e.text}</p></div></article>)}</section>
   <section className="overview-panel"><div className="panel-head"><div><span>ТРЕБУЕТ ВНИМАНИЯ</span><b>Проблемы</b></div><button onClick={()=>onGo('Проблемы')}>Все</button></div>{openIssues===0?<div className="panel-empty"><Check size={20}/><span>Открытых проблем нет</span></div>:project.issues.filter(i=>i.status==='open').slice(0,3).map(i=><button className="attention-row" key={i.id} onClick={()=>onGo('Проблемы')}><span className={`priority-dot ${i.priority}`}/><span>{i.title}</span><ChevronRight size={16}/></button>)}</section>
  </div>
 </div>
}
function Measurements({project,onAdd,onEdit,onDelete}:{project:Project,onAdd:()=>void,onEdit:(room:Room)=>void,onDelete:(id:string)=>void}){
 const floor=project.rooms.reduce((s,r)=>s+area(r),0)
 const wall=project.rooms.reduce((s,r)=>s+walls(r),0)
 const volume=project.rooms.reduce((s,r)=>s+r.length*r.width*r.height,0)
 return <section className="compact-module"><div className="module-hero"><div><span className="section-kicker">РАЗМЕРЫ ОБЪЕКТА</span><h2>Замеры</h2><p>{project.rooms.length} помещений · площади считаются автоматически.</p></div><Ruler size={22}/></div><div className="section-title"><div><h2>Помещения</h2><span className="section-caption">Размеры, площади и объёмы</span></div><button className="compact-cta primary" onClick={onAdd}><Plus size={15}/> Добавить</button></div>
 {project.rooms.length===0?<div className="empty compact"><Ruler size={30}/><b>Объект пока без замеров</b><p>Добавь помещение — площадь, стены и объём посчитаются автоматически.</p><button className="primary" onClick={onAdd}><Plus size={16}/> Добавить помещение</button></div>:<>
 <div className="measurement-summary"><div><span>Пол</span><b>{floor.toFixed(1)} м²</b></div><div><span>Стены</span><b>{wall.toFixed(1)} м²</b></div><div><span>Объём</span><b>{volume.toFixed(1)} м³</b></div></div>
 <div className="rooms">{project.rooms.map(r=><div className="room" key={r.id}><div className="room-main"><b>{r.name}</b><span>{r.length} × {r.width} × {r.height} м</span><small>Пол {area(r).toFixed(1)} м² · стены {walls(r).toFixed(1)} м² · объём {(r.length*r.width*r.height).toFixed(1)} м³</small></div><div className="room-side"><strong>{area(r).toFixed(1)} м²</strong><div className="room-actions"><button className="icon-btn" aria-label="Изменить помещение" onClick={()=>onEdit(r)}><PenLine size={15}/></button><button className="icon-btn danger" aria-label="Удалить помещение" onClick={()=>onDelete(r.id)}><Trash2 size={15}/></button></div></div></div>)}</div></>}</section>
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
 return <section className="compact-module"><div className="section-title"><h2>Материалы</h2><b>{money(total)}</b></div><div className="module-hero"><div><span className="section-kicker">СНАБЖЕНИЕ</span><h2>Материалы</h2><p>{project.materials.length} позиций · стоимость обновляется автоматически.</p></div><Boxes size={22}/></div><div className="material-add-panel"><div className="material-add-head"><div><span className="section-kicker">БЫСТРОЕ ДОБАВЛЕНИЕ</span><b>Новый материал</b></div></div><div className="form-card"><label>Материал<select value={name} onChange={e=>selectMaterial(e.target.value)}><option value="">Выбрать материал</option>{catalog.map(x=><option key={x.name} value={x.name}>{x.name} — {money(x.price)}/{x.unit}</option>)}</select></label><div className="grid3"><label>Ед. измерения<select value={unit} onChange={e=>{setUnit(e.target.value);const spec=getMaterialSpec(name,e.target.value);if(spec)setPrice(String(spec.price))}}><option>шт</option><option>кг</option><option>м²</option><option>м³</option><option>м</option><option>л</option></select></label><label>Количество<input inputMode="decimal" value={qty} onChange={e=>setQty(e.target.value)} placeholder="10"/></label><label>Цена за единицу, ₽<input inputMode="decimal" value={price} onChange={e=>setPrice(e.target.value)} placeholder="Выбери материал"/></label></div>{selectedSpec&&<div className="info-box"><b>Автоцена: {money(selectedSpec.price)} за {selectedSpec.unit}.</b><br/>Упаковка: {selectedSpec.packageSize} {selectedSpec.unit} / {selectedSpec.packageUnit}. Цена ориентировочная, не онлайн-прайс магазина.</div>}<button className="primary wide" onClick={add} disabled={!name.trim()||Number(qty.replace(',','.'))<=0||price.trim()===''||!Number.isFinite(Number(price.replace(',','.')))}>Добавить материал</button></div></div>
 <div className="material-list">{project.materials.length===0?<div className="empty compact"><Boxes size={28}/><b>Список пока пуст</b><p>Добавляй материалы — здесь будет стоимость объекта.</p></div>:project.materials.map(m=><div className="material-row" key={m.id}><div><b>{m.name}</b><span>{m.qty} {m.unit} × {money(m.price)}{m.packages? ` · ${m.packages} ${m.packageUnit||'уп.'}`:''}</span></div><strong>{money(m.qty*m.price)}</strong><button className="icon-btn" onClick={()=>onUpdate({materials:project.materials.filter(x=>x.id!==m.id)})}><X size={16}/></button></div>)}</div></section>
}

function Estimate({project,onUpdate}:{project:Project,onUpdate:(x:Partial<Project>)=>void}){
 const materials=project.materials.reduce((s,m)=>s+m.qty*m.price,0)
 const works=project.works??[]
 const labor=works.reduce((s,w)=>s+(Number(w.laborPrice)||0),0)
 const direct=materials+labor
 const [margin,setMargin]=useState(String(project.profitPercent??20))
 const [preview,setPreview]=useState(false)
 const pct=Math.max(0,Number(margin.replace(',','.'))||0)
 const profit=direct*pct/100
 const total=direct+profit
 const areaTotal=project.rooms.reduce((s,r)=>s+area(r),0)
 const open=works.filter(w=>!w.done).length
 const saveMargin=()=>onUpdate({profitPercent:pct})
 const estimateText=()=>{const lines=works.map(w=>'• '+w.name+' — '+money(Number(w.laborPrice)||0)).join('\n');return 'Смета: '+project.name+'\nЗаказчик: '+(project.client||'—')+'\n\nМатериалы: '+money(materials)+'\nРаботы: '+money(labor)+'\nСебестоимость: '+money(direct)+'\nПрибыль ('+pct+'%): '+money(profit)+'\nИТОГО: '+money(total)+(lines?'\n\nРаботы:\n'+lines:'')}
 const shareEstimate=async()=>{const text=estimateText();if(navigator.share){try{await navigator.share({title:'Смета — '+project.name,text})}catch{}}else{await navigator.clipboard?.writeText(text);alert('Смета скопирована в буфер обмена.')}}
 const printEstimate=()=>window.print()
 return <section className="compact-module"><div className="module-hero"><div><span className="section-kicker">ФИНАНСЫ</span><h2>Смета</h2><p>{works.length} работ · {project.materials.length} материалов · расчёт цены объекта.</p></div><CircleDollarSign size={22}/></div>
 <div className="estimate-main"><div className="estimate-lead"><span>ИТОГО ДЛЯ ЗАКАЗЧИКА</span><b>{money(total)}</b><small>С учётом {pct}% прибыли</small></div>
 <div className="estimate-breakdown"><div><span>Материалы</span><b>{money(materials)}</b></div><div><span>Работа</span><b>{money(labor)}</b></div><div><span>Себестоимость</span><b>{money(direct)}</b></div><div><span>Прибыль</span><b>{money(profit)}</b></div></div></div>
 <div className="estimate-settings"><div><div><b>Наценка / прибыль</b><span>Процент добавляется к себестоимости материалов и работ.</span></div><label><input inputMode="decimal" value={margin} onChange={e=>setMargin(e.target.value)} onBlur={saveMargin}/> %</label></div></div>
 <div className="estimate-actions no-print"><button className="secondary" onClick={()=>setPreview(true)}><Eye size={16}/> Показать заказчику</button><button className="primary" onClick={printEstimate}><Printer size={16}/> Печать / PDF</button><button className="secondary" onClick={shareEstimate}><Share2 size={16}/> Отправить</button></div>
 <div className="estimate-status"><span>{open===0&&works.length>0?'Все работы выполнены':('Осталось работ: '+open)}</span><span>{areaTotal.toFixed(1)} м² объекта</span></div>
 <div className="estimate-list"><div className="section-title"><div><h2>Работы</h2><span>Цена работы задаётся при добавлении.</span></div></div>{works.length===0?<div className="empty compact"><Wrench size={26}/><b>Работ пока нет</b><p>Добавь работы — они появятся в смете автоматически.</p></div>:works.map(w=><div className="estimate-line" key={w.id}><div><b>{w.name}</b><small>{project.rooms.filter(r=>w.roomIds?.includes(r.id)).map(r=>r.name).join(', ')||'Без помещения'}</small></div><strong>{money(Number(w.laborPrice)||0)}</strong></div>)}</div>
 {preview&&<EstimatePreview project={project} works={works} materials={materials} labor={labor} direct={direct} profit={profit} total={total} pct={pct} onClose={()=>setPreview(false)} onPrint={printEstimate}/>}
 </section>
}

function EstimatePreview({project,works,materials,labor,direct,profit,total,pct,onClose,onPrint}:{project:Project,works:any[],materials:number,labor:number,direct:number,profit:number,total:number,pct:number,onClose:()=>void,onPrint:()=>void}){
 return <div className="estimate-preview-overlay"><div className="estimate-preview-shell"><div className="estimate-preview-toolbar no-print"><b>Предпросмотр сметы</b><div><button className="secondary" onClick={onClose}>Закрыть</button><button className="primary" onClick={onPrint}><Printer size={16}/> Печать / PDF</button></div></div><article className="estimate-document" id="customer-estimate">
<header><div><span>СМЕТА</span><h1>{project.name}</h1><p>{project.address||'Адрес не указан'}</p></div><div className="estimate-doc-total"><small>ИТОГО</small><strong>{money(total)}</strong></div></header>
<div className="estimate-doc-meta"><span>Заказчик <b>{project.client||'Не указан'}</b></span><span>Площадь <b>{project.rooms.reduce((s,r)=>s+area(r),0).toFixed(1)} м²</b></span><span>Наценка <b>{pct}%</b></span></div>
<h2>Расчёт стоимости</h2>
<div className="estimate-doc-table"><div className="estimate-doc-row head"><span>Позиция</span><span>Стоимость</span></div><div className="estimate-doc-row"><span>Материалы</span><b>{money(materials)}</b></div><div className="estimate-doc-row"><span>Работы</span><b>{money(labor)}</b></div><div className="estimate-doc-row"><span>Себестоимость</span><b>{money(direct)}</b></div><div className="estimate-doc-row profit"><span>Прибыль / наценка</span><b>{money(profit)}</b></div><div className="estimate-doc-row total"><span>ИТОГО К ОПЛАТЕ</span><b>{money(total)}</b></div></div>
<h2>Работы</h2>
<div className="estimate-doc-works">{works.length===0?<p>Работы не добавлены.</p>:works.map(w=><div className="estimate-doc-work" key={w.id}><span><b>{w.name}</b><small>{project.rooms.filter(r=>w.roomIds?.includes(r.id)).map(r=>r.name).join(', ')||'Без помещения'}</small></span><strong>{money(Number(w.laborPrice)||0)}</strong></div>)}</div>
<footer>Смета сформирована в приложении «Строитель». Стоимость является расчётной и может быть уточнена после согласования работ и материалов.</footer>
</article></div></div>

function Purchases({project,onUpdate}:{project:Project,onUpdate:(x:Partial<Project>)=>void}){
 const bought=project.materials.filter(m=>m.bought).length
 const toggle=(id:string)=>onUpdate({materials:project.materials.map(m=>m.id===id?{...m,bought:!m.bought}:m)})
 return <section className="compact-module"><div className="module-hero"><div><span className="section-kicker">СНАБЖЕНИЕ</span><h2>Закупки</h2><p>{bought} из {project.materials.length} позиций куплено.</p></div><ShoppingCart size={22}/></div>{project.materials.length===0?<div className="empty compact"><ShoppingCart size={28}/><b>Покупать пока нечего</b><p>Сначала добавь материалы.</p></div>:<div className="purchase-list">{project.materials.map(m=><button className={`purchase ${m.bought?'done':''}`} key={m.id} onClick={()=>toggle(m.id)}><span className="check">{m.bought&&<Check size={15}/>}</span><div><b>{m.name}</b><small>{m.qty} {m.unit} · {money(m.qty*m.price)}</small></div></button>)}</div>}</section>
}

function Diary({project,onUpdate}:{project:Project,onUpdate:(x:Partial<Project>)=>void}){
 const [text,setText]=useState(''),today=new Date().toLocaleDateString('ru-RU')
 const add=()=>{if(!text.trim())return;onUpdate({diary:[{id:uid(),date:today,text:text.trim()},...project.diary]});setText('')}
 return <section className="compact-module"><div className="module-hero"><div><span className="section-kicker">ДНЕВНИК</span><h2>Дневник работ</h2><p>Фиксируй события объекта по мере работы.</p></div><CalendarDays size={22}/></div><div className="form-card"><label>Что сделали сегодня?<textarea value={text} onChange={e=>setText(e.target.value)} placeholder="Залили стяжку, приняли материал, встретились с заказчиком..."/></label><button className="primary wide" onClick={add} disabled={!text.trim()}>Добавить запись</button></div><div className="diary-list">{project.diary.map(e=><article className="diary" key={e.id}><small>{e.date}</small><p>{e.text}</p></article>)}</div></section>
}

function Problems({project,onUpdate}:{project:Project,onUpdate:(x:Partial<Project>)=>void}){
 const [title,setTitle]=useState(''),[priority,setPriority]=useState<Issue['priority']>('medium')
 const add=()=>{if(!title.trim())return;onUpdate({issues:[{id:uid(),title:title.trim(),priority,status:'open'},...project.issues]});setTitle('')}
 const toggle=(id:string)=>onUpdate({issues:project.issues.map(i=>i.id===id?{...i,status:i.status==='open'?'done':'open'}:i)})
 return <section className="compact-module"><div className="module-hero"><div><span className="section-kicker">КОНТРОЛЬ</span><h2>Проблемы</h2><p>{project.issues.filter(i=>i.status==='open').length} открытых вопросов.</p></div><AlertTriangle size={22}/></div><div className="form-card"><label>Проблема<input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Не хватает материала"/></label><div className="priority"><button className={priority==='low'?'selected':''} onClick={()=>setPriority('low')}>Низкий</button><button className={priority==='medium'?'selected':''} onClick={()=>setPriority('medium')}>Средний</button><button className={priority==='high'?'selected':''} onClick={()=>setPriority('high')}>Высокий</button></div><button className="primary wide" onClick={add} disabled={!title.trim()}>Добавить проблему</button></div><div className="issue-list">{project.issues.map(i=><button className={`issue ${i.status==='done'?'done':''}`} key={i.id} onClick={()=>toggle(i.id)}><span className={`priority-dot ${i.priority}`}></span><div><b>{i.title}</b><small>{i.status==='done'?'Решено':'Открыта'} · {i.priority==='high'?'Высокий':i.priority==='medium'?'Средний':'Низкий'} приоритет</small></div><Check size={18}/></button>)}</div></section>
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
