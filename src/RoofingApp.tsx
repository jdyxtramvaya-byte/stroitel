import { useMemo, useState, useEffect } from 'react';
import { Home, Ruler, Layers3, Calculator, ClipboardList, Plus, ChevronRight, Trash2, Download, RotateCcw, CheckCircle2, Info, PanelsTopLeft, Hammer, CircleDollarSign, Box, X, Printer } from 'lucide-react';
import './roofing.css';
import RoofBlueprint, { type RoofView } from './RoofBlueprint';
import { buildRoofGeometry } from './roofGeometry';
import RoofAccessories, { type RoofAccessory } from './RoofAccessories';

type RoofType = 'gable' | 'hip' | 'shed' | 'flat';
type Cover = 'metal' | 'profile' | 'shingle' | 'membrane';
type Work = { id: string; name: string; unit: string; qty: number; price: number; group: 'work' | 'material' };
type Project = { id: string; name: string; address: string; client: string; type: RoofType; cover: Cover; length: number; width: number; pitch: number; overhang: number; waste: number; workPrice: number; materialPrice: number; created: string; accessories: RoofAccessory[] };
const KEY = 'stroitel-roof-projects-v1';
const roofNames: Record<RoofType,string> = { gable:'Двускатная', hip:'Вальмовая', shed:'Односкатная', flat:'Плоская' };
const coverNames: Record<Cover,string> = { metal:'Металлочерепица', profile:'Профнастил', shingle:'Гибкая черепица', membrane:'Кровельная мембрана' };
const fmt = (n:number) => new Intl.NumberFormat('ru-RU',{maximumFractionDigits:1}).format(Number.isFinite(n)?n:0);
const rub = (n:number) => new Intl.NumberFormat('ru-RU',{style:'currency',currency:'RUB',maximumFractionDigits:0}).format(Number.isFinite(n)?n:0);
const num = (n:number,min=0) => Math.max(min,Number.isFinite(n)?n:0);
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
    accessories: Array.isArray(item.accessories) ? item.accessories as RoofAccessory[] : [],
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
 const count = (type: RoofAccessory['type']) => (p.accessories || []).filter(a => a.type === type).length;
 const eaveRun = 2 * eaveLength;
 const extras: Work[] = [];
 if (count('gutter') > 0) {
  extras.push(
   {name:'Водосточный желоб',qty:eaveRun,unit:'пог. м',price:650,group:'material'},
   {name:'Кронштейны водостока',qty:Math.ceil(eaveRun/0.6),unit:'шт.',price:180,group:'material'},
   {name:'Соединители и заглушки водостока',qty:Math.max(4,Math.ceil(eaveRun/3)),unit:'компл.',price:250,group:'material'},
   {name:'Монтаж водосточного желоба',qty:eaveRun,unit:'пог. м',price:280,group:'work'}
  );
 }
 if (count('downpipe') > 0) {
  const downpipeLength = count('downpipe') * 2.5;
  extras.push(
   {name:'Водосточная труба',qty:downpipeLength,unit:'пог. м',price:600,group:'material'},
   {name:'Крепления водосточной трубы',qty:count('downpipe')*4,unit:'шт.',price:120,group:'material'},
   {name:'Колена и выпуск водостока',qty:count('downpipe')*2,unit:'шт.',price:250,group:'material'},
   {name:'Монтаж водосточных труб',qty:downpipeLength,unit:'пог. м',price:320,group:'work'}
  );
 }
 if (count('snowGuard') > 0) {
  const guardLength = eaveRun * (p.type === 'gable' ? 1 : 1);
  extras.push(
   {name:'Снегоуловитель',qty:guardLength,unit:'пог. м',price:900,group:'material'},
   {name:'Крепёж снегоуловителя',qty:Math.ceil(guardLength/0.6),unit:'компл.',price:160,group:'material'},
   {name:'Монтаж снегозадержателей',qty:guardLength,unit:'пог. м',price:350,group:'work'}
  );
 }
 if (count('chimney') > 0) extras.push(
  {name:'Комплект герметичного примыкания дымохода',qty:count('chimney'),unit:'компл.',price:4200,group:'material'},
  {name:'Монтаж примыкания дымохода',qty:count('chimney'),unit:'шт.',price:2500,group:'work'}
 );
 if (count('shaft') + count('vent') > 0) extras.push(
  {name:'Комплект проходки вентиляции',qty:count('shaft')+count('vent'),unit:'шт.',price:1800,group:'material'},
  {name:'Монтаж кровельных проходок',qty:count('shaft')+count('vent'),unit:'шт.',price:1200,group:'work'}
 );
 if (count('skylight') > 0) extras.push(
  {name:'Оклад мансардного окна',qty:count('skylight'),unit:'компл.',price:8500,group:'material'},
  {name:'Монтаж мансардного окна',qty:count('skylight'),unit:'шт.',price:6500,group:'work'}
 );
 items.push(...extras);
 return {area:baseArea,orderArea,ridge,eaves,rakes,slopeLength,items,totalMaterials:items.filter(x=>x.group==='material').reduce((s,x)=>s+x.qty*x.price,0),totalWorks:items.filter(x=>x.group==='work').reduce((s,x)=>s+x.qty*x.price,0)};
}
function newProject():Project { return {id:crypto.randomUUID?.()||String(Date.now()),name:'Новая кровля',address:'',client:'',type:'gable',cover:'metal',length:10,width:8,pitch:30,overhang:0.5,waste:10,workPrice:850,materialPrice:0,created:new Date().toISOString(),accessories:[]}; }
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
 const roofDimensions=useMemo(()=>buildRoofGeometry(active||draft),[active,draft]);
 const patch=(v:Partial<Project>)=>{if(!active)return;setProjects(old=>old.map(p=>p.id===active.id?{...p,...v}:p));setSaved(false);};
 const create=()=>{const p={...draft,id:crypto.randomUUID?.()||String(Date.now()),created:new Date().toISOString()};setProjects(old=>[p,...old]);setActiveId(p.id);setScreen('geometry');setShowCreate(false);setDraft(newProject());};
 const goHome=()=>{setActiveId(null);setScreen('home');};
 const exportEstimate=()=>{if(!active)return;const rows=[['Позиция','Кол-во','Ед.','Цена','Сумма'],...c.items.map(x=>[x.name,fmt(x.qty),x.unit,fmt(x.price),fmt(x.qty*x.price)])];const csv='\ufeff'+rows.map(r=>r.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(';')).join('\n')+'\n\nИтого материалы;'+c.totalMaterials+'\nИтого работы;'+c.totalWorks+'\nИтого;'+(c.totalMaterials+c.totalWorks);const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=(active.name||'smeta')+'-smeta.csv';a.click();URL.revokeObjectURL(url);};
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
    {screen==='geometry'&&<div className="detail-layout"><section className="panel geometry-panel"><div className="panel-title"><div><h2>Параметры кровли</h2><p>Изменяйте размеры — расчёт обновляется автоматически</p></div><Ruler size={19}/></div><label className="field-label">Название объекта<input value={active.name} onChange={e=>patch({name:e.target.value})} placeholder="Например, Дом на участке"/></label><label className="field-label">Адрес объекта<input value={active.address} onChange={e=>patch({address:e.target.value})} placeholder="Населённый пункт, улица"/></label><label className="field-label">Заказчик<input value={active.client} onChange={e=>patch({client:e.target.value})} placeholder="Имя заказчика"/></label><label className="field-label">Кровельное покрытие<select value={active.cover} onChange={e=>patch({cover:e.target.value as Cover})}>{Object.entries(coverNames).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label><div className="field-label">Тип крыши<div className="roof-type-grid">{(['gable','hip','shed','flat'] as RoofType[]).map(t=><button key={t} className={'roof-type-option '+(active.type===t?'active':'')} onClick={()=>patch({type:t})}><RoofDrawing type={t} compact/><b>{roofNames[t]}</b>{active.type===t&&<CheckCircle2 size={15}/>}</button>)}</div></div><div className="input-grid"><NumberField label="Длина здания" value={active.length} unit="м" min={0.1} step={0.5} onChange={v=>patch({length:v})}/><NumberField label="Ширина здания" value={active.width} unit="м" min={0.1} step={0.5} onChange={v=>patch({width:v})}/><NumberField label="Угол наклона" value={active.pitch} unit="°" min={0} max={75} step={1} onChange={v=>patch({pitch:v})}/><NumberField label="Свес карниза" value={active.overhang} unit="м" min={0} step={0.1} onChange={v=>patch({overhang:v})}/><NumberField label="Запас материала" value={active.waste} unit="%" min={0} max={40} step={1} onChange={v=>patch({waste:v})}/></div><div className="calculation-note"><Info size={16}/><span>Предварительный расчёт. Для сложной геометрии, ендов, мансардных окон и нестандартного раскроя требуется уточнение замеров.</span></div></section><section className="panel visualization-panel"><div className="panel-title"><div><h2>Чертежи и 3D-модель</h2><p>Виды обновляются при изменении размеров</p></div><div className="visual-actions"><span className="live-tag"><span className="online-dot"/> LIVE</span>{drawingView!=='3d'&&<button className="btn btn-quiet btn-small print-drawing-btn" onClick={()=>window.print()}><Printer size={14}/> Печать / PDF</button>}</div></div><div className="drawing-tabs" role="tablist" aria-label="Режим отображения"><button className={drawingView==='3d'?'active':''} onClick={()=>setDrawingView('3d')}><PanelsTopLeft size={15}/> 3D-модель</button><button className={drawingView==='plan'?'active':''} onClick={()=>setDrawingView('plan')}><Ruler size={15}/> План</button><button className={drawingView==='elevation'?'active':''} onClick={()=>setDrawingView('elevation')}><Home size={15}/> Фасад</button><button className={drawingView==='section'?'active':''} onClick={()=>setDrawingView('section')}><PanelsTopLeft size={15}/> Разрез</button><button className={drawingView==='frame'?'active':''} onClick={()=>setDrawingView('frame')}><Hammer size={15}/> Каркас</button></div><div className="roof-canvas blueprint-canvas"><RoofBlueprint project={active} view={drawingView} cover={active.cover} accessories={active.accessories||[]}/><div className="drawing-legend"><span><i className="legend-roof"/> {drawingView==='3d'?'Кровельное покрытие':drawingView==='frame'?'Несущие элементы':'Проекция и размерные линии'}</span><span><i className="legend-line"/> {drawingView==='3d'?'Рёбра и конёк':'Основные размеры'}</span></div></div><RoofAccessories accessories={active.accessories||[]} length={active.length} width={active.width} overhang={active.overhang} onChange={accessories=>patch({accessories})}/><section className="roof-dimensions-panel" aria-label="Автоматические размеры крыши"><div className="roof-dimensions-heading"><div><h3>Автоматические размеры</h3><p>Обновляются при изменении параметров крыши</p></div><span>МЕТРИЧЕСКАЯ СИСТЕМА</span></div><div className="roof-dimensions-grid"><div><small>Габарит с учётом свесов</small><b>{fmt(roofDimensions.footprint.length)} × {fmt(roofDimensions.footprint.width)} м</b></div><div><small>Площадь скатов</small><b>{fmt(roofDimensions.totalArea)} м²</b></div><div><small>Подъём конька / верхней кромки</small><b>{active.type==='flat'?'—':fmt(roofDimensions.rise)+' м'}</b></div><div><small>Расчётная длина стропила</small><b>{active.type==='flat'?'—':fmt(roofDimensions.rafterLength)+' м'}</b></div><div><small>Длина конька</small><b>{roofDimensions.ridgeLength>0?fmt(roofDimensions.ridgeLength)+' м':'Нет конька'}</b></div><div><small>Периметр по свесам</small><b>{fmt(roofDimensions.eaveLength)} м</b></div></div><p className="roof-dimensions-note"><Info size={14}/> Геометрические ориентиры для предварительного расчёта. Не заменяют рабочий проект, проверку узлов и фактический замер на объекте.</p></section><TimberPanel project={active} geometry={roofDimensions}/><div className="material-visual-key">  <div className="material-key-heading"><b>Материалы кровельного узла</b><span>Визуальные образцы</span></div>  <div className="material-key-grid">    <div><i className={'material-swatch swatch-cover swatch-'+active.cover}/><b>{coverNames[active.cover]}</b><small>Наружное покрытие</small></div>    <div><i className="material-swatch swatch-membrane"/><b>Подкровельная мембрана</b><small>Защита от влаги</small></div>    <div><i className="material-swatch swatch-wood"/><b>Обрешётка и контробрешётка</b><small>Деревянные рейки</small></div>    <div><i className="material-swatch swatch-frame"/><b>Стропильный каркас</b><small>Несущая древесина</small></div>    <div><i className="material-swatch swatch-metal"/><b>Крепёж и планки</b><small>Металлические элементы</small></div>  </div>  <p className="material-key-note">Фактура условная и предназначена для визуализации. Конкретный профиль, цвет, толщину и производителя можно будет выбрать отдельно.</p></div><div className="visual-metrics"><div><small>Площадь покрытия</small><b>{fmt(c.area)} м²</b></div><div><small>С запасом {active.waste}%</small><b>{fmt(c.orderArea)} м²</b></div><div><small>Длина ската</small><b>{fmt(c.slopeLength)} м</b></div></div><div className="next-step-card"><div className="next-step-icon"><Layers3 size={19}/></div><div><b>Перейти к материалам</b><span>Посмотреть предварительную спецификацию</span></div><button onClick={()=>setScreen('materials')}><ChevronRight/></button></div></section></div>}
    {screen==='materials'&&<><div className="summary-cards"><Metric title="Площадь скатов" value={fmt(c.area)+' м²'} hint="Геометрическая оценка" icon={<Home/>}/><Metric title="Заказать покрытие" value={fmt(c.orderArea)+' м²'} hint={'С запасом '+active.waste+'%'} icon={<Layers3/>}/><Metric title="Кровельный крепёж" value={fmt(c.items.find(x=>x.name==='Кровельный крепёж')?.qty||0)+' шт.'} hint="Ориентир 8 шт./м²" icon={<Box/>}/></div><section className="panel table-panel"><div className="panel-title"><div><h2>Спецификация материалов</h2><p>Расчётные количества и редактируемые цены</p></div><span className="count-pill">{c.items.filter(x=>x.group==='material').length} позиций</span></div><div className="table-wrap"><table><thead><tr><th>Материал</th><th>Количество</th><th>Ед.</th><th>Цена за ед.</th><th>Сумма</th></tr></thead><tbody>{c.items.filter(x=>x.group==='material').map((x,i)=><tr key={x.name}><td><span className="material-index">{String(i+1).padStart(2,'0')}</span>{x.name}</td><td>{fmt(x.qty)}</td><td>{x.unit}</td><td>{rub(x.price)}</td><td className="sum-cell">{rub(x.qty*x.price)}</td></tr>)}</tbody></table></div><div className="table-total"><span>Предварительная стоимость материалов</span><b>{rub(c.totalMaterials)}</b></div><div className="calculation-note"><Info size={16}/><span>Нормы расхода ориентировочные. Реальное количество зависит от рабочей ширины листа, длины ската, схемы раскладки, производителя и упаковки.</span></div><button className="btn btn-primary" onClick={()=>setScreen('estimate')}><Calculator size={16}/> Собрать смету <ChevronRight size={16}/></button></section></>}
    {screen==='estimate'&&<><div className="estimate-hero"><div><div className="overline">ИТОГОВАЯ СМЕТА</div><h2>Стоимость кровельных работ</h2><p>{active.name} · {fmt(c.area)} м² покрытия</p></div><div className="estimate-total">{rub(c.totalMaterials+c.totalWorks)}<small>ориентировочная сумма</small></div></div><div className="estimate-controls"><NumberField label="Монтаж покрытия" value={active.workPrice} unit="₽/м²" min={0} step={50} onChange={v=>patch({workPrice:v})}/><NumberField label="Запас материала" value={active.waste} unit="%" min={0} max={40} step={1} onChange={v=>patch({waste:v})}/></div><div className="estimate-columns"><section className="panel table-panel"><div className="panel-title"><div><h2>Материалы</h2><p>Поставка и комплектующие</p></div></div><div className="estimate-lines">{c.items.filter(x=>x.group==='material').map(x=><div className="estimate-line" key={x.name}><div><b>{x.name}</b><small>{fmt(x.qty)} {x.unit} × {rub(x.price)}</small></div><strong>{rub(x.qty*x.price)}</strong></div>)}</div><div className="estimate-subtotal"><span>Итого материалы</span><b>{rub(c.totalMaterials)}</b></div></section><section className="panel table-panel"><div className="panel-title"><div><h2>Работы</h2><p>Монтажные операции</p></div></div><div className="estimate-lines">{c.items.filter(x=>x.group==='work').map(x=><div className="estimate-line" key={x.name}><div><b>{x.name}</b><small>{fmt(x.qty)} {x.unit} × {rub(x.price)}</small></div><strong>{rub(x.qty*x.price)}</strong></div>)}</div><div className="estimate-subtotal"><span>Итого работы</span><b>{rub(c.totalWorks)}</b></div></section></div><div className="estimate-footer"><div><small>Общая стоимость проекта</small><h2>{rub(c.totalMaterials+c.totalWorks)}</h2><p>Расчёт предварительный, уточняется после замеров и выбора конкретных материалов.</p></div><button className="btn btn-primary" onClick={exportEstimate}><Download size={17}/> Скачать смету CSV</button></div></>}
   </div>:null}
  </main>
  {showCreate&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setShowCreate(false)}}><div className="create-modal"><div className="modal-head"><div><div className="overline">НОВЫЙ ПРОЕКТ</div><h2>Создать кровлю</h2><p>Начните с базовых размеров объекта</p></div><button className="icon-button" onClick={()=>setShowCreate(false)}><X size={19}/></button></div><label className="field-label">Название объекта<input value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})}/></label><label className="field-label">Адрес<input value={draft.address} onChange={e=>setDraft({...draft,address:e.target.value})} placeholder="Город, улица"/></label><label className="field-label">Тип крыши<select value={draft.type} onChange={e=>setDraft({...draft,type:e.target.value as RoofType})}>{Object.entries(roofNames).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label><div className="input-grid"><NumberField label="Длина здания" value={draft.length} unit="м" min={0.1} step={0.5} onChange={v=>setDraft({...draft,length:v})}/><NumberField label="Ширина здания" value={draft.width} unit="м" min={0.1} step={0.5} onChange={v=>setDraft({...draft,width:v})}/></div><div className="modal-actions"><button className="btn btn-quiet" onClick={()=>setShowCreate(false)}>Отмена</button><button className="btn btn-primary" onClick={create}><Plus size={17}/> Создать и рассчитать</button></div></div></div>}
 </div>;
}

