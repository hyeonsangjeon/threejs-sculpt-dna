# React Three Fiber runtime adapter demo

This live example mounts the existing Brick Off-Road Explorer factory through
the optional `@threejs-sculpt-dna/react-three-fiber` adapter.

It demonstrates:

- deterministic seed and variant rebuilds
- `useFrame` delegation to the factory update loop
- node articulation without React frame-state churn
- live socket lookup with a cyan world-space marker
- collider, node, socket, and factory-stat access
- React 19 StrictMode-safe allocation and exact-once cleanup

Run it locally:

```bash
npm ci
npm test
npm run dev
```

The adapter remains optional. The same `createBrickOffroad` factory is used by
the existing plain Three.js flagship.
