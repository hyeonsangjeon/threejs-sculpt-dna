# React Three Fiber adapter

This optional adapter mounts either form of Three.js Sculpt DNA output:

- a generated `THREE.Object3D` with `root.userData.sculptRuntime`
- a structured flagship result with `root`, `runtime`, `stats`, `update`, and
  `dispose`

The plain Three.js factory stays the source of truth. React owns only the
mount/rebuild/unmount lifecycle.

```tsx
import { Canvas } from '@react-three/fiber';
import {
  SculptDNAAsset,
  type SculptDNAInstance,
} from '@threejs-sculpt-dna/react-three-fiber';
import { createBrickOffroad } from './createBrickOffroad.js';

function Scene() {
  const handle = useRef<SculptDNAInstance | null>(null);

  return (
    <Canvas>
      <SculptDNAAsset
        ref={handle}
        factory={createBrickOffroad}
        seed={20260712}
        variant="brick-offroad-v001"
        stage="full"
        onReady={(asset) => {
          asset.runtime.nodes['left-door-pivot'].rotation.y = 0.35;
          console.log(asset.runtime.sockets, asset.stats);
        }}
      />
    </Canvas>
  );
}
```

The adapter:

- creates resources only after React commits, so React 19 StrictMode does not
  leak render-phase allocations
- rebuilds only when canonicalized JSON-compatible factory options change
- forwards `elapsedSeconds` and `deltaSeconds` through `useFrame`
- exposes nodes, meshes, instances, sockets, colliders, destruction groups,
  stats, the root, and the original factory output
- detaches the root and calls the factory's own `dispose()` exactly once; a
  plain `Object3D` without a disposer gets a duplicate-safe traversal fallback
  for its geometry, material, texture, and skinned-mesh texture resources
- renders the existing root through `<primitive dispose={null}>`, avoiding
  double-disposal by React Three Fiber

Keep factory functions module-stable. High-frequency animation belongs in the
factory's `update` function or direct Three.js mutations, not React state.
Factories that share resources across roots should expose their own `dispose()`
so that ownership remains explicit.

Run the adapter contracts with:

```bash
npm ci
npm test
npm run build
```

See the live integration in `examples/react-three-fiber`.
