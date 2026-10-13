import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { buildRoofGeometry, type RoofGeometryInput, type Point3 } from './roofGeometry';

type CoverKind = 'metal' | 'profile' | 'shingle' | 'membrane';
type Props = { project: RoofGeometryInput; cover?: CoverKind };
function createCoverTexture(cover: CoverKind) {
  const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 256;
  const ctx = canvas.getContext('2d'); if (!ctx) return null;
  ctx.fillStyle = cover === 'metal' ? '#718896' : cover === 'profile' ? '#7f98a3' : cover === 'shingle' ? '#5c5a57' : '#a9b8b5'; ctx.fillRect(0,0,256,256);
  if (cover === 'metal') { for (let y=0;y<256;y+=32) { ctx.fillStyle='#c0cdd3';ctx.fillRect(0,y,256,2);ctx.fillStyle='#3d5968';ctx.fillRect(0,y+4,256,2);for(let x=0;x<256;x+=64){ctx.fillStyle='#9eafb8';ctx.fillRect(x+4,y+6,3,24);ctx.fillStyle='#425c6b';ctx.fillRect(x+8,y+6,2,24);} } }
  else if (cover === 'profile') { for(let x=0;x<256;x+=24){ctx.fillStyle='#c0cdd3';ctx.fillRect(x,0,3,256);ctx.fillStyle='#405c69';ctx.fillRect(x+4,0,3,256);ctx.fillStyle='#8197a2';ctx.fillRect(x+7,0,14,256);} }
  else if (cover === 'shingle') { for(let y=0;y<256;y+=32){ctx.strokeStyle='#282f31';ctx.lineWidth=2;for(let x=-32+(y/32%2)*32;x<256;x+=64){ctx.fillStyle='#686663';ctx.fillRect(x+1,y+1,62,30);ctx.strokeRect(x+1,y+1,62,30);} } }
  else { ctx.strokeStyle='#dce5e2';ctx.lineWidth=2;for(let y=16;y<256;y+=32){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(256,y);ctx.stroke();} }
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace=THREE.SRGBColorSpace; texture.wrapS=texture.wrapT=THREE.RepeatWrapping; texture.repeat.set(1.8,1.8); return texture;
}
const clampCount = (n: number) => Math.max(2, Math.min(100, n));

