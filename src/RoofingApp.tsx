import { useMemo, useState, useEffect } from 'react';
import { Home, Ruler, Layers3, Calculator, ClipboardList, Plus, ChevronRight, Trash2, Download, RotateCcw, CheckCircle2, Info, PanelsTopLeft, Hammer, CircleDollarSign, Box, X, Printer } from 'lucide-react';
import './roofing.css';
import RoofBlueprint, { type RoofView } from './RoofBlueprint';
import { buildRoofGeometry } from './roofGeometry';

type RoofType = 'gable' | 'hip' | 'shed' | 'flat';
type Cover = 'metal' | 'profile' | 'shingle' | 'membrane';
type Work = { id: string; name: string; unit: string; qty: number; price: number; group: 'work' | 'material' };
type Project = { id: string; name: string; address: string; client: string; type: RoofType; cover: Cover; length: number; width: number; pitch: number; overhang: number; waste: number; workPrice: number; materialPrice: number; created: string };
const KEY = 'stroitel-roof-projects-v1';
const roofNames: Record<RoofType,string> = { gable:'Двускатная', hip:'Вальмовая', shed:'Односкатная', flat:'Плоская' };
const coverNames: Record<Cover,string> = { metal:'Металлочерепица', profile:'Профнастил', shingle:'Гибкая черепица', membrane:'Кровельная мембрана' };
const fmt = (n:number) => new Intl.NumberFormat('ru-RU',{maximumFractionDigits:1}).format(Number.isFinite(n)?n:0);
const rub = (n:number) => new Intl.NumberFormat('ru-RU',{style:'currency',currency:'RUB',maximumFractionDigits:0}).format(Number.isFinite(n)?n:0);
const num = (n:number,min=0) => Math.max(min,Number.isFinite(n)?n:0);