type TimberProject = Pick<Project,'type'|'length'|'width'|'pitch'|'overhang'>;
function TimberPanel({project,geometry}:{project:TimberProject;geometry:ReturnType<typeof buildRoofGeometry>}){
 const [rafterStep,setRafterStep]=useState(0.6);
 const [battenStep,setBattenStep]=useState(0.35);
 const [rafterA,setRafterA]=useState(50);
 const [rafterB,setRafterB]=useState(200);
 const [battenA,setBattenA]=useState(25);
 const [battenB,setBattenB]=useState(100);
 const [counterA,setCounterA]=useState(30);
 const [counterB,setCounterB]=useState(50);
 const [stockLength,setStockLength]=useState(6);
 const data=useMemo(()=>{
  const validStep=Math.max(0.1,rafterStep), validBatten=Math.max(0.1,battenStep);
  const along=Math.max(0,geometry.footprint.length);
  const across=Math.max(0,geometry.footprint.width);
  const lines=Math.ceil(along/validStep)+1;
  const commonCount=project.type==='flat'?0:project.type==='gable'?lines*2:project.type==='shed'?lines:lines*2+4;
  const commonLm=commonCount*geometry.rafterLength;
  const hipDiagonal=project.type==='hip'?Math.hypot(Math.min(along,across)/2,geometry.rise):0;
  const hipLm=project.type==='hip'?4*hipDiagonal:0;
  const rafterLm=commonLm+hipLm;
  const battensLm=project.type==='flat'?0:geometry.totalArea/validBatten;
  const counterLm=project.type==='flat'?0:rafterLm;
  const rafterVol=rafterLm*(rafterA/1000)*(rafterB/1000);
  const battenVol=battensLm*(battenA/1000)*(battenB/1000);
  const counterVol=counterLm*(counterA/1000)*(counterB/1000);
  const stockCount=(lm:number)=>Math.ceil(lm/Math.max(1,stockLength));
  return {lines,commonCount,hipDiagonal,hipLm,rafterLm,battensLm,counterLm,rafterVol,battenVol,counterVol,totalVol:rafterVol+battenVol+counterVol,rafterBoards:stockCount(rafterLm),battenBoards:stockCount(battensLm),counterBoards:stockCount(counterLm)};
 },[project.type,geometry,rafterStep,battenStep,rafterA,rafterB,battenA,battenB,counterA,counterB,stockLength]);
 return <section className="panel timber-panel"><div className="panel-title"><div><h2>Пиломатериалы и предварительный раскрой</h2><p>Расчёт по геометрии крыши и выбранным шагам</p></div><span className="count-pill">МЕТРИЧЕСКАЯ СИСТЕМА</span></div>
 <div className="timber-input-grid">
  <NumberField label="Шаг стропил" value={rafterStep} unit="м" min={0.1} max={2} step={0.05} onChange={setRafterStep}/>
  <NumberField label="Шаг обрешётки" value={battenStep} unit="м" min={0.1} max={1.5} step={0.05} onChange={setBattenStep}/>
  <NumberField label="Длина стандартной доски" value={stockLength} unit="м" min={2} max={12} step={1} onChange={setStockLength}/>
 </div>
 <div className="timber-subheading">Сечения древесины, мм</div>
 <div className="timber-section-grid">
  <div className="timber-section-control"><b>Стропила</b><NumberField label="Толщина" value={rafterA} unit="мм" min={10} max={300} step={5} onChange={setRafterA}/><NumberField label="Высота" value={rafterB} unit="мм" min={10} max={500} step={5} onChange={setRafterB}/></div>
  <div className="timber-section-control"><b>Обрешётка</b><NumberField label="Толщина" value={battenA} unit="мм" min={10} max={100} step={5} onChange={setBattenA}/><NumberField label="Ширина" value={battenB} unit="мм" min={10} max={200} step={5} onChange={setBattenB}/></div>
  <div className="timber-section-control"><b>Контробрешётка</b><NumberField label="Толщина" value={counterA} unit="мм" min={10} max={100} step={5} onChange={setCounterA}/><NumberField label="Ширина" value={counterB} unit="мм" min={10} max={200} step={5} onChange={setCounterB}/></div>
 </div>
 <div className="timber-result-grid">
  <div><small>Стропила, всего</small><b>{fmt(data.commonCount)} шт.</b><span>{fmt(data.rafterLm)} пог. м</span></div>
  <div><small>Обрешётка</small><b>{fmt(data.battensLm)} пог. м</b><span>Оценка по площади / шагу</span></div>
  <div><small>Контробрешётка</small><b>{fmt(data.counterLm)} пог. м</b><span>По линиям стропил</span></div>
  <div><small>Объём древесины</small><b>{fmt(data.totalVol)} м³</b><span>Сумма трёх заданных сечений</span></div>
 </div>
 <div className="timber-cut-list"><div><b>Предварительное количество досок по общей длине</b><span>Не оптимизированная карта раскроя; стыки, обрезки и длина каждого элемента не учтены.</span></div><div><small>Стропила</small><b>{fmt(data.rafterBoards)} шт. по {fmt(stockLength)} м</b></div><div><small>Обрешётка</small><b>{fmt(data.battenBoards)} шт. по {fmt(stockLength)} м</b></div><div><small>Контробрешётка</small><b>{fmt(data.counterBoards)} шт. по {fmt(stockLength)} м</b></div></div>
 <div className="calculation-note"><Info size={16}/><span>{project.type==='flat'?'Для плоской крыши расчёт стропил и обрешётки отключён: сначала нужно задать схему несущих балок и кровельного пирога. ':'Для вальмовой крыши диагональные стропила учитываются укрупнённо, без точного подсчёта нарожников. '}Все значения предварительные. Это не инженерный расчёт: сечения, пролёты, шаг и узлы необходимо проверять по снеговой/ветровой нагрузке, породе и сорту древесины.</span></div>
 </section>;
}

