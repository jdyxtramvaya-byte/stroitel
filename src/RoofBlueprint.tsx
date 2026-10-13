import React from 'react';
import { buildRoofGeometry, type Point3, type RoofGeometryInput } from './roofGeometry';
import InteractiveRoof3D from './InteractiveRoof3D';

export type RoofType = 'gable' | 'hip' | 'shed' | 'flat';
export type RoofProject = RoofGeometryInput;
export type RoofView = '3d' | 'plan' | 'elevation' | 'section' | 'frame';

const names: Record<RoofType, string> = {
  gable: 'Двускатная', hip: 'Вальмовая', shed: 'Односкатная', flat: 'Плоская',
};
const fmt = (n: number) => new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(Number.isFinite(n) ? n : 0);
const pathOf = (points: { x: number; y: number }[]) => points.map((p, i) => `${i ? 'L' : 'M'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ') + ' Z';

function Dimension({ x1, y1, x2, y2, label, vertical = false }: {
  x1: number; y1: number; x2: number; y2: number; label: string; vertical?: boolean;
}) {
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  return <g className="bp-dim">
    <line x1={x1} y1={y1} x2={x2} y2={y2}/>
    <path d={`M ${x1 - 4} ${y1 + 4} l 8 -8 M ${x2 - 4} ${y2 + 4} l 8 -8`}/>
    <text x={mx} y={my - 7} textAnchor="middle" transform={vertical ? `rotate(-90 ${mx} ${my})` : undefined}>{label}</text>
  </g>;
}

export default function RoofBlueprint({ project, view }: { project: RoofProject; view: RoofView }) {
  const geometry = buildRoofGeometry(project);
  const { length: L, width: W } = geometry.footprint;
  const roofType = project.type;
  const frame = { x: 32, y: 30, w: 696, h: 440 };
  const baseDefs = <defs>
    <pattern id="bpGrid" width="20" height="20" patternUnits="userSpaceOnUse">
      <path d="M20 0H0V20" fill="none" stroke="#e7ecef" strokeWidth=".8"/>
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
    <marker id="bpArrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto-start-reverse">
      <path d="M0,0 L6,3 L0,6 z" fill="#506c7b"/>
    </marker>
  </defs>;

  const scalePlan = Math.min(510 / Math.max(L, 1), 285 / Math.max(W, 1));
  const planLeft = (760 - L * scalePlan) / 2;
  const planTop = 180 - W * scalePlan / 2;
  const planPoint = (p: Point3) => ({ x: planLeft + (p.x + project.overhang) * scalePlan, y: planTop + (p.y + project.overhang) * scalePlan });
  const project3D = (p: Point3) => {
    const s = Math.min(300 / Math.max(L + W, 1), 190 / Math.max(0.34 * (L + W) + 1.35 * geometry.rise, 1));
    return { x: 380 + (p.x - p.y) * s * 0.72, y: 270 + (p.x + p.y) * s * 0.34 - p.z * s * 1.35 };
  };
  const drawingBorder = <g>
    <rect x={frame.x} y={frame.y} width={frame.w} height={frame.h} fill="#fff" stroke="#9eacb5" strokeWidth="1.2"/>
    <rect x={frame.x + 7} y={frame.y + 7} width={frame.w - 14} height={frame.h - 14} fill="url(#bpGrid)" stroke="#d8e0e5"/>
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
        <path d={pathOf(pts)} fill={i % 2 ? 'url(#bpFaceA)' : 'url(#bpFaceB)'} stroke="#304f61" strokeWidth="1.8" strokeLinejoin="round"/>
        {f.points.length === 4 && <path d={pathOf(pts)} fill="none" stroke="#eaf2f5" strokeWidth=".7" opacity=".9"/>}
      </g>;
    })}
    <g fill="none" stroke="#284a5c" strokeWidth="1.2">
      {geometry.faces.map(f => <path key={'edge-'+f.id} d={pathOf(f.points.map(project3D))}/>)}
    </g>
    <text x="380" y="400" textAnchor="middle" className="bp-note">ГЕОМЕТРИЧЕСКАЯ МОДЕЛЬ · {fmt(geometry.totalArea)} м²</text>
  </g>;

  const plan = <g>
    {geometry.faces.map((f, i) => <path key={f.id} d={pathOf(f.points.map(planPoint))} fill={i % 2 ? '#e6eef2' : '#d4e1e8'} fillOpacity=".8" stroke="#38586a" strokeWidth="1.6" strokeLinejoin="round"/>)}
    {geometry.faces.map(f => <text key={'label-'+f.id} x={f.points.map(planPoint).reduce((s,p)=>s+p.x,0)/f.points.length} y={f.points.map(planPoint).reduce((s,p)=>s+p.y,0)/f.points.length} textAnchor="middle" className="bp-face-label">{f.label}</text>)}
    <Dimension x1={planLeft} y1={planTop - 25} x2={planLeft + L * scalePlan} y2={planTop - 25} label={fmt(L) + ' м'}/>
    <Dimension x1={planLeft - 25} y1={planTop} x2={planLeft - 25} y2={planTop + W * scalePlan} label={fmt(W) + ' м'} vertical/>
    <text x="380" y="395" textAnchor="middle" className="bp-note">ПЛАН СКАТОВ · СВЕСЫ УЧТЕНЫ</text>
  </g>;

  const elevScale = Math.min(510 / Math.max(L, W, 1), 260 / Math.max(geometry.rise, 1));
  const ex = (760 - Math.max(L, W) * elevScale) / 2;
  const ground = 350;
  const elevationPoints = roofType === 'shed'
    ? [{x:ex,y:ground},{x:ex+W*elevScale,y:ground-geometry.rise*elevScale}]
    : roofType === 'flat'
      ? [{x:ex,y:ground},{x:ex+L*elevScale,y:ground}]
      : [{x:ex,y:ground},{x:ex+W*elevScale/2,y:ground-geometry.rise*elevScale},{x:ex+W*elevScale,y:ground}];
  const elevation = <g>
    <line x1={ex-24} y1={ground} x2={ex+Math.max(L,W)*elevScale+24} y2={ground} stroke="#536d7a" strokeWidth="1.5"/>
    <path d={pathOf(elevationPoints)} fill="none" stroke="#294d60" strokeWidth="3" strokeLinejoin="round"/>
    {roofType !== 'flat' && elevationPoints.map((p,i)=><circle key={i} cx={p.x} cy={p.y} r="3.5" fill="#294d60"/>)}
    <Dimension x1={ex} y1={ground+24} x2={ex+Math.max(L,W)*elevScale} y2={ground+24} label={fmt(Math.max(L,W))+' м'}/>
    <Dimension x1={ex+Math.max(L,W)*elevScale+28} y1={ground} x2={ex+Math.max(L,W)*elevScale+28} y2={ground-geometry.rise*elevScale} label={fmt(geometry.rise)+' м'} vertical/>
    <text x="380" y="405" textAnchor="middle" className="bp-note">ПРОФИЛЬ КРОВЛИ · УКЛОН {fmt(project.pitch)}°</text>
  </g>;

  const sectionScale = Math.min(500 / Math.max(W, 1), 240 / Math.max(geometry.rise, 1));
  const sx = (760 - W * sectionScale) / 2;
  const sy = 350;
  const section = <g>
    <path d={pathOf([{x:sx,y:sy},{x:sx+W*sectionScale,y:sy},{x:sx+W*sectionScale,y:sy+8},{x:sx,y:sy+8}])} fill="#dbe4e9" stroke="#627b88" strokeWidth="1.2"/>
    {roofType === 'gable' || roofType === 'hip' ? <>
      <path d={`M ${sx} ${sy} L ${sx+W*sectionScale/2} ${sy-geometry.rise*sectionScale} L ${sx+W*sectionScale} ${sy}`} fill="none" stroke="#294d60" strokeWidth="3" strokeLinejoin="round"/>
      {Array.from({length:Math.max(2,Math.floor(W/0.6))},(_,i)=>{
        const x=sx+(i+1)*W*sectionScale/(Math.max(2,Math.floor(W/0.6))+1);
        const center=sx+W*sectionScale/2;
        const y=sy-geometry.rise*sectionScale*Math.max(0,1-Math.abs(x-center)/(W*sectionScale/2));
        return <line key={i} x1={x} y1={sy} x2={x} y2={y} stroke="#b07843" strokeWidth="2.4"/>;
      })}
    </> : roofType === 'shed' ? <path d={`M ${sx} ${sy} L ${sx+W*sectionScale} ${sy-geometry.rise*sectionScale}`} stroke="#294d60" strokeWidth="3"/> : <line x1={sx} y1={sy-2} x2={sx+W*sectionScale} y2={sy-2} stroke="#294d60" strokeWidth="3"/>}
    <Dimension x1={sx} y1={sy+35} x2={sx+W*sectionScale} y2={sy+35} label={fmt(W)+' м'}/>
    <text x="380" y="405" textAnchor="middle" className="bp-note">ПОПЕРЕЧНЫЙ РАЗРЕЗ · СХЕМА НЕСУЩИХ ЭЛЕМЕНТОВ</text>
  </g>;

  const frameView = <g>
    {geometry.faces.map(f => <path key={f.id} d={pathOf(f.points.map(project3D))} fill="none" stroke="#94a9b5" strokeWidth="1.1" strokeDasharray="5 4"/>)}
    {Array.from({length:Math.max(3,Math.floor(project.length/0.6))},(_,i)=>{
      const t=(i+1)/(Math.max(3,Math.floor(project.length/0.6))+1);
      const x=-project.overhang+(project.length+2*project.overhang)*t;
      const points: Point3[] = roofType === 'shed'
        ? [{x,y:-project.overhang,z:0},{x,y:project.width+project.overhang,z:geometry.rise}]
        : roofType === 'flat'
          ? [{x,y:-project.overhang,z:0},{x,y:project.width+project.overhang,z:0}]
          : [{x,y:-project.overhang,z:0},{x,y:(project.width)/2,z:geometry.rise},{x,y:project.width+project.overhang,z:0}];
      return <path key={i} d={pathOf(points.map(project3D))} fill="none" stroke="#a96f3f" strokeWidth="2.2"/>;
    })}
    {geometry.faces.flatMap(f=>f.points).filter((p,i,a)=>a.findIndex(q=>q.x===p.x&&q.y===p.y&&q.z===p.z)===i).map((p,i)=><circle key={i} cx={project3D(p).x} cy={project3D(p).y} r="2.6" fill="#294d60"/>)}
    <text x="380" y="400" textAnchor="middle" className="bp-note">СХЕМА КАРКАСА · ШАГ СТРОПИЛ УСЛОВНЫЙ</text>
  </g>;

  const title = view === '3d' ? 'ОБЪЁМНАЯ МОДЕЛЬ' : view === 'plan' ? 'ПЛАН КРОВЛИ' : view === 'elevation' ? 'ФАСАД / ПРОФИЛЬ' : view === 'section' ? 'ПОПЕРЕЧНЫЙ РАЗРЕЗ' : 'СТРОПИЛЬНЫЙ КАРКАС';
  const drawing = view === '3d' ? roof3d : view === 'plan' ? plan : view === 'elevation' ? elevation : view === 'section' ? section : frameView;
  if (view === '3d') return <InteractiveRoof3D project={project} />;
  return <svg className={'roof-blueprint bp-view-' + view} viewBox="0 0 760 500" role="img" aria-label={title + ', ' + names[roofType]}>
    {baseDefs}
    {drawingBorder}
    <text x="48" y="57" className="bp-sheet-heading">{title}</text>
    <text x="48" y="74" className="bp-sheet-subtitle">{names[roofType]} · {fmt(project.length)} × {fmt(project.width)} м · уклон {fmt(project.pitch)}°</text>
    {drawing}
    <text x="48" y="448" className="bp-meta">ПРОЕКТНАЯ ГЕОМЕТРИЯ · ПРОВЕРЬТЕ РАЗМЕРЫ ПЕРЕД РАБОТАМИ</text>
  </svg>;
}
