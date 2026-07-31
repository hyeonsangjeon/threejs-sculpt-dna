import { StrictMode, createRef } from 'react';
import ReactThreeTestRenderer from '@react-three/test-renderer';
import * as THREE from 'three';
import { describe, expect, test, vi } from 'vitest';

import {
  SculptDNAAsset,
  bindSculptDNAFactory,
  normalizeFactoryOutput,
  stableFactoryKey,
  type SculptDNAInstance,
  type StructuredFactoryResult,
} from '../src/index';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

type FactoryRecord = {
  seed: unknown;
  result: StructuredFactoryResult;
  update: ReturnType<typeof vi.fn>;
  dispose: ReturnType<typeof vi.fn>;
};

function factoryHarness(records: FactoryRecord[]) {
  return (options: Record<string, unknown>) => {
    const root = new THREE.Group();
    root.name = `asset-${String(options.seed)}`;
    const node = new THREE.Group();
    const socket = new THREE.Object3D();
    root.add(node);
    node.add(socket);
    const update = vi.fn();
    const dispose = vi.fn();
    const result: StructuredFactoryResult = {
      root,
      runtime: {
        nodes: { body: node },
        sockets: { roof: socket },
        colliders: { body: { type: 'box' } },
        destructionGroups: { shell: [node] },
      },
      stats: { seed: options.seed, triangles: 12 },
      update,
      dispose,
    };
    records.push({ seed: options.seed, result, update, dispose });
    return result;
  };
}

describe('React Three Fiber adapter', () => {
  test('mount exposes action-ready maps and advances the factory', async () => {
    const records: FactoryRecord[] = [];
    const ref = createRef<SculptDNAInstance | null>();
    const renderer = await ReactThreeTestRenderer.create(
      <SculptDNAAsset ref={ref} factory={factoryHarness(records)} seed={7} />,
    );

    expect(renderer.scene.children).toHaveLength(1);
    expect(ref.current?.root.name).toBe('asset-7');
    expect(ref.current?.runtime.nodes.body.isObject3D).toBe(true);
    expect(ref.current?.runtime.sockets.roof.isObject3D).toBe(true);
    expect(ref.current?.runtime.colliders.body).toEqual({ type: 'box' });
    expect(ref.current?.runtime.destructionGroups.shell).toHaveLength(1);
    expect(ref.current?.stats).toEqual({ seed: 7, triangles: 12 });

    await renderer.advanceFrames(2, 0.25);
    expect(records[0].update).toHaveBeenCalledTimes(2);
    expect(records[0].update.mock.calls[0][1]).toBe(0.25);
    await renderer.unmount();
    expect(records[0].dispose).toHaveBeenCalledTimes(1);
  });

  test('semantic prop changes rebuild once and dispose the superseded asset', async () => {
    const records: FactoryRecord[] = [];
    const factory = factoryHarness(records);
    const renderer = await ReactThreeTestRenderer.create(
      <SculptDNAAsset factory={factory} seed={11} variant="base" />,
    );
    const firstRoot = records[0].result.root;

    await renderer.update(
      <SculptDNAAsset factory={factory} variant="base" seed={11} />,
    );
    expect(records).toHaveLength(1);
    expect(renderer.scene.children[0].instance).toBe(firstRoot);

    await renderer.update(
      <SculptDNAAsset factory={factory} seed={12} variant="base" />,
    );
    expect(records.length).toBeGreaterThanOrEqual(1);
    expect(records[0].dispose).toHaveBeenCalledTimes(1);
    expect(renderer.scene.children[0].instance).toBe(records[1].result.root);

    await renderer.unmount();
    expect(records[1].dispose).toHaveBeenCalledTimes(1);
  });

  test('StrictMode balances every factory allocation with one disposal', async () => {
    const records: FactoryRecord[] = [];
    const renderer = await ReactThreeTestRenderer.create(
      <StrictMode>
        <SculptDNAAsset factory={factoryHarness(records)} seed={21} />
      </StrictMode>,
    );
    await renderer.unmount();
    expect(records.length).toBeGreaterThanOrEqual(1);
    expect(records.every((record) => record.dispose.mock.calls.length === 1)).toBe(true);
  });

  test('plain generated Object3D factories use embedded runtime and fallback disposal', () => {
    const root = new THREE.Group();
    const node = new THREE.Group();
    const geometry = new THREE.BoxGeometry();
    const texture = new THREE.Texture();
    const material = new THREE.MeshStandardMaterial({ map: texture });
    const geometryDispose = vi.spyOn(geometry, 'dispose');
    const textureDispose = vi.spyOn(texture, 'dispose');
    const materialDispose = vi.spyOn(material, 'dispose');
    node.add(new THREE.Mesh(geometry, material));
    root.add(node);
    root.userData.sculptRuntime = {
      nodes: { root: node },
      meshes: {},
      instances: {},
      sockets: {},
      colliders: {},
      destructionGroups: {},
    };
    const instance = normalizeFactoryOutput(root);
    expect(instance.runtime.nodes.root).toBe(node);
    instance.dispose();
    instance.dispose();
    expect(geometryDispose).toHaveBeenCalledTimes(1);
    expect(textureDispose).toHaveBeenCalledTimes(1);
    expect(materialDispose).toHaveBeenCalledTimes(1);
  });

  test('bound components retain the same lifecycle contract', async () => {
    const records: FactoryRecord[] = [];
    const BoundAsset = bindSculptDNAFactory(factoryHarness(records));
    const renderer = await ReactThreeTestRenderer.create(<BoundAsset seed={31} />);
    expect(records).toHaveLength(1);
    await renderer.unmount();
    expect(records[0].dispose).toHaveBeenCalledTimes(1);
  });

  test('factory keys are order-independent and reject unsafe option values', () => {
    expect(stableFactoryKey({ seed: 1, variant: 'a' })).toBe(
      stableFactoryKey({ variant: 'a', seed: 1 }),
    );
    expect(() => stableFactoryKey({ seed: Number.NaN })).toThrow(/non-finite/);
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    expect(() => stableFactoryKey(cyclic)).toThrow(/cycle/);
  });

  test('invalid outputs fail closed before entering the scene', () => {
    expect(() => normalizeFactoryOutput({} as StructuredFactoryResult)).toThrow(
      /must return an Object3D/,
    );
    expect(() => normalizeFactoryOutput({
      root: new THREE.Group(),
      runtime: { destructionGroups: { shell: [{} as THREE.Object3D] } },
    })).toThrow(
      /must contain Object3D/,
    );
  });
});
