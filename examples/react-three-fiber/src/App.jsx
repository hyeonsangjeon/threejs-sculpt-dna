import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import { SculptDNAAsset } from '@threejs-sculpt-dna/react-three-fiber';
import {
  BRICK_BASE_CONFIG,
  BRICK_VARIANTS,
  createBrickOffroad,
} from '@threejs-sculpt-dna/brick-offroad-factory';

const INSTALL_COMMAND = 'copilot plugin install hyeonsangjeon/threejs-sculpt-dna';
const REPOSITORY = 'https://github.com/hyeonsangjeon/threejs-sculpt-dna';
const PROOF_LAB = 'https://hyeonsangjeon.github.io/threejs-sculpt-dna/proof/';
const CONFIGURATIONS = [BRICK_BASE_CONFIG, ...BRICK_VARIANTS];
const WORLD_POSITION = new THREE.Vector3();

function formatInteger(value) {
  return new Intl.NumberFormat('en-US').format(Number(value ?? 0));
}

function applyArticulation(instance, open) {
  if (!instance) return;
  const angle = open ? 0.62 : 0;
  const nodes = instance.runtime.nodes;
  if (nodes['left-door-pivot']) nodes['left-door-pivot'].rotation.y = -angle;
  if (nodes['right-door-pivot']) nodes['right-door-pivot'].rotation.y = angle;
  if (nodes['left-rear-door-pivot']) nodes['left-rear-door-pivot'].rotation.y = -angle * 0.8;
  if (nodes['right-rear-door-pivot']) nodes['right-rear-door-pivot'].rotation.y = angle * 0.8;
  if (nodes['hood-pivot']) nodes['hood-pivot'].rotation.z = open ? -0.42 : 0;
  if (nodes['tailgate-pivot']) nodes['tailgate-pivot'].rotation.z = open ? 0.48 : 0;
}

function SocketBeacon({ instance }) {
  const marker = useRef();
  useFrame(() => {
    const socket = instance?.runtime.sockets['roof-cargo-socket'];
    if (!socket || !marker.current) return;
    socket.getWorldPosition(WORLD_POSITION);
    WORLD_POSITION.y += 0.32;
    marker.current.position.copy(WORLD_POSITION);
    marker.current.rotation.y += 0.018;
  });
  if (!instance) return null;
  return (
    <mesh ref={marker}>
      <octahedronGeometry args={[0.13, 0]} />
      <meshStandardMaterial color="#68e6f0" emissive="#21b7c6" emissiveIntensity={2.2} />
    </mesh>
  );
}

function Ground() {
  return (
    <mesh rotation-x={-Math.PI / 2} position-y={-1.2} receiveShadow>
      <circleGeometry args={[12, 96]} />
      <meshStandardMaterial color="#0b1821" roughness={0.94} metalness={0.04} />
    </mesh>
  );
}

function CameraControls() {
  const camera = useThree((state) => state.camera);
  const element = useThree((state) => state.gl.domElement);
  const controls = useRef(null);
  useEffect(() => {
    const next = new OrbitControls(camera, element);
    next.enableDamping = true;
    next.dampingFactor = 0.07;
    next.enablePan = false;
    next.minDistance = 7;
    next.maxDistance = 16;
    next.minPolarAngle = 0.72;
    next.maxPolarAngle = 1.48;
    next.target.set(0, 1.25, 0);
    next.update();
    controls.current = next;
    return () => {
      if (controls.current === next) controls.current = null;
      next.dispose();
    };
  }, [camera, element]);
  useFrame(() => controls.current?.update());
  return null;
}

function Scene({ variant, seed, onReady, onDispose, instance }) {
  return (
    <>
      <color attach="background" args={['#07121c']} />
      <fog attach="fog" args={['#07121c', 12, 24]} />
      <ambientLight intensity={0.8} color="#b8d5e6" />
      <directionalLight
        castShadow
        position={[-5, 9, 6]}
        intensity={3.2}
        color="#ffe0a6"
        shadow-mapSize={[2048, 2048]}
      />
      <directionalLight position={[6, 3, -6]} intensity={2.1} color="#4bd4ec" />
      <group position={[0, -1.2, 0]} rotation={[0, -0.34, 0]}>
        <SculptDNAAsset
          factory={createBrickOffroad}
          seed={seed}
          variant={variant}
          stage="full"
          onReady={onReady}
          onDispose={onDispose}
        />
      </group>
      <SocketBeacon instance={instance} />
      <Ground />
      <CameraControls />
    </>
  );
}

