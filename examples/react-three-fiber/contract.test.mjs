import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizeFactoryOutput } from '@threejs-sculpt-dna/react-three-fiber';
import {
  BRICK_BASE_CONFIG,
  createBrickOffroad,
} from '@threejs-sculpt-dna/brick-offroad-factory';

test('real Brick factory exposes the complete R3F adapter contract', () => {
  const source = createBrickOffroad({
    seed: 20260712,
    variant: BRICK_BASE_CONFIG.id,
    stage: 'blockout',
  });
  const instance = normalizeFactoryOutput(source);

  assert.equal(instance.root.isObject3D, true);
  assert.equal(instance.runtime.nodes.chassis.isObject3D, true);
  assert.equal(instance.runtime.sockets['hood-hinge-socket'].isObject3D, true);
  assert.equal(instance.runtime.colliders['chassis-collider'].type, 'box');
  assert.ok(instance.runtime.destructionGroups['body-shell'].length > 0);
  assert.equal(instance.stats.configurationId, BRICK_BASE_CONFIG.id);
  assert.equal(instance.stats.importedMeshes, 0);

  instance.update(1.5, 1 / 60);
  instance.dispose();
  instance.dispose();
});

test('same seed and variant preserve runtime identity values across rebuilds', () => {
  const options = {
    seed: 20260712,
    variant: BRICK_BASE_CONFIG.id,
    stage: 'blockout',
  };
  const first = normalizeFactoryOutput(createBrickOffroad(options));
  const second = normalizeFactoryOutput(createBrickOffroad(options));
  try {
    assert.deepEqual(Object.keys(first.runtime.nodes), Object.keys(second.runtime.nodes));
    assert.deepEqual(Object.keys(first.runtime.sockets), Object.keys(second.runtime.sockets));
    assert.deepEqual(Object.keys(first.runtime.colliders), Object.keys(second.runtime.colliders));
    assert.equal(first.stats.configurationId, second.stats.configurationId);
    assert.equal(first.stats.triangles, second.stats.triangles);
  } finally {
    first.dispose();
    second.dispose();
  }
});
