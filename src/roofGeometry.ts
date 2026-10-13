export type RoofKind = 'gable' | 'hip' | 'shed' | 'flat';

export type Point3 = { x: number; y: number; z: number };
export type RoofFace = { id: string; label: string; points: Point3[]; area: number };
export type RoofGeometryInput = {
  type: RoofKind;
  length: number;
  width: number;
  pitch: number;
  overhang: number;
};
export type RoofGeometry = {
  input: RoofGeometryInput;
  footprint: { length: number; width: number };
  rise: number;
  ridgeLength: number;
  rafterLength: number;
  faces: RoofFace[];
  totalArea: number;
  eaveLength: number;
  rafterLength: number;
  plan: { x: number; y: number }[];
};

const clamp = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, Number.isFinite(n) ? n : min));

function polygonArea3D(points: Point3[]): number {
  if (points.length < 3) return 0;
  const origin = points[0];
  let crossX = 0, crossY = 0, crossZ = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const a = points[i], b = points[i + 1];
    const ax = a.x - origin.x, ay = a.y - origin.y, az = a.z - origin.z;
    const bx = b.x - origin.x, by = b.y - origin.y, bz = b.z - origin.z;
    crossX += ay * bz - az * by;
    crossY += az * bx - ax * bz;
    crossZ += ax * by - ay * bx;
  }
  return Math.sqrt(crossX * crossX + crossY * crossY + crossZ * crossZ) / 2;
}

const face = (id: string, label: string, points: Point3[]): RoofFace => ({
  id, label, points, area: polygonArea3D(points),
});

/**
 * Deterministic roof surface geometry in metres.
 * This describes idealized roof planes, not a structural engineering design.
 */
export function buildRoofGeometry(input: RoofGeometryInput): RoofGeometry {
  const length = clamp(input.length, 0.1, 10000);
  const width = clamp(input.width, 0.1, 10000);
  const overhang = clamp(input.overhang, 0, 10);
  const pitch = clamp(input.pitch, 0, 75);
  const slope = Math.tan((pitch * Math.PI) / 180);
  const L = length + 2 * overhang;
  const W = width + 2 * overhang;
  const x0 = -overhang, x1 = length + overhang;
  const y0 = -overhang, y1 = width + overhang;
  const eaveLength = 2 * (L + W);
  const cornerSW = { x: x0, y: y0, z: 0 };
  const cornerSE = { x: x1, y: y0, z: 0 };
  const cornerNE = { x: x1, y: y1, z: 0 };
  const cornerNW = { x: x0, y: y1, z: 0 };
  let faces: RoofFace[] = [];
  let ridgeLength = 0;
  let rise = 0;
  let rafterLength = 0;

  if (input.type === 'gable') {
    rise = (W / 2) * slope;
    ridgeLength = L;
    rafterLength = Math.hypot(W / 2, rise);
    const ridgeSW = { x: x0, y: W / 2 - overhang, z: rise };
    const ridgeSE = { x: x1, y: W / 2 - overhang, z: rise };
    faces = [
      face('slope-a', 'Скат А', [cornerSW, cornerSE, ridgeSE, ridgeSW]),
      face('slope-b', 'Скат Б', [ridgeSW, ridgeSE, cornerNE, cornerNW]),
    ];
  } else if (input.type === 'shed') {
    rise = W * slope;
    rafterLength = Math.hypot(W, rise);
    faces = [face('main-slope', 'Основной скат', [
      cornerSW, cornerSE,
      { x: x1, y: y1, z: rise },
      { x: x0, y: y1, z: rise },
    ])];
  } else if (input.type === 'hip') {
    const ridgeZ = (Math.min(L, W) / 2) * slope;
    rise = ridgeZ;
    ridgeLength = Math.max(0, Math.abs(L - W));
    rafterLength = Math.hypot(Math.min(L, W) / 2, ridgeZ);
    if (L >= W) {
      const inset = W / 2;
      const r0 = { x: x0 + inset, y: W / 2 - overhang, z: ridgeZ };
      const r1 = { x: x1 - inset, y: W / 2 - overhang, z: ridgeZ };
      if (ridgeLength < 0.001) {
        const center = { x: (x0 + x1) / 2, y: W / 2 - overhang, z: ridgeZ };
        faces = [
          face('hip-north', 'Вальма 1', [cornerSW, cornerSE, center]),
          face('hip-east', 'Вальма 2', [cornerSE, cornerNE, center]),
          face('hip-south', 'Вальма 3', [cornerNE, cornerNW, center]),
          face('hip-west', 'Вальма 4', [cornerNW, cornerSW, center]),
        ];
      } else {
        faces = [
          face('slope-a', 'Скат А', [cornerSW, cornerSE, r1, r0]),
          face('slope-b', 'Скат Б', [r0, r1, cornerNE, cornerNW]),
          face('hip-east', 'Вальма торцевая 1', [cornerSE, cornerNE, r1]),
          face('hip-west', 'Вальма торцевая 2', [cornerNW, cornerSW, r0]),
        ];
      }
    } else {
      const inset = L / 2;
      const r0 = { x: L / 2 - overhang, y: y0 + inset, z: ridgeZ };
      const r1 = { x: L / 2 - overhang, y: y1 - inset, z: ridgeZ };
      if (ridgeLength < 0.001) {
        const center = { x: L / 2 - overhang, y: (y0 + y1) / 2, z: ridgeZ };
        faces = [
          face('hip-north', 'Вальма 1', [cornerSW, cornerSE, center]),
          face('hip-east', 'Вальма 2', [cornerSE, cornerNE, center]),
          face('hip-south', 'Вальма 3', [cornerNE, cornerNW, center]),
          face('hip-west', 'Вальма 4', [cornerNW, cornerSW, center]),
        ];
      } else {
        faces = [
          face('slope-a', 'Скат А', [cornerSW, r0, r1, cornerNW]),
          face('slope-b', 'Скат Б', [cornerSE, cornerNE, r1, r0]),
          face('hip-east', 'Вальма торцевая 1', [cornerSW, cornerSE, r0]),
          face('hip-west', 'Вальма торцевая 2', [cornerNE, cornerNW, r1]),
        ];
      }
    }
  } else {
    rise = 0;
    ridgeLength = 0;
    rafterLength = 0;
    faces = [face('flat-deck', 'Плоскость кровли', [cornerSW, cornerSE, cornerNE, cornerNW])];
  }

  const totalArea = faces.reduce((sum, item) => sum + item.area, 0);
  return {
    input: { ...input, length, width, pitch, overhang },
    footprint: { length: L, width: W },
    rise,
    ridgeLength,
    rafterLength,
    faces,
    totalArea,
    eaveLength,
    rafterLength,
    plan: [
      { x: x0, y: y0 }, { x: x1, y: y0 },
      { x: x1, y: y1 }, { x: x0, y: y1 },
    ],
  };
}