function Metric({ label, value }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default function App() {
  const [variant, setVariant] = useState(CONFIGURATIONS[0].id);
  const [seed, setSeed] = useState(20260712);
  const [instance, setInstance] = useState(null);
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const selected = useMemo(
    () => CONFIGURATIONS.find((item) => item.id === variant) ?? CONFIGURATIONS[0],
    [variant],
  );
  const handleReady = useCallback((next) => setInstance(next), []);
  const handleDispose = useCallback((disposed) => {
    setInstance((current) => current === disposed ? null : current);
  }, []);

  useEffect(() => applyArticulation(instance, open), [instance, open]);

  async function copyInstall() {
    await navigator.clipboard.writeText(INSTALL_COMMAND);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  const runtimeCounts = instance ? {
    nodes: Object.keys(instance.runtime.nodes).length,
    sockets: Object.keys(instance.runtime.sockets).length,
    colliders: Object.keys(instance.runtime.colliders).length,
  } : { nodes: 0, sockets: 0, colliders: 0 };

  return (
    <main className="app-shell">
      <div className="canvas-shell" aria-label="Interactive React Three Fiber vehicle scene">
        <Canvas
          shadows="percentage"
          dpr={[1, 1.5]}
          camera={{ position: [8.4, 5.3, 9.2], fov: 37, near: 0.1, far: 60 }}
          gl={{ antialias: true, powerPreference: 'high-performance' }}
        >
          <Scene
            variant={variant}
            seed={seed}
            instance={instance}
            onReady={handleReady}
            onDispose={handleDispose}
          />
        </Canvas>
      </div>

      <header className="topbar">
        <a className="brand" href={REPOSITORY}>
          <span className="brand-mark">SD</span>
          <span>
            <strong>Three.js Sculpt DNA</strong>
            <small>React Three Fiber runtime adapter</small>
          </span>
        </a>
        <nav aria-label="Project links">
          <a href={PROOF_LAB}>Proof Lab</a>
          <a className="star-link" href={REPOSITORY}>Star on GitHub ↗</a>
        </nav>
      </header>

      <section className="intro-panel">
        <p className="eyebrow">v0.6 · optional adapter</p>
        <h1>Plain Three.js in.<br />React lifecycle, solved.</h1>
        <p>
          The procedural factory remains the source of truth. The adapter owns
          deterministic rebuilds, frame updates and exact-once cleanup.
        </p>
        <div className="status-row">
          <span className="status-dot" />
          {instance ? 'Mounted and frame-driven' : 'Building procedural asset…'}
        </div>
      </section>

      <section className="control-panel" aria-label="Sculpt DNA controls">
        <div className="control-heading">
          <div>
            <span>Live factory options</span>
            <strong>{selected.label}</strong>
          </div>
          <button type="button" onClick={() => setOpen((value) => !value)}>
            {open ? 'Close articulation' : 'Open articulation'}
          </button>
        </div>

        <div className="variant-grid">
          {CONFIGURATIONS.map((item, index) => (
            <button
              type="button"
              className={item.id === variant ? 'active' : ''}
              onClick={() => setVariant(item.id)}
              key={item.id}
            >
              <span>{String(index).padStart(2, '0')}</span>
              {index === 0 ? 'Base' : item.label}
            </button>
          ))}
        </div>

        <label className="seed-control">
          <span>Deterministic seed</span>
          <input
            type="number"
            value={seed}
            onChange={(event) => setSeed(Number(event.target.value) || 0)}
          />
        </label>

        <div className="metrics">
          <Metric label="Triangles" value={formatInteger(instance?.stats.triangles)} />
          <Metric label="Nodes" value={runtimeCounts.nodes} />
          <Metric label="Sockets" value={runtimeCounts.sockets} />
          <Metric label="Colliders" value={runtimeCounts.colliders} />
        </div>

        <div className="install-row">
          <code>{INSTALL_COMMAND}</code>
          <button type="button" onClick={copyInstall}>{copied ? 'Copied' : 'Copy'}</button>
        </div>
        <p className="microcopy">
          Cyan marker: live roof-cargo socket · Drag to orbit · Scroll to zoom
        </p>
      </section>
    </main>
  );
}
