import React from 'react';
import { buildRoofGeometry, type Point3, type RoofGeometryInput } from './roofGeometry';
import InteractiveRoof3D from './InteractiveRoof3D';
import type { RoofAccessory } from './RoofAccessories';

export type RoofType = 'gable' | 'hip' | 'shed' | 'flat';
export type RoofProject = RoofGeometryInput;
export type RoofView = '3d' | 'plan' | 'elevation' | 'section' | 'frame';

const names: Record<RoofType, string> = {
  gable: 'Двускатная', hip: 'Вальмовая', shed: 'Односкатная', flat: 'Плоская',
};
const fmt = (n: number) => new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(Number.isFinite(n) ? n : 0);
const polylineOf = (points: { x: number; y: number }[]) => points.map((p, i) => `${i ? 'L' : 'M'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ');
const pathOf = (points: { x: number; y: number }[]) => polylineOf(points) + ' Z';

function Dimension({ x1, y1, x2, y2, label, vertical = false, ext1, ext2 }: {
  x1: number; y1: number; x2: number; y2: number; label: string; vertical?: boolean;
  ext1?: { x: number; y: number }; ext2?: { x: number; y: number };
}) {
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  return <g className="bp-dim">
    {ext1 && <line className="bp-extension" x1={ext1.x} y1={ext1.y} x2={x1} y2={y1}/>}
    {ext2 && <line className="bp-extension" x1={ext2.x} y1={ext2.y} x2={x2} y2={y2}/>}
    <line className="bp-dimension-line" x1={x1} y1={y1} x2={x2} y2={y2}/>
    <text x={mx} y={my - 6} textAnchor="middle" transform={vertical ? `rotate(-90 ${mx} ${my})` : undefined}>{label}</text>
  </g>;
}

export default function RoofBlueprint({ project, view, cover = 'metal', accessories = [] }: { project: RoofProject; view: RoofView; cover?: 'metal' | 'profile' | 'shingle' | 'membrane'; accessories?: RoofAccessory[] }) {
  const geometry = buildRoofGeometry(project);
  const { length: L, width: W } = geometry.footprint;
  const roofType = project.type;
  const frame = { x: 32, y: 30, w: 696, h: 440 };
  const baseDefs = <defs>
    <pattern id="bpGrid" width="20" height="20" patternUnits="userSpaceOnUse">
      <path d="M20 0H0V20" fill="none" stroke="#e7ecef" strokeWidth=".8"/>
    </pattern>
    <pattern id="bpCoverPattern" width={cover === "profile" ? 14 : cover === "shingle" ? 28 : cover === "membrane" ? 18 : 24} height={cover === "shingle" ? 14 : 24} patternUnits="userSpaceOnUse">
      <rect width="100%" height="100%" fill={cover === "metal" ? "#718896" : cover === "profile" ? "#7f98a3" : cover === "shingle" ? "#5c5a57" : "#a9b8b5"}/>
      {cover === "metal" && <><path d="M0 1H24 M0 4H24" stroke="#c0cdd3" strokeWidth="1.4"/><path d="M0 6H24" stroke="#3d5968" strokeWidth="1.2"/><path d="M5 6V24 M8 6V24" stroke="#9eafb8" strokeWidth="1.2"/></>}
      {cover === "profile" && <><path d="M0 0V24 M3 0V24 M7 0V24" stroke="#d0dbe0" strokeWidth="1.4"/><path d="M9 0V24" stroke="#405c69" strokeWidth="2"/></>}
      {cover === "shingle" && <><path d="M0 1H28 M0 13H28 M14 1V13 M0 13V24 M28 13V24" stroke="#282f31" strokeWidth="1.4" fill="none"/><path d="M1 3H13 M15 15H27" stroke="#89857f" strokeWidth="1"/></>}
      {cover === "membrane" && <><path d="M0 5H18 M0 17H18" stroke="#dce5e2" strokeWidth="1.2"/><path d="M4 0L0 5 M13 12L9 17" stroke="#809490" strokeWidth="1"/></>}
    </pattern>
    <pattern id="bpFineGrid" width="5" height="5" patternUnits="userSpaceOnUse">
      <path d="M5 0H0V5" fill="none" stroke="#f0f3f5" strokeWidth=".5"/>
    </pattern>
    <linearGradient id="bpFaceA" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stopColor="#d8e5ec"/><stop offset="1" stopColor="#8fa9b8"/>
    </linearGradient>
    <linearGradient id="bpFaceB" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="#b7ccd8"/><stop offset="1" stopColor="#7896a7"/>
    </linearGradient>
    <clipPath id="bpDrawingClip"><rect x="45" y="80" width="670" height="320" rx="1"/></clipPath>
    <marker id="bpArrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto-start-reverse">
      <path d="M0,0 L6,3 L0,6 z" fill="#506c7b"/>
    </marker>
  </defs>;

  const scalePlan = Math.min(500 / Math.max(L, 1), 240 / Math.max(W, 1));
  const planLeft = (760 - L * scalePlan) / 2;
  const planTop = 230 - W * scalePlan / 2;
  const planPoint = (p: Point3) => ({ x: planLeft + (p.x + project.overhang) * scalePlan, y: planTop + (p.y + project.overhang) * scalePlan });
  const project3D = (p: Point3) => {
    const s = Math.min(300 / Math.max(L + W, 1), 190 / Math.max(0.34 * (L + W) + 1.35 * geometry.rise, 1));
    return { x: 380 + (p.x - p.y) * s * 0.72, y: 270 + (p.x + p.y) * s * 0.34 - p.z * s * 1.35 };
  };
  const drawingBorder = <g>
    <rect x={frame.x} y={frame.y} width={frame.w} height={frame.h} fill="#fff" stroke="#9eacb5" strokeWidth="1.2"/>
    <rect x={frame.x + 7} y={frame.y + 7} width={frame.w - 14} height={frame.h - 14} fill="#fff" stroke="#d8e0e5"/>
    <rect x="490" y="414" width="224" height="42" fill="#fff" stroke="#9eacb5"/>
    <line x1="490" y1="435" x2="714" y2="435" stroke="#c5cfd5"/>
    <line x1="620" y1="414" x2="620" y2="456" stroke="#c5cfd5"/>
    <text x="500" y="428" className="bp-title">{names[roofType].toUpperCase()} КРОВЛЯ</text>
    <text x="500" y="448" className="bp-meta">СХЕМА · НЕ ДЛЯ МОНТАЖА</text>
    <text x="630" y="428" className="bp-meta">ЕДИНИЦЫ</text>
    <text x="630" y="448" className="bp-title">МЕТРЫ</text>
  </g>;

  const roof3d = <g>
    {geometry.faces.map((f, i) => {
      const pts = f.points.map(project3D);
      return <g key={f.id}>
        <path d={pathOf(pts)} fill="url(#bpCoverPattern)" stroke="#304f61" strokeWidth="1.8" strokeLinejoin="round"/>
        {f.points.length === 4 && <path d={pathOf(pts)} fill="none" stroke="#eaf2f5" strokeWidth=".7" opacity=".9"/>}
      </g>;
    })}
    <g fill="none" stroke="#284a5c" strokeWidth="1.2">
      {geometry.faces.map(f => <path key={'edge-'+f.id} d={pathOf(f.points.map(project3D))}/>)}
    </g>
    <text x="380" y="400" textAnchor="middle" className="bp-note">ГЕОМЕТРИЧЕСКАЯ МОДЕЛЬ · {fmt(geometry.totalArea)} м²</text>
  </g>;

  const plan = <g>
    {geometry.faces.map(f => <path key={f.id} d={pathOf(f.points.map(planPoint))} fill="url(#bpCoverPattern)" fillOpacity=".9" stroke="#38586a" strokeWidth="1.35" strokeLinejoin="round"/>)}
    <rect x={planLeft + project.overhang * scalePlan} y={planTop + project.overhang * scalePlan} width={Math.max(0, L - 2 * project.overhang) * scalePlan} height={Math.max(0, W - 2 * project.overhang) * scalePlan} fill="none" stroke="#314b59" strokeWidth="1.2" strokeDasharray="5 4"/>
    {roofType === 'gable' && <g stroke="#173f55" strokeWidth="2.4" fill="none">
      <line x1={planLeft} y1={planTop + W * scalePlan / 2} x2={planLeft + L * scalePlan} y2={planTop + W * scalePlan / 2}/>
    </g>}
    {roofType === 'hip' && <g stroke="#173f55" strokeWidth="2.2" fill="none" strokeLinejoin="round">
      {L >= W
        ? <><line x1={planLeft + W * scalePlan / 2} y1={planTop + W * scalePlan / 2} x2={planLeft + (L - W / 2) * scalePlan} y2={planTop + W * scalePlan / 2}/><line x1={planLeft} y1={planTop} x2={planLeft + W * scalePlan / 2} y2={planTop + W * scalePlan / 2}/><line x1={planLeft} y1={planTop + W * scalePlan} x2={planLeft + W * scalePlan / 2} y2={planTop + W * scalePlan / 2}/><line x1={planLeft + L * scalePlan} y1={planTop} x2={planLeft + (L - W / 2) * scalePlan} y2={planTop + W * scalePlan / 2}/><line x1={planLeft + L * scalePlan} y1={planTop + W * scalePlan} x2={planLeft + (L - W / 2) * scalePlan} y2={planTop + W * scalePlan / 2}/></>
        : <><line x1={planLeft + L * scalePlan / 2} y1={planTop + L * scalePlan / 2} x2={planLeft + L * scalePlan / 2} y2={planTop + (W - L / 2) * scalePlan}/><line x1={planLeft} y1={planTop} x2={planLeft + L * scalePlan / 2} y2={planTop + L * scalePlan / 2}/><line x1={planLeft + L * scalePlan} y1={planTop} x2={planLeft + L * scalePlan / 2} y2={planTop + L * scalePlan / 2}/><line x1={planLeft} y1={planTop + W * scalePlan} x2={planLeft + L * scalePlan / 2} y2={planTop + (W - L / 2) * scalePlan}/><line x1={planLeft + L * scalePlan} y1={planTop + W * scalePlan} x2={planLeft + L * scalePlan / 2} y2={planTop + (W - L / 2) * scalePlan}/></>}
    </g>}
    {roofType === 'shed' && <g stroke="#173f55" strokeWidth="1.7" fill="none">{[0.28,0.5,0.72].map((t,i)=><path key={i} d={`M ${planLeft + L*scalePlan*t} ${planTop + 22} l 0 22 l -4 -5 m 4 5 l 4 -5`}/>)}</g>}
    {roofType === 'flat' && <g stroke="#547786" strokeWidth="1.5" fill="none">{[0.25,0.5,0.75].map((t,i)=><path key={i} d={`M ${planLeft + L*scalePlan*t} ${planTop + W*scalePlan*0.35} l 0 20 l -4 -5 m 4 5 l 4 -5`}/>)}</g>}
    {geometry.faces.map(f => <text key={'label-'+f.id} x={f.points.map(planPoint).reduce((s,p)=>s+p.x,0)/f.points.length} y={f.points.map(planPoint).reduce((s,p)=>s+p.y,0)/f.points.length} textAnchor="middle" className="bp-face-label">{f.label}</text>)}
    <Dimension x1={planLeft} y1={planTop - 28} x2={planLeft + L * scalePlan} y2={planTop - 28} ext1={{x:planLeft,y:planTop}} ext2={{x:planLeft + L * scalePlan,y:planTop}} label={fmt(L) + ' м'}/>
    <Dimension x1={planLeft - 30} y1={planTop} x2={planLeft - 30} y2={planTop + W * scalePlan} ext1={{x:planLeft,y:planTop}} ext2={{x:planLeft,y:planTop + W * scalePlan}} label={fmt(W) + ' м'} vertical/>
    <text x="380" y="395" textAnchor="middle" className="bp-note">ПЛАН СКАТОВ · КОНЁК / РЁБРА / СВЕСЫ</text>
  </g>;

  const elevScale = Math.min(430 / Math.max(W, 1), 205 / Math.max(geometry.rise, 1), 1);
  const ex = (760 - W * elevScale) / 2;
  const ground = 345;
  const eaveY = ground - Math.max(18, geometry.rise * elevScale * 0.16);
  const ridgeY = ground - geometry.rise * elevScale;
  const eaveLeft = { x: ex, y: eaveY };
  const eaveRight = { x: ex + W * elevScale, y: eaveY };
  const ridge = { x: ex + W * elevScale / 2, y: ridgeY };
  const elevation = <g>
    <line x1={ex-24} y1={ground} x2={ex+W*elevScale+24} y2={ground} stroke="#8a9aa3" strokeWidth=".8" strokeDasharray="4 3"/>
    <path d={`M ${ex+8} ${ground} V ${eaveY} L ${ex+W*elevScale-8} ${eaveY} V ${ground}`} fill="#f1f4f5" stroke="#617985" strokeWidth="1.1"/>
    {roofType === 'gable' || roofType === 'hip'
      ? <path d={`M ${ex-10} ${eaveY} L ${ridge.x} ${ridgeY} L ${ex+W*elevScale+10} ${eaveY}`} fill="none" stroke="#203f4e" strokeWidth="2.8" strokeLinejoin="round"/>
      : roofType === 'shed'
        ? <path d={`M ${ex-10} ${eaveY-geometry.rise*elevScale*0.55} L ${ex+W*elevScale+10} ${eaveY}`} fill="none" stroke="#203f4e" strokeWidth="2.8"/>
        : <line x1={ex-10} y1={eaveY} x2={ex+W*elevScale+10} y2={eaveY} stroke="#203f4e" strokeWidth="2.8"/>}
    {roofType === 'gable' && <path d={`M ${ex+8} ${ground} L ${ridge.x} ${eaveY} L ${ex+W*elevScale-8} ${ground}`} fill="none" stroke="#91a4ad" strokeWidth=".8" strokeDasharray="4 3"/>}
    <line x1={ex} y1={ground+25} x2={ex+W*elevScale} y2={ground+25} stroke="#344e5b" strokeWidth=".85" markerStart="url(#bpArrow)" markerEnd="url(#bpArrow)"/>
    <line x1={ex} y1={ground} x2={ex} y2={ground+30} stroke="#71838d" strokeWidth=".65"/>
    <line x1={ex+W*elevScale} y1={ground} x2={ex+W*elevScale} y2={ground+30} stroke="#71838d" strokeWidth=".65"/>
    <text x={ex+W*elevScale/2} y={ground+19} textAnchor="middle" className="bp-dim-label">{fmt(W)} м</text>
    {geometry.rise > 0.01 && <g>
      <line x1={ex+W*elevScale+25} y1={ground} x2={ex+W*elevScale+25} y2={ridgeY} stroke="#344e5b" strokeWidth=".85" markerStart="url(#bpArrow)" markerEnd="url(#bpArrow)"/>
      <line x1={ex+W*elevScale} y1={ground} x2={ex+W*elevScale+30} y2={ground} stroke="#71838d" strokeWidth=".65"/>
      <line x1={ridge.x} y1={ridgeY} x2={ex+W*elevScale+30} y2={ridgeY} stroke="#71838d" strokeWidth=".65"/>
      <text x={ex+W*elevScale+32} y={(ground+ridgeY)/2} textAnchor="middle" className="bp-dim-label" transform={`rotate(-90 ${ex+W*elevScale+32} ${(ground+ridgeY)/2})`}>{fmt(geometry.rise)} м</text>
    </g>}
    <text x="380" y="390" textAnchor="middle" className="bp-note">ФАСАДНЫЙ ПРОФИЛЬ · УКЛОН ${fmt(project.pitch)}°</text>
  </g>;

  const sectionScale = Math.min(430 / Math.max(W, 1), 205 / Math.max(geometry.rise, 1), 1);
  const sx = (760 - W * sectionScale) / 2;
  const sy = 345;
  const sectionPeak = sy - geometry.rise * sectionScale;
  const section = <g>
    <line x1={sx-24} y1={sy} x2={sx+W*sectionScale+24} y2={sy} stroke="#8a9aa3" strokeWidth=".8" strokeDasharray="4 3"/>
    <rect x={sx+8} y={sy} width={Math.max(1,W*sectionScale-16)} height="10" fill="#dce4e8" stroke="#617985" strokeWidth="1"/>
    {roofType === 'gable' || roofType === 'hip' ? <>
      <path d={`M ${sx-8} ${sy} L ${sx+W*sectionScale/2} ${sectionPeak} L ${sx+W*sectionScale+8} ${sy}`} fill="none" stroke="#203f4e" strokeWidth="2.8" strokeLinejoin="round"/>
      {Array.from({length:Math.min(18,Math.max(3,Math.floor(W/0.6)))},(_,i)=>{
        const count=Math.min(18,Math.max(3,Math.floor(W/0.6)));
        const x=sx+(i+1)*W*sectionScale/(count+1);
        const center=sx+W*sectionScale/2;
        const ratio=Math.max(0,1-Math.abs(x-center)/(W*sectionScale/2));
        const y=sy-geometry.rise*sectionScale*ratio;
        return <line key={i} x1={x} y1={sy} x2={x} y2={y} stroke="#a96f3f" strokeWidth="1.6"/>;
      })}
      <line x1={sx+W*sectionScale/2} y1={sectionPeak} x2={sx+W*sectionScale/2} y2={sy} stroke="#6f8996" strokeWidth="1" strokeDasharray="4 3"/>
    </> : roofType === 'shed'
      ? <path d={`M ${sx-8} ${sy} L ${sx+W*sectionScale+8} ${sy-geometry.rise*sectionScale}`} fill="none" stroke="#203f4e" strokeWidth="2.8"/>
      : <line x1={sx-8} y1={sy-2} x2={sx+W*sectionScale+8} y2={sy-2} stroke="#203f4e" strokeWidth="2.8"/>}
    <line x1={sx} y1={sy+27} x2={sx+W*sectionScale} y2={sy+27} stroke="#344e5b" strokeWidth=".85" markerStart="url(#bpArrow)" markerEnd="url(#bpArrow)"/>
    <line x1={sx} y1={sy+5} x2={sx} y2={sy+32} stroke="#71838d" strokeWidth=".65"/>
    <line x1={sx+W*sectionScale} y1={sy+5} x2={sx+W*sectionScale} y2={sy+32} stroke="#71838d" strokeWidth=".65"/>
    <text x={sx+W*sectionScale/2} y={sy+21} textAnchor="middle" className="bp-dim-label">{fmt(W)} м</text>
    <text x="380" y="390" textAnchor="middle" className="bp-note">ПОПЕРЕЧНЫЙ РАЗРЕЗ · СХЕМА СТРОПИЛЬНОЙ СИСТЕМЫ</text>
  </g>;

  const frameView = <g>
    {geometry.faces.map(f => <path key={'roof-outline-'+f.id} d={pathOf(f.points.map(project3D))} fill="none" stroke="#a8b7bf" strokeWidth="1" strokeDasharray="4 4"/>)}
    {(() => {
      const span = Math.max(0.1, project.width);
      const run = Math.max(0.1, project.length);
      const e = Math.max(0, project.overhang);
      const count = Math.min(28, Math.max(3, Math.ceil(run / 0.6)));
      const xs = Array.from({length: count}, (_, i) => -e + (run + 2 * e) * (i + 1) / (count + 1));
      const ridgeStart = roofType === 'hip' ? span / 2 : 0;
      const ridgeEnd = roofType === 'hip' ? run - span / 2 : run;
      const members: {id:string; points:Point3[]; color:string; width:number}[] = [];
      const add = (id:string, points:Point3[], color='#a96f3f', width=1.8) => members.push({id,points,color,width});
      // Longitudinal eaves and the ridge/purlin line.
      add('eave-near', [{x:-e,y:-e,z:0},{x:run+e,y:-e,z:0}], '#294d60', 2.6);
      add('eave-far', [{x:-e,y:span+e,z:0},{x:run+e,y:span+e,z:0}], '#294d60', 2.6);
      if (roofType === 'gable' || roofType === 'hip') {
        add('ridge', [{x:ridgeStart,y:span/2,z:geometry.rise},{x:ridgeEnd,y:span/2,z:geometry.rise}], '#294d60', 2.8);
        if (roofType === 'hip') {
          add('hip-front-near', [{x:0,y:-e,z:0},{x:ridgeStart,y:span/2,z:geometry.rise}], '#294d60', 2.2);
          add('hip-front-far', [{x:0,y:span+e,z:0},{x:ridgeStart,y:span/2,z:geometry.rise}], '#294d60', 2.2);
          add('hip-back-near', [{x:run,y:-e,z:0},{x:ridgeEnd,y:span/2,z:geometry.rise}], '#294d60', 2.2);
          add('hip-back-far', [{x:run,y:span+e,z:0},{x:ridgeEnd,y:span/2,z:geometry.rise}], '#294d60', 2.2);
        }
      }
      xs.forEach((x, i) => {
        let zNear = 0, zFar = 0;
        if (roofType === 'gable') { zNear = 0; zFar = 0; }
        if (roofType === 'hip') {
          const endFactor = Math.max(0, Math.min(1, Math.min(x, run - x) / Math.max(span / 2, 0.1)));
          zNear = 0; zFar = 0;
          const peak = geometry.rise * endFactor;
          add('rafter-left-'+i, [{x,y:-e,z:0},{x,y:span/2,z:peak}], '#b07847', 1.7);
          add('rafter-right-'+i, [{x,y:span/2,z:peak},{x,y:span+e,z:0}], '#b07847', 1.7);
          return;
        }
        if (roofType === 'gable') {
          add('rafter-'+i, [{x,y:-e,z:0},{x,y:span/2,z:geometry.rise},{x,y:span+e,z:0}], '#b07847', 1.7);
        } else if (roofType === 'shed') {
          add('rafter-'+i, [{x,y:-e,z:0},{x,y:span+e,z:geometry.rise}], '#b07847', 1.7);
        } else {
          add('rafter-'+i, [{x,y:-e,z:0},{x,y:span+e,z:0}], '#b07847', 1.7);
        }
      });
      return <g>{members.map(m => <path key={m.id} d={polylineOf(m.points.map(project3D))} fill="none" stroke={m.color} strokeWidth={m.width} strokeLinejoin="round" strokeLinecap="round"/>)}</g>;
    })()}
    <text x="380" y="377" textAnchor="middle" className="bp-note">КАРКАС · ДЛИНА {fmt(project.length)} м · ШИРИНА {fmt(project.width)} м · ШАГ СТРОПИЛ УСЛОВНЫЙ</text>
    <text x="380" y="394" textAnchor="middle" className="bp-note">СХЕМА НЕ ЗАДАЁТ СЕЧЕНИЯ БРУСА И УЗЛЫ КРЕПЛЕНИЯ</text>
  </g>;

  const title = view === '3d' ? 'ОБЪЁМНАЯ МОДЕЛЬ' : view === 'plan' ? 'ПЛАН КРОВЛИ' : view === 'elevation' ? 'ФАСАД / ПРОФИЛЬ' : view === 'section' ? 'ПОПЕРЕЧНЫЙ РАЗРЕЗ' : 'СТРОПИЛЬНЫЙ КАРКАС';
  const drawing = view === '3d' ? roof3d : view === 'plan' ? plan : view === 'elevation' ? elevation : view === 'section' ? section : frameView;
  if (view === '3d') return <InteractiveRoof3D project={project} cover={cover} accessories={accessories} />;
  return <svg className={'roof-blueprint bp-view-' + view} viewBox="0 0 760 500" role="img" aria-label={title + ', ' + names[roofType]}>
    {baseDefs}
    {drawingBorder}
    <text x="48" y="57" className="bp-sheet-heading">{title}</text>
    <text x="48" y="74" className="bp-sheet-subtitle">{names[roofType]} · {fmt(project.length)} × {fmt(project.width)} м · уклон {fmt(project.pitch)}°</text>
    <g clipPath="url(#bpDrawingClip)">{drawing}</g>
    <text x="48" y="448" className="bp-meta">ПРОЕКТНАЯ ГЕОМЕТРИЯ · ПРОВЕРЬТЕ РАЗМЕРЫ ПЕРЕД РАБОТАМИ</text>
  </svg>;
}
