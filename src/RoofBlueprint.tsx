import React from 'react';

export type RoofType = 'gable' | 'hip' | 'shed' | 'flat';
export type RoofProject = { type: RoofType; length: number; width: number; pitch: number; overhang: number };
export type RoofView = '3d' | 'plan' | 'elevation' | 'section' | 'frame';

const names: Record<RoofType, string> = { gable: 'Двускатная', hip: 'Вальмовая', shed: 'Односкатная', flat: 'Плоская' };
const fmt = (n: number) => new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 }).format(Number.isFinite(n) ? n : 0);

function Dimension({ x1, y1, x2, y2, label, rotate = false }: { x1: number; y1: number; x2: number; y2: number; label: string; rotate?: boolean }) {
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  return <g className="bp-dim"><line x1={x1} y1={y1} x2={x2} y2={y2}/><path d={'M '+(x1-4)+' '+(y1+4)+' l 8 -8 M '+(x2-4)+' '+(y2+4)+' l 8 -8'}/><text x={mx} y={my-6} textAnchor="middle" transform={rotate ? 'rotate(-90 '+mx+' '+my+')' : undefined}>{label}</text></g>;
}

export default function RoofBlueprint({ project, view }: { project: RoofProject; view: RoofView }) {
  const L = Math.max(.1, project.length), W = Math.max(.1, project.width), pitch = Math.max(0, Math.min(75, project.pitch));
  const rise = Math.tan(pitch * Math.PI / 180) * W / 2;
  const lengthLabel = fmt(L + 2 * Math.max(0, project.overhang)) + ' м';
  const widthLabel = fmt(W + 2 * Math.max(0, project.overhang)) + ' м';
  const common = <defs>
    <linearGradient id="bpRoofA" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#e0e9e1"/><stop offset=".48" stopColor="#9db9a6"/><stop offset="1" stopColor="#527b60"/></linearGradient>
    <linearGradient id="bpRoofB" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#90b09a"/><stop offset="1" stopColor="#365b43"/></linearGradient>
    <linearGradient id="bpWall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff"/><stop offset="1" stopColor="#dce6dd"/></linearGradient>
    <pattern id="bpGrid" width="16" height="16" patternUnits="userSpaceOnUse"><path d="M 16 0 L 0 0 0 16" fill="none" stroke="#dbe6dd" strokeWidth=".7"/></pattern>
    <filter id="bpShadow" x="-30%" y="-30%" width="160%" height="180%"><feDropShadow dx="0" dy="9" stdDeviation="7" floodColor="#244b31" floodOpacity=".18"/></filter>
  </defs>;
  const sheetLines = (x1: number, y1: number, x2: number, y2: number, count: number) => Array.from({ length: count }, (_, i) => {
    const t = (i + 1) / (count + 1);
    return <line key={i} x1={x1 + (x2 - x1) * t} y1={y1 + (y2 - y1) * t} x2={x1 + (x2 - x1) * t} y2={y1 + (y2 - y1) * t} stroke="#edf4ed" strokeWidth="1.2" opacity=".7"/>;
  });
  const model = <g filter="url(#bpShadow)">
    <ellipse cx="220" cy="244" rx="155" ry="22" fill="#d1ded3" opacity=".7"/>
    <path d="M 70 125 L 220 205 L 370 125 L 220 47 Z" fill="#edf2ed" stroke="#b7c9ba"/>
    <path d="M 70 125 L 70 187 L 220 266 L 220 205 Z" fill="url(#bpWall)" stroke="#b7c9ba"/>
    <path d="M 220 205 L 370 125 L 370 187 L 220 266 Z" fill="#d8e3da" stroke="#b7c9ba"/>
    {project.type === 'gable' ? <><polygon points="70,125 220,40 220,205" fill="url(#bpRoofB)" stroke="#436b4f" strokeWidth="2"/><polygon points="220,40 370,125 220,205" fill="url(#bpRoofA)" stroke="#436b4f" strokeWidth="2"/>{Array.from({length:8},(_,i)=><g key={i}><line x1={86+i*16} y1={116-i*9} x2={220} y2={205-i*0} stroke="#edf4ed" strokeWidth="1" opacity=".7"/><line x1={236+i*16} y1={49+i*9} x2={236+i*16} y2={196-i*0} stroke="#edf4ed" strokeWidth="1" opacity=".6"/></g>)}<path d="M 220 40 L 220 205" stroke="#f0f5ef" strokeWidth="4"/><path d="M 70 125 L 220 205 L 370 125" fill="none" stroke="#3c6247" strokeWidth="4"/></> :
    project.type === 'hip' ? <><polygon points="220,40 370,125 220,205 70,125" fill="url(#bpRoofA)" stroke="#436b4f" strokeWidth="2"/><polygon points="220,40 220,125 70,125" fill="url(#bpRoofB)" stroke="#436b4f" strokeWidth="2"/><polygon points="220,40 370,125 220,125" fill="#c5d8c9" stroke="#436b4f" strokeWidth="2"/><polygon points="220,125 370,125 220,205" fill="#71987c" stroke="#436b4f" strokeWidth="2"/><polygon points="70,125 220,125 220,205" fill="#527b60" stroke="#436b4f" strokeWidth="2"/><path d="M 220 40 L 220 125 M 220 125 L 70 125 M 220 125 L 370 125" stroke="#edf4ed" strokeWidth="2"/></> :
    project.type === 'shed' ? <><polygon points="70,84 370,42 370,150 70,192" fill="url(#bpRoofA)" stroke="#436b4f" strokeWidth="2"/>{Array.from({length:10},(_,i)=><line key={i} x1={82+i*28} y1={82-i*3.8} x2={82+i*28} y2={180-i*3.8} stroke="#edf4ed" strokeWidth="1.2" opacity=".8"/>)}<path d="M 70 84 L 370 42 M 70 192 L 370 150" stroke="#3c6247" strokeWidth="4"/></> :
    <><polygon points="70,108 220,58 370,108 220,158" fill="url(#bpRoofA)" stroke="#436b4f" strokeWidth="2"/><polygon points="70,108 220,158 370,108 370,123 220,174 70,123" fill="url(#bpRoofB)" stroke="#436b4f" strokeWidth="2"/>{Array.from({length:8},(_,i)=><line key={i} x1={90+i*17} y1={114+i*5.7} x2={220+i*18} y2={65+i*5.5} stroke="#edf4ed" strokeWidth="1.1" opacity=".7"/>}</>}
    <g fill="#315b3e" fontSize="10" fontWeight="700"><text x="220" y="291" textAnchor="middle">{lengthLabel} · длина</text><text x="68" y="237" transform="rotate(28 68 237)">{widthLabel}</text></g>
  </g>;
  const plan = <g><rect x="14" y="12" width="412" height="276" rx="10" fill="#fbfdfb" stroke="#e0e9e1"/><rect x="14" y="12" width="412" height="276" rx="10" fill="url(#bpGrid)"/><g transform="translate(65 52)"><rect x="0" y="0" width="300" height="165" fill="#e7efe8" stroke="#416a4c" strokeWidth="2.5"/>
    {project.type === 'gable' ? <><line x1="0" y1="82.5" x2="300" y2="82.5" stroke="#416a4c" strokeWidth="3"/><line x1="0" y1="0" x2="300" y2="165" stroke="#91ae98" strokeDasharray="5 5"/><line x1="0" y1="165" x2="300" y2="0" stroke="#91ae98" strokeDasharray="5 5"/></> : null}
    {project.type === 'hip' ? <><path d="M 0 0 L 150 82.5 L 300 0 M 0 165 L 150 82.5 L 300 165" fill="none" stroke="#416a4c" strokeWidth="2.5"/><line x1="0" y1="0" x2="300" y2="165" stroke="#91ae98" strokeDasharray="5 5"/></> : null}
    {project.type === 'shed' ? Array.from({length:9},(_,i)=><line key={i} x1={i*37.5} y1="0" x2={i*37.5} y2="165" stroke="#9bb5a0" strokeWidth="1.1"/>) : null}
    {project.type === 'flat' ? <>{Array.from({length:7},(_,i)=><line key={'v'+i} x1={i*50} y1="0" x2={i*50} y2="165" stroke="#9bb5a0"/>)}{Array.from({length:4},(_,i)=><line key={'h'+i} x1="0" y1={i*41} x2="300" y2={i*41} stroke="#9bb5a0"/>)}</> : null}
    <Dimension x1={0} y1={-17} x2={300} y2={-17} label={lengthLabel}/><Dimension x1={-18} y1={0} x2={-18} y2={165} label={widthLabel}/>
    <text x="150" y="198" className="bp-note" textAnchor="middle">ПЛАН КРОВЛИ · {names[project.type].toUpperCase()}</text>
  </g></g>;
  const elevation = <g><rect x="14" y="12" width="412" height="276" rx="10" fill="#fbfdfb" stroke="#e0e9e1"/><rect x="14" y="12" width="412" height="276" rx="10" fill="url(#bpGrid)"/><g transform="translate(42 40)">
    {project.type === 'gable' ? <><path d="M 18 180 L 18 82 L 180 5 L 342 82 L 342 180 Z" fill="url(#bpWall)" stroke="#64856b" strokeWidth="2"/><path d="M 18 82 L 180 5 L 342 82" fill="none" stroke="#3d6648" strokeWidth="9" strokeLinejoin="round"/><path d="M 18 82 L 180 5 L 342 82" fill="none" stroke="#b4cbb8" strokeWidth="2"/><rect x="151" y="119" width="58" height="61" fill="#b9d1bf" stroke="#75957b" strokeWidth="2"/><line x1="180" y1="119" x2="180" y2="180" stroke="#75957b"/></> :
    project.type === 'hip' ? <><path d="M 18 88 L 95 32 L 265 32 L 342 88 L 342 180 L 18 180 Z" fill="url(#bpWall)" stroke="#64856b" strokeWidth="2"/><path d="M 18 88 L 95 32 L 265 32 L 342 88 L 265 111 L 95 111 Z" fill="url(#bpRoofA)" stroke="#3d6648" strokeWidth="2"/><path d="M 95 32 L 95 111 M 265 32 L 265 111" stroke="#527b60" strokeWidth="2"/></> :
    project.type === 'shed' ? <><path d="M 18 180 L 18 111 L 342 34 L 342 180 Z" fill="url(#bpWall)" stroke="#64856b" strokeWidth="2"/><path d="M 18 111 L 342 34" stroke="#3d6648" strokeWidth="9"/><path d="M 18 111 L 342 34" stroke="#b4cbb8" strokeWidth="2"/></> :
    <><rect x="18" y="92" width="324" height="88" fill="url(#bpWall)" stroke="#64856b" strokeWidth="2"/><path d="M 8 92 L 352 92" stroke="#3d6648" strokeWidth="9"/><path d="M 8 92 L 352 92" stroke="#b4cbb8" strokeWidth="2"/></>}
    <line x1="0" y1="180" x2="360" y2="180" stroke="#718d78" strokeWidth="2"/><Dimension x1={18} y1={202} x2={342} y2={202} label={lengthLabel}/><Dimension x1={365} y1={34} x2={365} y2={180} label={fmt(rise)+' м'}/>
    <text x="180" y="230" className="bp-note" textAnchor="middle">ФАСАД · {names[project.type].toUpperCase()}</text>
  </g></g>;
  const section = <g><rect x="14" y="12" width="412" height="276" rx="10" fill="#fbfdfb" stroke="#e0e9e1"/><rect x="14" y="12" width="412" height="276" rx="10" fill="url(#bpGrid)"/><g transform="translate(45 35)">
    <path d="M 28 190 L 28 92 L 180 10 L 332 92 L 332 190 Z" fill="url(#bpWall)" stroke="#6c8d74" strokeWidth="2"/><path d="M 28 92 L 180 10 L 332 92" fill="none" stroke="#3d6648" strokeWidth="9" strokeLinejoin="round"/><path d="M 28 92 L 180 10 L 332 92" fill="none" stroke="#b4cbb8" strokeWidth="2"/><path d="M 28 190 L 332 190" stroke="#3d6648" strokeWidth="4"/><path d="M 28 92 L 332 92" stroke="#a0b7a5" strokeDasharray="4 4"/>
    {Array.from({length:9},(_,i)=>{const x=28+i*38;const y=92-Math.min(i,8-i)*19;return <line key={i} x1={x} y1="190" x2={x} y2={y} stroke="#b88959" strokeWidth="3"/>})}
    <Dimension x1={28} y1={214} x2={332} y2={214} label={widthLabel}/><Dimension x1={351} y1={10} x2={351} y2={190} label={fmt(rise)+' м'}/><text x="180" y="242" className="bp-note" textAnchor="middle">ПОПЕРЕЧНЫЙ РАЗРЕЗ · СХЕМА</text>
  </g></g>;
  const frame = <g><rect x="14" y="12" width="412" height="276" rx="10" fill="#fbfdfb" stroke="#e0e9e1"/><rect x="14" y="12" width="412" height="276" rx="10" fill="url(#bpGrid)"/><g transform="translate(42 38)">
    <path d="M 20 180 L 20 94 L 180 15 L 340 94 L 340 180" fill="none" stroke="#426b4d" strokeWidth="7" strokeLinejoin="round"/><path d="M 20 180 L 340 180 M 20 94 L 340 94 M 180 15 L 180 180" fill="none" stroke="#91ad98" strokeWidth="4"/>
    {Array.from({length:9},(_,i)=>{const x=20+i*40;const y=94-Math.min(i,8-i)*9.8;return <g key={i}><line x1={x} y1="180" x2={x} y2={y} stroke="#bd8d5b" strokeWidth="3.5"/><line x1={x} y1={y} x2={x} y2="94" stroke="#72967b" strokeWidth="2"/></g>})}
    <path d="M 20 94 L 180 15 L 340 94" fill="none" stroke="#315b3e" strokeWidth="2.5"/><Dimension x1={20} y1={205} x2={340} y2={205} label={lengthLabel}/><text x="180" y="232" className="bp-note" textAnchor="middle">СТРОПИЛЬНАЯ СХЕМА · УПРОЩЁННО</text>
  </g></g>;
  return <svg className={'roof-blueprint bp-view-'+view} viewBox="0 0 440 300" role="img" aria-label={view === '3d' ? 'Объёмная модель кровли' : view === 'plan' ? 'План кровли с размерами' : view === 'elevation' ? 'Фасад крыши' : view === 'section' ? 'Разрез кровли' : 'Схема стропильного каркаса'}>{common}{view === '3d' ? model : view === 'plan' ? plan : view === 'elevation' ? elevation : view === 'section' ? section : frame}</svg>;
}
