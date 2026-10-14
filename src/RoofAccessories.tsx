import { Plus, Trash2, Flame, Wind, PanelsTopLeft, Box } from 'lucide-react';

export type RoofAccessoryType = 'chimney' | 'shaft' | 'vent' | 'skylight';
export type RoofAccessory = {
  id: string;
  type: RoofAccessoryType;
  x: number;
  y: number;
  width: number;
  depth: number;
  height: number;
};
type Props = {
  accessories: RoofAccessory[];
  length: number;
  width: number;
  onChange: (items: RoofAccessory[]) => void;
};
const labels: Record<RoofAccessoryType, string> = {
  chimney: 'Дымоход',
  shaft: 'Вентиляционная шахта',
  vent: 'Вентиляционный выход',
  skylight: 'Мансардное окно',
};
const defaults: Record<RoofAccessoryType, Omit<RoofAccessory, 'id' | 'type' | 'x' | 'y'>> = {
  chimney: { width: 0.6, depth: 0.6, height: 1.1 },
  shaft: { width: 0.8, depth: 0.7, height: 0.7 },
  vent: { width: 0.25, depth: 0.25, height: 0.65 },
  skylight: { width: 0.78, depth: 1.18, height: 0.08 },
};
const icons = {
  chimney: Flame,
  shaft: Box,
  vent: Wind,
  skylight: PanelsTopLeft,
};
const safe = (v: number, min: number, max: number) => Math.min(max, Math.max(min, Number.isFinite(v) ? v : min));
export default function RoofAccessories({ accessories, length, width, onChange }: Props) {
  const add = (type: RoofAccessoryType) => {
    const d = defaults[type];
    onChange([...accessories, {
      id: globalThis.crypto?.randomUUID?.() || String(Date.now() + Math.random()),
      type,
      x: safe(length / 2, 0.25, Math.max(0.25, length - 0.25)),
      y: safe(width / 2, 0.25, Math.max(0.25, width - 0.25)),
      ...d,
    }]);
  };
  const patch = (id: string, values: Partial<RoofAccessory>) => onChange(accessories.map(item => item.id === id ? { ...item, ...values } : item));
  return <section className="roof-accessories-panel">
    <div className="roof-accessories-heading">
      <div><span className="overline">ДЕТАЛИ НА КРОВЛЕ</span><h3>Элементы кровли</h3><p>Добавляйте объекты и задавайте их положение в метрах от левого и ближнего края здания.</p></div>
      <span className="roof-accessories-count">{accessories.length}</span>
    </div>
    <div className="roof-accessory-add">
      {(['chimney', 'shaft', 'vent', 'skylight'] as RoofAccessoryType[]).map(type => {
        const Icon = icons[type];
        return <button key={type} type="button" className="roof-accessory-add-btn" onClick={() => add(type)}><Icon size={17}/><span>{labels[type]}</span><Plus size={15}/></button>;
      })}
    </div>
    {accessories.length === 0 ? <div className="roof-accessories-empty">Пока нет дополнительных элементов. Выберите выше дымоход, шахту, вентиляционный выход или окно — он появится на 3D-модели.</div> :
      <div className="roof-accessory-list">{accessories.map(item => {
        const Icon = icons[item.type];
        return <article className="roof-accessory-item" key={item.id}>
          <div className="roof-accessory-item-head"><span className="roof-accessory-icon"><Icon size={17}/></span><b>{labels[item.type]}</b><button type="button" className="roof-accessory-remove" aria-label={'Удалить: ' + labels[item.type]} onClick={() => onChange(accessories.filter(x => x.id !== item.id))}><Trash2 size={16}/></button></div>
          <div className="roof-accessory-fields">
            <label>X, вдоль здания<input type="number" min="0.25" max={Math.max(0.25, length - 0.25)} step="0.1" value={item.x} onChange={e => patch(item.id, { x: safe(Number(e.target.value), 0.25, Math.max(0.25, length - 0.25)) })}/></label>
            <label>Y, поперёк здания<input type="number" min="0.25" max={Math.max(0.25, width - 0.25)} step="0.1" value={item.y} onChange={e => patch(item.id, { y: safe(Number(e.target.value), 0.25, Math.max(0.25, width - 0.25)) })}/></label>
            <label>Ширина, м<input type="number" min="0.15" max="3" step="0.05" value={item.width} onChange={e => patch(item.id, { width: safe(Number(e.target.value), 0.15, 3) })}/></label>
            <label>{item.type === 'skylight' ? 'Длина по скату, м' : 'Глубина, м'}<input type="number" min="0.15" max="3" step="0.05" value={item.depth} onChange={e => patch(item.id, { depth: safe(Number(e.target.value), 0.15, 3) })}/></label>
            {item.type !== 'skylight' && <label>Высота над кровлей, м<input type="number" min="0.15" max="3" step="0.05" value={item.height} onChange={e => patch(item.id, { height: safe(Number(e.target.value), 0.15, 3) })}/></label>}
          </div>
          <p className="roof-accessory-coordinates">Положение: {item.x.toFixed(2)} м × {item.y.toFixed(2)} м</p>
        </article>;
      })}</div>}
    <p className="roof-accessories-note">Положение задаётся координатами, а не перетаскиванием мышью. Проверяйте расстояния до конька, ендов, стропил и противопожарные отступы отдельно.</p>
  </section>;
}