// Old/incomplete local projects are normalized instead of crashing the object screen.
function readProjects():Project[] {
 try {
  const raw: unknown = JSON.parse(localStorage.getItem(KEY)||'[]');
  if (!Array.isArray(raw)) return [];
  return raw.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object').map((item,index) => {
   const validType = (['gable','hip','shed','flat'] as const).includes(item.type as RoofType) ? item.type as RoofType : 'gable';
   const validCover = (['metal','profile','shingle','membrane'] as const).includes(item.cover as Cover) ? item.cover as Cover : 'metal';
   const number = (key:string,fallback:number,min=0,max=10000) => {
    const value = Number(item[key]);
    return Number.isFinite(value) ? Math.min(max,Math.max(min,value)) : fallback;
   };
   return {
    id: typeof item.id === 'string' && item.id ? item.id : 'restored-'+index+'-'+Date.now(),
    name: typeof item.name === 'string' && item.name.trim() ? item.name : 'Кровельный объект',
    address: typeof item.address === 'string' ? item.address : '',
    client: typeof item.client === 'string' ? item.client : '',
    type: validType,
    cover: validCover,
    length: number('length',10,0.1),
    width: number('width',8,0.1),
    pitch: number('pitch',30,0,75),
    overhang: number('overhang',0.5,0,10),
    waste: number('waste',10,0,40),
    workPrice: number('workPrice',850,0),
    materialPrice: number('materialPrice',0,0),
    created: typeof item.created === 'string' ? item.created : new Date().toISOString(),
   };
  });
 } catch { return []; }
}
function calc(p:Project) {
 const L=num(p.length), W=num(p.width), e=num(p.overhang), pitch=num(p.pitch);
 const geometry = buildRoofGeometry({type:p.type,length:L,width:W,pitch,overhang:e});
 const slopeLength = p.type==='flat' ? Math.max(L+2*e,W+2*e) : geometry.rafterLength;
 const baseArea = Math.max(0,geometry.totalArea);
 const orderArea = baseArea*(1+num(p.waste)/100);
 const eaveLength = L+2*e;
 const ridge = geometry.ridgeLength;
 const eaves = 2*eaveLength;
 const rakes = p.type==='gable' ? 4*slopeLength : p.type==='shed' ? 2*slopeLength : p.type==='hip' ? 4*slopeLength : 0;
 const membraneRolls = Math.ceil(orderArea/75);
 const battens = p.type==='flat'?0:Math.ceil(orderArea*3.2);
 const counterBattens = p.type==='flat'?0:Math.ceil((eaveLength*2+ridge)*1.1);
 const screws = Math.ceil(orderArea*8);
 const coverPrice = p.cover==='shingle'?950:p.cover==='membrane'?520:p.cover==='profile'?780:890;
 const items = [
  {name:coverNames[p.cover],qty:p.cover==='membrane'?membraneRolls:orderArea,unit:p.cover==='membrane'?'рул.':'м²',price:coverPrice,group:'material' as const},
  {name:'Подкровельная мембрана',qty:membraneRolls,unit:'рул.',price:2400,group:'material' as const},
  {name:'Обрешётка',qty:battens,unit:'пог. м',price:42,group:'material' as const},
  {name:'Контробрешётка',qty:counterBattens,unit:'пог. м',price:38,group:'material' as const},
  {name:'Кровельный крепёж',qty:screws,unit:'шт.',price:4,group:'material' as const},
  {name:'Коньковый элемент',qty:ridge,unit:'пог. м',price:390,group:'material' as const},
  {name:'Карнизная планка',qty:eaves,unit:'пог. м',price:260,group:'material' as const},
  {name:'Монтаж кровельного покрытия',qty:baseArea,unit:'м²',price:p.workPrice||850,group:'work' as const},
  {name:'Монтаж обрешётки',qty:battens,unit:'пог. м',price:25,group:'work' as const},
  {name:'Монтаж мембраны',qty:baseArea,unit:'м²',price:110,group:'work' as const},
 ];
 return {area:baseArea,orderArea,ridge,eaves,rakes,slopeLength,items,totalMaterials:items.filter(x=>x.group==='material').reduce((s,x)=>s+x.qty*x.price,0),totalWorks:items.filter(x=>x.group==='work').reduce((s,x)=>s+x.qty*x.price,0)};
}
function newProject():Project { return {id:crypto.randomUUID?.()||String(Date.now()),name:'Новая кровля',address:'',client:'',type:'gable',cover:'metal',length:10,width:8,pitch:30,overhang:0.5,waste:10,workPrice:850,materialPrice:0,created:new Date().toISOString()}; }
export default function RoofingApp() {
 const [projects,setProjects]=useState<Project[]>(readProjects);
 const [activeId,setActiveId]=useState<string|null>(null);
 const [screen,setScreen]=useState<'home'|'geometry'|'materials'|'estimate'>('home');
 const [showCreate,setShowCreate]=useState(false);
 const [draft,setDraft]=useState<Project>(newProject());
 const [saved,setSaved]=useState(false);
 const [drawingView,setDrawingView]=useState<RoofView>('3d');
 useEffect(()=>{localStorage.setItem(KEY,JSON.stringify(projects));},[projects]);
 const active=projects.find(p=>p.id===activeId)||null;
 const c=useMemo(()=>active?calc(active):calc(draft),[active,draft]);
 const patch=(v:Partial<Project>)=>{if(!active)return;setProjects(old=>old.map(p=>p.id===active.id?{...p,...v}:p));setSaved(false);};
 const create=()=>{const p={...draft,id:crypto.randomUUID?.()||String(Date.now()),created:new Date().toISOString()};setProjects(old=>[p,...old]);setActiveId(p.id);setScreen('geometry');setShowCreate(false);setDraft(newProject());};
 const goHome=()=>{setActiveId(null);setScreen('home');};
 const exportEstimate=()=>{if(!active)return;const rows=[['Позиция','Кол-во','Ед.','Цена','Сумма'],...c.items.map(x=>[x.name,fmt(x.qty),x.unit,fmt(x.price),fmt(x.qty*x.price)])];const csv='\\ufeff'+rows.map(r=>r.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(';')).join('\\n')+'\\n\\nИтого материалы;'+c.totalMaterials+'\\nИтого работы;'+c.totalWorks+'\\nИтого;'+(c.totalMaterials+c.totalWorks);const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=(active.name||'smeta')+'-smeta.csv';a.click();URL.revokeObjectURL(url);};
 return <div className="roof-app">
  <aside className="roof-sidebar">
   <button className="roof-brand" onClick={goHome}><span className="brand-mark"><Home size={21}/></span><span><b>КРОВЛЯ</b><small>WORKSPACE</small></span></button>
   <div className="side-label">РАБОЧЕЕ ПРОСТРАНСТВО</div>
   <button className={'side-link '+(screen==='home'?'selected':'')} onClick={goHome}><PanelsTopLeft size={18}/> Объекты</button>
   {active&&<><div className="side-label side-project-label">ТЕКУЩИЙ ОБЪЕКТ</div><div className="side-current">{active.name}</div>
    <button className={'side-link '+(screen==='geometry'?'selected':'')} onClick={()=>setScreen('geometry')}><Ruler size={18}/> Геометрия крыши</button>
    <button className={'side-link '+(screen==='materials'?'selected':'')} onClick={()=>setScreen('materials')}><Layers3 size={18}/> Материалы</button>
    <button className={'side-link '+(screen==='estimate'?'selected':'')} onClick={()=>setScreen('estimate')}><Calculator size={18}/> Смета</button></>}
   <div className="side-bottom"><span className="online-dot"/> Все расчёты сохраняются на этом устройстве</div>
  </aside>
  <main className="roof-main">
   <header className="roof-topbar"><div className="mobile-brand"><span className="brand-mark"><Home size={18}/></span><b>КРОВЛЯ</b></div><div className="breadcrumbs"><span onClick={goHome}>Объекты</span>{active&&<><ChevronRight size={14}/><b>{active.name}</b></>}</div><div className="top-actions"><span className="save-status"><span className="online-dot"/>{saved?'Сохранено':'Автосохранение'}</span>{active&&<button className="btn btn-quiet btn-small" onClick={exportEstimate}><Download size={15}/> Экспорт сметы</button>}</div></header>
   {screen==='home'?<div className="roof-page">
    <div className="page-heading"><div><div className="overline">ПРОЕКТИРОВАНИЕ · РАСЧЁТ · СМЕТА</div><h1>Кровельная мастерская</h1><p>От замеров до точной спецификации материалов и стоимости работ.</p></div><button className="btn btn-primary" onClick={()=>{setDraft(newProject());setShowCreate(true);}}><Plus size={18}/> Новый объект</button></div>
    <section className="roof-hero"><div className="hero-copy"><span className="hero-chip"><span className="online-dot"/> КРОВЕЛЬНЫЙ КАЛЬКУЛЯТОР</span><h2>Считай точнее.<br/><em>Работай увереннее.</em></h2><p>Геометрия скатов, расход материалов, комплектующие и смета — в одном рабочем пространстве.</p><button className="btn btn-light" onClick={()=>{setDraft(newProject());setShowCreate(true);}}>Рассчитать крышу <ChevronRight size={17}/></button></div><RoofDrawing type="hip" compact/><div className="hero-grid-lines"/></section>
    <div className="stats-row"><div className="stat-card"><span className="stat-icon"><Home size={18}/></span><div><b>{projects.length}</b><small>Объектов в работе</small></div></div><div className="stat-card"><span className="stat-icon"><Ruler size={18}/></span><div><b>{fmt(projects.reduce((s,p)=>s+calc(p).area,0))} м²</b><small>Рассчитано кровли</small></div></div><div className="stat-card"><span className="stat-icon"><CircleDollarSign size={18}/></span><div><b>{rub(projects.reduce((s,p)=>s+calc(p).totalMaterials+calc(p).totalWorks,0))}</b><small>Общая стоимость смет</small></div></div></div>
    <div className="section-heading"><div><h2>Ваши объекты</h2><p>Кровли, расчёты и сметы</p></div><span className="count-pill">{projects.length} проекта</span></div>
    {projects.length===0?<div className="empty-state"><div className="empty-illustration"><Home size={30}/></div><h3>Начните с первого объекта</h3><p>Укажите размеры крыши — приложение рассчитает площадь, ориентировочный расход материалов и стоимость работ.</p><button className="btn btn-primary" onClick={()=>{setDraft(newProject());setShowCreate(true);}}><Plus size={17}/> Создать объект</button></div>:<div className="project-grid">{projects.map(p=>{const pc=calc(p);return <button className="roof-project-card" key={p.id} onClick={()=>{setActiveId(p.id);setScreen('geometry');}}><div className="project-card-top"><div className="project-card-icon"><Home size={20}/></div><span className="type-pill">{roofNames[p.type]}</span></div><h3>{p.name}</h3><p>{p.address||'Адрес не указан'}{p.client?' · '+p.client:''}</p><div className="mini-roof"><RoofDrawing type={p.type} compact/></div><div className="project-card-metrics"><span><small>Площадь</small><b>{fmt(pc.area)} м²</b></span><span><small>Материалы + работы</small><b>{rub(pc.totalMaterials+pc.totalWorks)}</b></span></div><div className="card-open">Открыть расчёт <ChevronRight size={16}/></div></button>})}</div>}
    <div className="feature-strip"><div><Ruler/><b>Геометрия</b><span>Скаты, уклон и свесы</span></div><div><Box/><b>Спецификация</b><span>Расход и запас материалов</span></div><div><ClipboardList/><b>Смета</b><span>Работы и стоимость</span></div><div><Hammer/><b>На объекте</b><span>Удобно с телефона</span></div></div>
   </div>:active?<div className="roof-page">
    <div className="page-heading detail-heading"><div><div className="overline">ОБЪЕКТ · {roofNames[active.type].toUpperCase()}</div><h1>{active.name}</h1><p>{active.address||'Адрес и параметры объекта'}</p></div><div className="heading-actions"><button className="btn btn-quiet" onClick={()=>{setProjects(old=>old.filter(p=>p.id!==active.id));goHome();}}><Trash2 size={16}/></button><button className="btn btn-primary" onClick={()=>{setSaved(true);setTimeout(()=>setSaved(false),1600);}}><CheckCircle2 size={16}/> Сохранить</button></div></div>
    <div className="detail-tabs"><button className={screen==='geometry'?'active':''} onClick={()=>setScreen('geometry')}><Ruler size={16}/> Геометрия</button><button className={screen==='materials'?'active':''} onClick={()=>setScreen('materials')}><Layers3 size={16}/> Материалы</button><button className={screen==='estimate'?'active':''} onClick={()=>setScreen('estimate')}><Calculator size={16}/> Смета</button></div>
    {screen==='geometry'&&<div className="detail-layout"><section className="panel geometry-panel"><div className="panel-title"><div><h2>Параметры кровли</h2><p>Изменяйте размеры — расчёт обновляется автоматически</p></div><Ruler size={19}/></div><label className="field-label">Название объекта<input value={active.name} onChange={e=>patch({name:e.target.value})} placeholder="Например, Дом на участке"/></label><label className="field-label">Адрес объекта<input value={active.address} onChange={e=>patch({address:e.target.value})} placeholder="Населённый пункт, улица"/></label><label className="field-label">Заказчик<input value={active.client} onChange={e=>patch({client:e.target.value})} placeholder="Имя заказчика"/></label><label className="field-label">Кровельное покрытие<select value={active.cover} onChange={e=>patch({cover:e.target.value as Cover})}>{Object.entries(coverNames).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label><div className="field-label">Тип крыши<div className="roof-type-grid">{(['gable','hip','shed','flat'] as RoofType[]).map(t=><button key={t} className={'roof-type-option '+(active.type===t?'active':'')} onClick={()=>patch({type:t})}><RoofDrawing type={t} compact/><b>{roofNames[t]}</b>{active.type===t&&<CheckCircle2 size={15}/>}</button>)}</div></div><div className="input-grid"><NumberField label="Длина здания" value={active.length} unit="м" min={0.1} step={0.5} onChange={v=>patch({length:v})}/><NumberField label="Ширина здания" value={active.width} unit="м" min={0.1} step={0.5} onChange={v=>patch({width:v})}/><NumberField label="Угол наклона" value={active.pitch} unit="°" min={0} max={75} step={1} onChange={v=>patch({pitch:v})}/><NumberField label="Свес карниза" value={active.overhang} unit="м" min={0} step={0.1} onChange={v=>patch({overhang:v})}/><NumberField label="Запас материала" value={active.waste} unit="%" min={0} max={40} step={1} onChange={v=>patch({waste:v})}/></div><div className="calculation-note"><Info size={16}/><span>Предварительный расчёт. Для сложной геометрии, ендов, мансардных окон и нестандартного раскроя требуется уточнение замеров.</span></div></section><section className="panel visualization-panel"><div className="panel-title"><div><h2>Чертежи и 3D-модель</h2><p>Виды обновляются при изменении размеров</p></div><div className="visual-actions"><span className="live-tag"><span className="online-dot"/> LIVE</span>{drawingView!=='3d'&&<button className="btn btn-quiet btn-small print-drawing-btn" onClick={()=>window.print()}><Printer size={14}/> Печать / PDF</button>}</div></div><div className="drawing-tabs" role="tablist" aria-label="Режим отображения"><button className={drawingView==='3d'?'active':''} onClick={()=>setDrawingView('3d')}><PanelsTopLeft size={15}/> 3D-модель</button><button className={drawingView==='plan'?'active':''} onClick={()=>setDrawingView('plan')}><Ruler size={15}/> План</button><button className={drawingView==='elevation'?'active':''} onClick={()=>setDrawingView('elevation')}><Home size={15}/> Фасад</button><button className={drawingView==='section'?'active':''} onClick={()=>setDrawingView('section')}><PanelsTopLeft size={15}/> Разрез</button><button className={drawingView==='frame'?'active':''} onClick={()=>setDrawingView('frame')}><Hammer size={15}/> Каркас</button></div><div className="roof-canvas blueprint-canvas"><RoofBlueprint project={active} view={drawingView}/><div className="drawing-legend"><span><i className="legend-roof"/> {drawingView==='3d'?'Кровельное покрытие':drawingView==='frame'?'Несущие элементы':'Проекция и размерные линии'}</span><span><i className="legend-line"/> {drawingView==='3d'?'Рёбра и конёк':'Основные размеры'}</span></div></div><div className="visual-metrics"><div><small>Площадь покрытия</small><b>{fmt(c.area)} м²</b></div><div><small>С запасом {active.waste}%</small><b>{fmt(c.orderArea)} м²</b></div><div><small>Длина ската</small><b>{fmt(c.slopeLength)} м</b></div></div><div className="next-step-card"><div className="next-step-icon"><Layers3 size={19}/></div><div><b>Перейти к материалам</b><span>Посмотреть предварительную спецификацию</span></div><button onClick={()=>setScreen('materials')}><ChevronRight/></button></div></section></div>}
    {screen==='materials'&&<><div className="summary-cards"><Metric title="Площадь скатов" value={fmt(c.area)+' м²'} hint="Геометрическая оценка" icon={<Home/>}/><Metric title="Заказать покрытие" value={fmt(c.orderArea)+' м²'} hint={'С запасом '+active.waste+'%'} icon={<Layers3/>}/><Metric title="Кровельный крепёж" value={fmt(c.items.find(x=>x.name==='Кровельный крепёж')?.qty||0)+' шт.'} hint="Ориентир 8 шт./м²" icon={<Box/>}/></div><section className="panel table-panel"><div className="panel-title"><div><h2>Спецификация материалов</h2><p>Расчётные количества и редактируемые цены</p></div><span className="count-pill">{c.items.filter(x=>x.group==='material').length} позиции</span></div><div className="table-wrap"><table><thead><tr><th>Материал</th><th>Количество</th><th>Цена за ед.</th><th>Стоимость</th></tr></thead><tbody>{c.items.filter(x=>x.group==='material').map((x,i)=><tr key={x.name}><td><span className="material-dot">{i+1}</span>{x.name}</td><td>{fmt(x.qty)} {x.unit}</td><td>{rub(x.price)}</td><td><b>{rub(x.qty*x.price)}</b></td></tr>)}</tbody></table></div><div className="table-total"><span>Материалы</span><b>{rub(c.totalMaterials)}</b></div></section></>}
    {screen==='estimate'&&<><div className="summary-cards"><Metric title="Материалы" value={rub(c.totalMaterials)} hint="Предварительная стоимость" icon={<Layers3/>}/><Metric title="Работы" value={rub(c.totalWorks)} hint="По заданным расценкам" icon={<Hammer/>}/><Metric title="Всего по объекту" value={rub(c.totalMaterials+c.totalWorks)} hint="Материалы + работы" icon={<Calculator/>}/></div><section className="panel table-panel"><div className="panel-title"><div><h2>Смета объекта</h2><p>Стоимость материалов и работ</p></div><button className="btn btn-primary btn-small" onClick={exportEstimate}><Download size={15}/> Скачать CSV</button></div><div className="table-wrap"><table><thead><tr><th>Позиция</th><th>Кол-во</th><th>Цена</th><th>Сумма</th></tr></thead><tbody>{c.items.map(x=><tr key={x.name}><td>{x.name}</td><td>{fmt(x.qty)} {x.unit}</td><td>{rub(x.price)}</td><td><b>{rub(x.qty*x.price)}</b></td></tr>)}</tbody></table></div><div className="table-total"><span>Итого</span><b>{rub(c.totalMaterials+c.totalWorks)}</b></div></section></>}
   </div>:<div className="roof-page"><div className="empty-state"><h3>Объект не найден</h3><p>Вернитесь к списку объектов и откройте его снова.</p><button className="btn btn-primary" onClick={goHome}>К объектам</button></div></div>}
  </main>
  {showCreate&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setShowCreate(false);}}><section className="create-modal"><div className="modal-heading"><div><div className="overline">НОВЫЙ ПРОЕКТ</div><h2>Создать объект</h2><p>Базовые параметры можно изменить после создания.</p></div><button className="icon-btn" onClick={()=>setShowCreate(false)}><X/></button></div><label className="field-label">Название объекта<input autoFocus value={draft.name} onChange={e=>setDraft(p=>({...p,name:e.target.value}))}/></label><label className="field-label">Тип крыши<select value={draft.type} onChange={e=>setDraft(p=>({...p,type:e.target.value as RoofType}))}>{Object.entries(roofNames).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label><div className="input-grid"><NumberField label="Длина" value={draft.length} unit="м" min={0.1} step={0.5} onChange={v=>setDraft(p=>({...p,length:v}))}/><NumberField label="Ширина" value={draft.width} unit="м" min={0.1} step={0.5} onChange={v=>setDraft(p=>({...p,width:v}))}/><NumberField label="Угол наклона" value={draft.pitch} unit="°" min={0} max={75} step={1} onChange={v=>setDraft(p=>({...p,pitch:v}))}/></div><div className="modal-actions"><button className="btn btn-quiet" onClick={()=>setShowCreate(false)}>Отмена</button><button className="btn btn-primary" onClick={create}><Plus size={17}/> Создать и открыть</button></div></section></div>}
 </div>;
}