export default function InteractiveRoof3D({ project, cover = 'metal' }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{ scene: THREE.Scene; camera: THREE.PerspectiveCamera; renderer: THREE.WebGLRenderer; controls: OrbitControls } | null>(null);
  const [showSurface, setShowSurface] = useState(true);
  const [showFrame, setShowFrame] = useState(true);
  const [showLayers, setShowLayers] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    } catch {
      setReady(false);
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.setClearColor('#edf2f4');
    renderer.domElement.className = 'roof-webgl-canvas';
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#edf2f4');
    scene.fog = new THREE.Fog('#edf2f4', 25, 90);
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 500);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.minDistance = 3;
    controls.maxDistance = 70;
    controls.maxPolarAngle = Math.PI * 0.49;
    scene.add(new THREE.HemisphereLight('#ffffff', '#7f929a', 2.1));
    const key = new THREE.DirectionalLight('#ffffff', 3.2);
    key.position.set(8, 14, 10);
    scene.add(key);
    const fill = new THREE.DirectionalLight('#d9e8f0', 1.1);
    fill.position.set(-10, 7, -8);
    scene.add(fill);

    const grid = new THREE.GridHelper(40, 40, '#bdcbd1', '#d9e1e5');
    grid.position.y = -2.55;
    scene.add(grid);

    sceneRef.current = { scene, camera, renderer, controls };
    setReady(true);
    let raf = 0;
    const render = () => {
      raf = requestAnimationFrame(render);
      controls.update();
      renderer.render(scene, camera);
    };
    render();

    const resize = () => {
      const width = Math.max(host.clientWidth, 1);
      const height = Math.max(host.clientHeight, 1);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      controls.dispose();
      scene.traverse(object => {
        if (object instanceof THREE.Mesh || object instanceof THREE.LineSegments || object instanceof THREE.Line) {
          object.geometry.dispose();
          const material = object.material;
          if (Array.isArray(material)) material.forEach(item => { if (item instanceof THREE.MeshStandardMaterial && item.map) item.map.dispose(); item.dispose(); });
          else { if (material instanceof THREE.MeshStandardMaterial && material.map) material.map.dispose(); material.dispose(); }
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
      sceneRef.current = null;
    };
  }, []);

  useEffect(() => {
    const state = sceneRef.current;
    if (!state) return;
    const { scene, camera, controls } = state;
    const geometry = buildRoofGeometry(project);
    const old = scene.getObjectByName('roof-model');
    if (old) {
      scene.remove(old);
      old.traverse(object => {
        if (object instanceof THREE.Mesh || object instanceof THREE.LineSegments || object instanceof THREE.Line) {
          object.geometry.dispose();
          const material = object.material;
          if (Array.isArray(material)) material.forEach(item => { if (item instanceof THREE.MeshStandardMaterial && item.map) item.map.dispose(); item.dispose(); });
          else { if (material instanceof THREE.MeshStandardMaterial && material.map) material.map.dispose(); material.dispose(); }
        }
      });
    }
    const group = new THREE.Group();
    group.name = 'roof-model';
    const L = geometry.footprint.length;
    const W = geometry.footprint.width;
    const centerX = project.length / 2;
    const centerZ = project.width / 2;
    const point = (p: Point3) => new THREE.Vector3(p.x - centerX, p.z, p.y - centerZ);

    const wallHeight = Math.min(Math.max(Math.min(project.length, project.width) * 0.32, 1.8), 3.2);
    const walls = new THREE.Mesh(
      new THREE.BoxGeometry(project.length, wallHeight, project.width),
      new THREE.MeshStandardMaterial({ color: '#dce4e6', roughness: 0.92, metalness: 0.02 })
    );
    walls.position.set(0, -wallHeight / 2, 0);
    walls.castShadow = true;
    walls.receiveShadow = true;
    group.add(walls);

    if (showLayers) {
      geometry.faces.forEach(face => {
        const membranePoints: number[] = [];
        face.points.forEach(p => { const v = point(p); membranePoints.push(v.x, v.y - 0.045, v.z); });
        const membraneIndices: number[] = [];
        for (let i = 1; i < face.points.length - 1; i++) membraneIndices.push(0, i, i + 1);
        const membraneGeometry = new THREE.BufferGeometry();
        membraneGeometry.setAttribute('position', new THREE.Float32BufferAttribute(membranePoints, 3));
        membraneGeometry.setIndex(membraneIndices); membraneGeometry.computeVertexNormals();
        group.add(new THREE.Mesh(membraneGeometry, new THREE.MeshStandardMaterial({ color: '#8ea99b', roughness: 0.92, side: THREE.DoubleSide, transparent: true, opacity: 0.94 })));
        if (face.points.length === 4) {
          const battens: THREE.Vector3[] = [];
          for (let t = 0.08; t < 0.96; t += 0.12) {
            const a = face.points[0], b = face.points[1], c = face.points[2], d = face.points[3];
            const left = { x: a.x + (d.x-a.x)*t, y: a.y + (d.y-a.y)*t, z: a.z + (d.z-a.z)*t };
            const right = { x: b.x + (c.x-b.x)*t, y: b.y + (c.y-b.y)*t, z: b.z + (c.z-b.z)*t };
            const va = point(left), vb = point(right); battens.push(new THREE.Vector3(va.x, va.y + 0.012, va.z), new THREE.Vector3(vb.x, vb.y + 0.012, vb.z));
          }
          group.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(battens), new THREE.LineBasicMaterial({ color: '#bd8754', transparent: true, opacity: 0.98 })));
        }
      });
    }
    if (showSurface) {
      geometry.faces.forEach((face, index) => {
        const vertices: number[] = [];
        const uvs: number[] = [];
        face.points.forEach(p => {
          const v = point(p);
          vertices.push(v.x, v.y, v.z);
          uvs.push(p.x, p.y);
        });
        const indices: number[] = [];
        for (let i = 1; i < face.points.length - 1; i++) indices.push(0, i, i + 1);
        const meshGeometry = new THREE.BufferGeometry();
        meshGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        meshGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        meshGeometry.setIndex(indices);
        meshGeometry.computeVertexNormals();
        const mesh = new THREE.Mesh(meshGeometry, new THREE.MeshStandardMaterial({
          color: '#ffffff',
          map: createCoverTexture(cover),
          roughness: cover === 'metal' || cover === 'profile' ? 0.38 : 0.86,
          metalness: cover === 'metal' || cover === 'profile' ? 0.35 : 0.02,
          side: THREE.DoubleSide,
          transparent: showFrame || showLayers,
          opacity: showLayers ? 0.38 : showFrame ? 0.64 : 1,
        }));
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        group.add(mesh);
        const edge = new THREE.LineSegments(
          new THREE.EdgesGeometry(meshGeometry, 1),
          new THREE.LineBasicMaterial({ color: '#3f5863', transparent: true, opacity: 0.9 })
        );
        group.add(edge);
      });
    }


    if (showFrame) {
      const timber = new THREE.MeshStandardMaterial({ color: '#a87543', roughness: 0.86 });
      const darkerTimber = new THREE.MeshStandardMaterial({ color: '#82552f', roughness: 0.9 });
      const steel = new THREE.MeshStandardMaterial({ color: '#6f8994', metalness: 0.55, roughness: 0.38 });
      const addBeam = (a: Point3, b: Point3, width = 0.08, height = 0.16, material = timber) => {
        const start = point(a), end = point(b);
        const direction = end.clone().sub(start);
        const length = direction.length();
        if (length < 0.015) return;
        const beam = new THREE.Mesh(new THREE.BoxGeometry(length, height, width), material);
        beam.position.copy(start).add(end).multiplyScalar(0.5);
        beam.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), direction.normalize());
        beam.castShadow = true;
        beam.receiveShadow = true;
        group.add(beam);
      };
      const x0 = -project.overhang, x1 = project.length + project.overhang;
      const y0 = -project.overhang, y1 = project.width + project.overhang;
      const centerY = project.width / 2;
      const stations = clampCount(Math.ceil((x1 - x0) / 0.6));
      const ridgeY = centerY;
      const pitchRad = project.pitch * Math.PI / 180;
      const eaveA: Point3 = { x: x0, y: y0, z: 0.04 };
      const eaveB: Point3 = { x: x1, y: y0, z: 0.04 };
      const eaveC: Point3 = { x: x0, y: y1, z: 0.04 };
      const eaveD: Point3 = { x: x1, y: y1, z: 0.04 };

      // Wall plates (мауэрлат) around the bearing walls.
      addBeam(eaveA, eaveB, 0.14, 0.14, darkerTimber);
      addBeam(eaveC, eaveD, 0.14, 0.14, darkerTimber);
      if (project.type === 'gable') {
        // Ridge beam and paired common rafters.
        addBeam({ x: x0, y: ridgeY, z: geometry.rise }, { x: x1, y: ridgeY, z: geometry.rise }, 0.16, 0.2, darkerTimber);
        for (let i = 0; i < stations; i++) {
          const x = x0 + (x1 - x0) * i / (stations - 1);
          const left: Point3 = { x, y: y0, z: 0.08 };
          const ridge: Point3 = { x, y: ridgeY, z: geometry.rise };
          const right: Point3 = { x, y: y1, z: 0.08 };
          addBeam(left, ridge, 0.07, 0.18);
          addBeam(ridge, right, 0.07, 0.18);
          // Ceiling joist / tie beam across the building.
          addBeam({ x, y: y0, z: 0.14 }, { x, y: y1, z: 0.14 }, 0.07, 0.16, darkerTimber);
          // Collar tie in the upper third of each truss.
          const tieY0 = centerY - project.width * 0.22;
          const tieY1 = centerY + project.width * 0.22;
          const tieZ = geometry.rise * 0.56;
          addBeam({ x, y: tieY0, z: tieZ }, { x, y: tieY1, z: tieZ }, 0.055, 0.12);
        }
        // Purlins running along the roof slope, supported by rafters.
        for (const side of [-1, 1]) {
          for (const fraction of [0.28, 0.56, 0.8]) {
            const y = centerY + side * (project.width / 2) * fraction;
            const z = geometry.rise * (1 - fraction);
            addBeam({ x: x0, y, z: z + 0.035 }, { x: x1, y, z: z + 0.035 }, 0.08, 0.12, darkerTimber);
          }
        }
        // Ridge support posts and diagonal braces, shown as schematic framing.
        const postCount = Math.max(2, Math.floor((x1 - x0) / 2.4) + 1);
        for (let i = 0; i < postCount; i++) {
          const x = x0 + (x1 - x0) * i / (postCount - 1);
          addBeam({ x, y: ridgeY, z: 0.18 }, { x, y: ridgeY, z: Math.max(0.2, geometry.rise - 0.12) }, 0.12, 0.14, darkerTimber);
          if (i > 0 && i < postCount - 1) {
            addBeam({ x, y: ridgeY, z: geometry.rise * 0.42 }, { x: x - Math.min(0.75, (x1-x0)*0.08), y: ridgeY - Math.min(0.65, project.width*0.12), z: geometry.rise * 0.16 }, 0.055, 0.1);
            addBeam({ x, y: ridgeY, z: geometry.rise * 0.42 }, { x: x + Math.min(0.75, (x1-x0)*0.08), y: ridgeY + Math.min(0.65, project.width*0.12), z: geometry.rise * 0.16 }, 0.055, 0.1);
          }
        }
      } else if (project.type === 'shed') {
        const lowY = y0, highY = y1;
        for (let i = 0; i < stations; i++) {
          const x = x0 + (x1 - x0) * i / (stations - 1);
          addBeam({ x, y: lowY, z: 0.08 }, { x, y: highY, z: geometry.rise + 0.08 }, 0.07, 0.18);
        }
        for (const fraction of [0.25, 0.5, 0.75]) {
          const y = y0 + (y1-y0)*fraction;
          addBeam({ x: x0, y, z: geometry.rise*fraction + 0.04 }, { x: x1, y, z: geometry.rise*fraction + 0.04 }, 0.08, 0.12, darkerTimber);
        }
      } else if (project.type === 'hip') {
        // Hip rafters from corners to ridge ends, plus common rafters.
        const inset = Math.min(project.length + 2*project.overhang, project.width + 2*project.overhang) / 2;
        const ridgeStart = x0 + inset;
        const ridgeEnd = x1 - inset;
        const ridgeZ = geometry.rise;
        if (ridgeEnd > ridgeStart + 0.08) addBeam({ x: ridgeStart, y: centerY, z: ridgeZ }, { x: ridgeEnd, y: centerY, z: ridgeZ }, 0.14, 0.18, darkerTimber);
        addBeam({ x: x0, y: y0, z: 0.08 }, { x: ridgeStart, y: centerY, z: ridgeZ }, 0.1, 0.2, darkerTimber);
        addBeam({ x: x0, y: y1, z: 0.08 }, { x: ridgeStart, y: centerY, z: ridgeZ }, 0.1, 0.2, darkerTimber);
        addBeam({ x: x1, y: y0, z: 0.08 }, { x: ridgeEnd, y: centerY, z: ridgeZ }, 0.1, 0.2, darkerTimber);
        addBeam({ x: x1, y: y1, z: 0.08 }, { x: ridgeEnd, y: centerY, z: ridgeZ }, 0.1, 0.2, darkerTimber);
        for (let i = 0; i < stations; i++) {
          const x = x0 + (x1 - x0) * i / (stations - 1);
          const peakZ = Math.max(0.08, Math.min(x - x0, x1 - x, project.width / 2) * Math.tan(pitchRad));
          addBeam({ x, y: y0, z: 0.08 }, { x, y: centerY, z: peakZ }, 0.065, 0.16);
          addBeam({ x, y: centerY, z: peakZ }, { x, y: y1, z: 0.08 }, 0.065, 0.16);
        }
      } else {
        // Flat roof joists and perimeter beams.
        const acrossCount = clampCount(Math.ceil((y1-y0)/0.6));
        for (let i = 0; i < acrossCount; i++) {
          const y = y0 + (y1-y0)*i/(acrossCount-1);
          addBeam({ x: x0, y, z: 0.08 }, { x: x1, y, z: 0.08 }, 0.07, 0.16);
        }
        for (const fraction of [0.25, 0.5, 0.75]) {
          const y = y0 + (y1-y0)*fraction;
          addBeam({ x: x0, y, z: 0.12 }, { x: x1, y, z: 0.12 }, 0.1, 0.14, darkerTimber);
        }
      }
      // Eaves and gable-end outlines stay visible as thin technical edges.
      const outline: THREE.Vector3[] = [];
      geometry.faces.forEach(face => face.points.forEach((p, i) => outline.push(point(p), point(face.points[(i + 1) % face.points.length]))));
      group.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(outline), new THREE.LineBasicMaterial({ color: '#705037', transparent: true, opacity: 0.72 })));
      // Metal brackets at the wall-plate / rafter junctions.
      for (let i = 0; i < stations; i++) {
        const x = x0 + (x1-x0)*i/(stations-1);
        for (const y of [y0, y1]) {
          const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.055,0.1,0.025), steel);
          const v = point({x,y,z:0.09});
          bracket.position.copy(v);
          group.add(bracket);
        }
      }
    }

    scene.add(group);
    const size = Math.max(L, W, geometry.rise * 1.6, 4);
    camera.position.set(size * 1.35, size * 0.95, size * 1.35);
    camera.near = 0.1;
    camera.far = Math.max(500, size * 20);
    camera.updateProjectionMatrix();
    controls.target.set(0, -0.2, 0);
    controls.update();
  }, [project.type, project.length, project.width, project.pitch, project.overhang, showSurface, showFrame, showLayers, cover]);

  const resetView = () => {
    const state = sceneRef.current;
    if (!state) return;
    const geometry = buildRoofGeometry(project);
    const size = Math.max(geometry.footprint.length, geometry.footprint.width, geometry.rise * 1.6, 4);
    state.camera.position.set(size * 1.35, size * 0.95, size * 1.35);
    state.controls.target.set(0, -0.2, 0);
    state.controls.update();
  };

  return <div className="interactive-roof-wrap">
    <div className="roof-3d-toolbar">
      <label><input type="checkbox" checked={showSurface} onChange={e => setShowSurface(e.target.checked)}/> Покрытие</label>
      <label><input type="checkbox" checked={showFrame} onChange={e => setShowFrame(e.target.checked)}/> Каркас</label>
      <label><input type="checkbox" checked={showLayers} onChange={e => setShowLayers(e.target.checked)}/> Слои</label>
      <button type="button" className="btn btn-quiet btn-small" onClick={resetView}>Сбросить вид</button>
      <span className="cover-material-label">Фактура: {cover === 'metal' ? 'металлочерепица' : cover === 'profile' ? 'профнастил' : cover === 'shingle' ? 'гибкая черепица' : 'мембрана'}</span><span>Вращение мышью / пальцем · масштаб жестом</span>
    </div>
    <div ref={hostRef} className="roof-webgl-host" aria-label="Интерактивная трёхмерная модель крыши">
      {!ready && <div className="roof-webgl-fallback">3D-графика недоступна в этом браузере. Используйте чертёжные виды.</div>}
    </div>
  </div>;
}
