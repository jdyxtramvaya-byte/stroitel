import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { buildRoofGeometry, type RoofGeometryInput, type Point3 } from './roofGeometry';

type Props = { project: RoofGeometryInput; cover?: 'metal' | 'profile' | 'shingle' | 'membrane' };
const clampCount = (n: number) => Math.max(2, Math.min(100, n));

export default function InteractiveRoof3D({ project, cover = 'metal' }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{ scene: THREE.Scene; camera: THREE.PerspectiveCamera; renderer: THREE.WebGLRenderer; controls: OrbitControls } | null>(null);
  const [showSurface, setShowSurface] = useState(true);
  const [showFrame, setShowFrame] = useState(true);
  const [showBeams, setShowBeams] = useState(true);
  const [showBattens, setShowBattens] = useState(true);
  const [showSupports, setShowSupports] = useState(true);
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
          if (Array.isArray(material)) material.forEach(item => item.dispose());
          else material.dispose();
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
          if (Array.isArray(material)) material.forEach(item => item.dispose());
          else material.dispose();
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

    if (showSurface) {
      geometry.faces.forEach((face, index) => {
        const vertices: number[] = [];
        face.points.forEach(p => {
          const v = point(p);
          vertices.push(v.x, v.y, v.z);
        });
        const indices: number[] = [];
        for (let i = 1; i < face.points.length - 1; i++) indices.push(0, i, i + 1);
        const meshGeometry = new THREE.BufferGeometry();
        meshGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        meshGeometry.setIndex(indices);
        meshGeometry.computeVertexNormals();
        const mesh = new THREE.Mesh(meshGeometry, new THREE.MeshStandardMaterial({
          color: cover === 'metal' ? ['#718896', '#8299a5', '#637d8b', '#9aabb4'][index % 4] : cover === 'profile' ? ['#7f98a3', '#93aab4', '#6f8995', '#a5b8c0'][index % 4] : cover === 'shingle' ? ['#5c5a57', '#706d68', '#4c4b49', '#858078'][index % 4] : ['#a9b8b5', '#bdc9c5', '#96a8a4', '#cbd4d0'][index % 4],
          roughness: cover === 'metal' || cover === 'profile' ? 0.48 : 0.88,
          metalness: cover === 'metal' || cover === 'profile' ? 0.32 : 0.02,
          side: THREE.DoubleSide,
          transparent: showFrame,
          opacity: showFrame ? 0.64 : 1,
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

    // Timber members are real 3D solids, generated from the current roof dimensions.
    const timber = new THREE.MeshStandardMaterial({ color: '#a66e3f', roughness: 0.82, metalness: 0 });
    const battenMaterial = new THREE.MeshStandardMaterial({ color: '#e6ad70', roughness: 0.78, emissive: '#4b2910', emissiveIntensity: 0.12 });
    const supportMaterial = new THREE.MeshStandardMaterial({ color: '#78502f', roughness: 0.88 });
    const addBeam = (a: Point3, b: Point3, thickness: number, material: THREE.Material) => {
      const start = point(a), end = point(b);
      const direction = new THREE.Vector3().subVectors(end, start);
      const length = direction.length();
      if (length < 0.001) return;
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(length, thickness, thickness), material);
      mesh.position.copy(start).add(end).multiplyScalar(0.5);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), direction.normalize());
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
    };
    const x0Frame = -project.overhang, x1Frame = project.length + project.overhang;
    const y0Frame = -project.overhang, y1Frame = project.width + project.overhang;
    const frameCount = Math.max(2, Math.min(100, Math.ceil(project.length / 0.6) + 1));
    const roofPoint = (x: number, y: number): Point3 => {
      const yy = Math.max(0, Math.min(project.width, y));
      let z = 0;
      if (project.type === 'gable') z = Math.max(0, geometry.rise * (1 - Math.abs(yy - project.width / 2) / Math.max(project.width / 2, 0.001)));
      else if (project.type === 'shed') z = geometry.rise * yy / Math.max(project.width, 0.001);
      else if (project.type === 'hip') {
        const dx = Math.min(x + project.overhang, project.length + project.overhang - x);
        const dy = Math.min(yy + project.overhang, project.width + project.overhang - yy);
        z = Math.max(0, Math.min(dx, dy) * Math.tan(project.pitch * Math.PI / 180));
      }
      return { x, y, z: z + 0.03 };
    };

    if (showBeams && project.type !== 'flat') {
      // Paired rafters (or mono-pitch rafters) at 600 mm nominal spacing.
      for (let i = 0; i < frameCount; i++) {
        const x = x0Frame + (x1Frame - x0Frame) * i / (frameCount - 1);
        if (project.type === 'gable') {
          addBeam({ x, y: y0Frame, z: 0.06 }, roofPoint(x, project.width / 2), 0.16, timber);
          addBeam(roofPoint(x, project.width / 2), { x, y: y1Frame, z: 0.06 }, 0.16, timber);
          addBeam({ x, y: y0Frame, z: 0.02 }, { x, y: y1Frame, z: 0.02 }, 0.14, supportMaterial);
        } else if (project.type === 'shed') {
          addBeam({ x, y: y0Frame, z: 0.06 }, { x, y: y1Frame, z: geometry.rise + 0.06 }, 0.16, timber);
        } else {
          const centerY = project.width / 2;
          addBeam(roofPoint(x, y0Frame), roofPoint(x, centerY), 0.14, timber);
          addBeam(roofPoint(x, centerY), roofPoint(x, y1Frame), 0.14, timber);
        }
      }
      // Ridge beam and perimeter wall plates.
      if (project.type === 'gable') {
        addBeam(roofPoint(x0Frame, project.width / 2), roofPoint(x1Frame, project.width / 2), 0.2, supportMaterial);
      }
      addBeam({ x: x0Frame, y: y0Frame, z: 0.04 }, { x: x1Frame, y: y0Frame, z: 0.04 }, 0.18, supportMaterial);
      addBeam({ x: x0Frame, y: y1Frame, z: 0.04 }, { x: x1Frame, y: y1Frame, z: 0.04 }, 0.18, supportMaterial);
    }

    if (showBattens && project.type !== 'flat') {
      // Horizontal roof battens run parallel to the eaves, separately on each roof plane.
      // Raise them visibly above the roof skin so they remain legible in the assembled model.
      const battenCount = Math.max(4, Math.min(70, Math.ceil(project.width / 0.32) + 1));
      const raised = (x: number, y: number): Point3 => {
        const p = roofPoint(x, y);
        return { ...p, z: p.z + 0.12 };
      };
      if (project.type === 'gable') {
        for (let j = 1; j < battenCount - 1; j++) {
          const t = j / (battenCount - 1);
          const yA = t * project.width / 2;
          const yB = project.width - yA;
          addBeam(raised(x0Frame, yA), raised(x1Frame, yA), 0.09, battenMaterial);
          addBeam(raised(x0Frame, yB), raised(x1Frame, yB), 0.09, battenMaterial);
        }
      } else {
        for (let j = 1; j < battenCount; j++) {
          const y = y0Frame + (y1Frame - y0Frame) * j / battenCount;
          addBeam(raised(x0Frame, y), raised(x1Frame, y), 0.09, battenMaterial);
        }
      }
    }

    if (showSupports && project.type === 'gable') {
      const supportCount = Math.max(1, Math.min(8, Math.floor(project.length / 2.5)));
      for (let i = 1; i <= supportCount; i++) {
        const x = project.length * i / (supportCount + 1);
        const top = roofPoint(x, project.width / 2);
        addBeam({ x, y: project.width / 2, z: 0.05 }, top, 0.13, supportMaterial);
        addBeam({ x, y: project.width / 2, z: Math.max(0.25, geometry.rise * 0.55) }, roofPoint(x, project.width * 0.22), 0.09, timber);
        addBeam({ x, y: project.width / 2, z: Math.max(0.25, geometry.rise * 0.55) }, roofPoint(x, project.width * 0.78), 0.09, timber);
      }
    }

    if (showFrame) {
      const linePoints: THREE.Vector3[] = [];
      const addLine = (a: Point3, b: Point3) => { linePoints.push(point(a), point(b)); };
      const x0 = -project.overhang, x1 = project.length + project.overhang;
      const y0 = -project.overhang, y1 = project.width + project.overhang;
      const stations = clampCount(Math.ceil(project.length / 0.6));
      for (let i = 0; i < stations; i++) {
        const x = x0 + (x1 - x0) * (i / (stations - 1));
        if (project.type === 'gable') {
          addLine({ x, y: y0, z: 0 }, { x, y: project.width / 2, z: geometry.rise });
          addLine({ x, y: project.width / 2, z: geometry.rise }, { x, y: y1, z: 0 });
        } else if (project.type === 'shed') {
          addLine({ x, y: y0, z: 0 }, { x, y: y1, z: geometry.rise });
        } else if (project.type === 'hip') {
          const centerRise = Math.max(0, Math.min(x - x0, x1 - x, W / 2) * Math.tan(project.pitch * Math.PI / 180));
          const centerY = project.width / 2;
          addLine({ x, y: y0, z: Math.max(0, centerRise - Math.abs(centerY - y0) * Math.tan(project.pitch * Math.PI / 180)) }, { x, y: centerY, z: centerRise });
          addLine({ x, y: centerY, z: centerRise }, { x, y: y1, z: Math.max(0, centerRise - Math.abs(y1 - centerY) * Math.tan(project.pitch * Math.PI / 180)) });
        } else {
          for (let j = 0; j <= 4; j++) {
            const y = y0 + (y1 - y0) * j / 4;
            addLine({ x, y, z: 0.035 }, { x, y, z: 0.035 });
          }
        }
      }
      geometry.faces.forEach(face => {
        face.points.forEach((p, i) => addLine(p, face.points[(i + 1) % face.points.length]));
      });
      const framingGeometry = new THREE.BufferGeometry().setFromPoints(linePoints);
      group.add(new THREE.LineSegments(framingGeometry, new THREE.LineBasicMaterial({ color: '#a36c3c', linewidth: 2 })));
      if (project.type === 'flat') {
        const deckPoints: THREE.Vector3[] = [];
        const nx = clampCount(Math.ceil(L / 0.6)), nz = clampCount(Math.ceil(W / 0.6));
        for (let i = 0; i < nx; i++) {
          const x = x0 + (x1 - x0) * i / (nx - 1);
          deckPoints.push(point({ x, y: y0, z: 0.05 }), point({ x, y: y1, z: 0.05 }));
        }
        for (let i = 0; i < nz; i++) {
          const y = y0 + (y1 - y0) * i / (nz - 1);
          deckPoints.push(point({ x: x0, y, z: 0.05 }), point({ x: x1, y, z: 0.05 }));
        }
        group.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(deckPoints), new THREE.LineBasicMaterial({ color: '#a36c3c' })));
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
  }, [project.type, project.length, project.width, project.pitch, project.overhang, showSurface, showFrame, showBeams, showBattens, showSupports, cover]);

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
      <label><input type="checkbox" checked={showFrame} onChange={e => setShowFrame(e.target.checked)}/> Контур</label>
      <label><input type="checkbox" checked={showBeams} onChange={e => setShowBeams(e.target.checked)}/> Стропила и балки</label>
      <label><input type="checkbox" checked={showBattens} onChange={e => setShowBattens(e.target.checked)}/> Обрешётка</label>
      <label><input type="checkbox" checked={showSupports} onChange={e => setShowSupports(e.target.checked)}/> Стойки и подкосы</label>
      <button type="button" className="btn btn-quiet btn-small" onClick={resetView}>Сбросить вид</button>
      <span>Вращение мышью / пальцем · масштаб жестом</span>
    </div>
    <div ref={hostRef} className="roof-webgl-host" aria-label="Интерактивная трёхмерная модель крыши">
      {!ready && <div className="roof-webgl-fallback">3D-графика недоступна в этом браузере. Используйте чертёжные виды.</div>}
    </div>
  </div>;
}