function NumberField({label,value,unit,min=0,max,step=1,onChange}:{label:string;value:number;unit:string;min?:number;max?:number;step?:number;onChange:(v:number)=>void}){return <label className="field-label">{label}<span className="number-wrap"><input type="number" min={min} max={max} step={step} value={value} onChange={e=>onChange(num(Number(e.target.value),min))}/><span>{unit}</span></span></label>}
function Metric({title,value,hint,icon}:{title:string;value:string;hint:string;icon:React.ReactNode}){return <div className="metric-card"><span className="metric-icon">{icon}</span><small>{title}</small><b>{value}</b><span className="metric-hint">{hint}</span></div>}
function RoofDrawing({type,compact=false}:{type:RoofType;compact?:boolean}){
 const view=type==='gable'?<><polygon points="50,18 174,18 174,112 50,112" fill="#c9d7d0"/><polygon points="50,18 112,65 112,160 50,112" fill="#94ada2"/><polygon points="112,65 174,18 174,112 112,160" fill="#a8beb4"/><line x1="112" y1="65" x2="112" y2="160" stroke="#f6f7f2" strokeWidth="2.5"/></>:type==='hip'?<><polygon points="112,14 176,52 176,112 112,154 48,112 48,52" fill="#a7bbb1"/><polygon points="112,14 112,154 48,112" fill="#819f93"/><polygon points="112,14 176,52 112,78" fill="#d0ddd5"/><polygon points="112,78 176,52 176,112 112,154" fill="#9bb3a8"/><line x1="112" y1="78" x2="112" y2="154" stroke="#f7f8f5" strokeWidth="2"/></>:type==='shed'?<><polygon points="48,28 176,14 176,132 48,146" fill="#a7bbb1"/><line x1="48" y1="68" x2="176" y2="54" stroke="#f7f8f5" strokeWidth="2"/><line x1="48" y1="108" x2="176" y2="94" stroke="#f7f8f5" strokeWidth="2"/></>:<><polygon points="48,36 176,36 176,130 48,130" fill="#b9c9c1"/><line x1="90" y1="36" x2="90" y2="130" stroke="#f7f8f5" strokeWidth="2"/><line x1="134" y1="36" x2="134" y2="130" stroke="#f7f8f5" strokeWidth="2"/><line x1="48" y1="67" x2="176" y2="67" stroke="#f7f8f5" strokeWidth="2"/><line x1="48" y1="98" x2="176" y2="98" stroke="#f7f8f5" strokeWidth="2"/></>;
 return <svg className={'roof-drawing '+(compact?'compact':'')} viewBox="0 0 224 176" role="img" aria-label={'Схема крыши: '+roofNames[type]}><defs><filter id={'shadow-'+type}><feDropShadow dx="0" dy="7" stdDeviation="6" floodColor="#0e3526" floodOpacity=".15"/></filter></defs><g filter={'url(#shadow-'+type+')'}>{view}</g>{!compact&&<g className="dimension-labels"><text x="112" y="171" textAnchor="middle">ДЛИНА</text><text x="24" y="87" textAnchor="middle" transform="rotate(-90 24 87)">ШИРИНА</text></g>}</svg>
}
