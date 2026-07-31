import assert from 'node:assert/strict';
import test from 'node:test';

import { makeProofViewModel, REQUIRED_CHECK_IDS } from './proof-model.mjs';

const claims = [
  {
    id: 'region-aware-reference-pbr',
    statement: 'A sufficiently long and auditable region-aware PBR capability statement.',
    evidenceFiles: ['scripts/extract_reference_pbr.py', 'tests/test_reference_pbr_regions.py'],
  },
  {
    id: 'self-contained-proof-run',
    statement: 'A sufficiently long and auditable self-contained proof runner statement.',
    evidenceFiles: ['scripts/prove.py', 'tests/test_proof_runner.py'],
  },
];
const CAPABILITY_SHA256 = 'c'.repeat(64);

function capability(release = '0.5.2') {
  return {
    schemaVersion: '1.0',
    artifactType: 'threejs-sculpt-dna-capability-proof',
    release,
    claims,
    scope: {
      doesNotProve: [
        'Stars do not prove quality.',
        'Passing contracts are not a visual benchmark.',
        'Superiority needs a blinded same-input comparison.',
      ],
    },
  };
}

function proofRun({
  release = '0.5.2',
  status = 'pass',
  ok = status === 'pass',
} = {}) {
  return {
    schemaVersion: '1.0',
    artifactType: 'threejs-sculpt-dna-proof-run',
    release,
    ok,
    commit: 'a'.repeat(40),
    generatedAt: '2026-07-31T01:02:03Z',
    offline: true,
    inputs: {
      capabilityProofSha256: CAPABILITY_SHA256,
      scriptPolicySha256: 'd'.repeat(64),
      pluginManifestSha256: 'e'.repeat(64),
    },
    summary: { status },
    limitations: [
      'This verifies committed contracts.',
      'Attention metrics are excluded.',
      'Visual output needs separate review.',
    ],
    checks: REQUIRED_CHECK_IDS.map((id) => ({
      id,
      label: id.replaceAll('-', ' '),
      status,
      durationMs: 1,
    })),
  };
}

test('passing proof produces the complete visible ledger', () => {
  const model = makeProofViewModel(
    capability(),
    proofRun(),
    CAPABILITY_SHA256,
  );
  assert.equal(model.state, 'pass');
  assert.equal(model.release, '0.5.2');
  assert.equal(model.checks.length, 6);
  assert.equal(model.claims.length, 2);
  assert.equal(model.claims[0].label, 'Region-aware PBR');
  assert.match(model.claims[0].evidence[0].url, /extract_reference_pbr\.py$/);
});

test('a failed check cannot render as passing', () => {
  const run = proofRun();
  run.checks[2].status = 'fail';
  const model = makeProofViewModel(capability(), run, CAPABILITY_SHA256);
  assert.equal(model.state, 'fail');
  const networked = proofRun();
  networked.offline = false;
  assert.equal(
    makeProofViewModel(capability(), networked, CAPABILITY_SHA256).state,
    'fail',
  );
});

test('release mismatch fails closed', () => {
  assert.throws(
    () => makeProofViewModel(
      capability('0.5.2'),
      proofRun({ release: '0.5.1' }),
      CAPABILITY_SHA256,
    ),
    /release mismatch/,
  );
});

test('missing, duplicate, or unexpected checks fail closed', () => {
  const missing = proofRun();
  missing.checks.pop();
  assert.throws(
    () => makeProofViewModel(capability(), missing, CAPABILITY_SHA256),
    /missing proof check/,
  );

  const duplicate = proofRun();
  duplicate.checks[1] = duplicate.checks[0];
  assert.throws(
    () => makeProofViewModel(capability(), duplicate, CAPABILITY_SHA256),
    /duplicate proof check/,
  );

  const unexpected = proofRun();
  unexpected.checks.push({ id: 'social-score', label: 'Social score', status: 'pass' });
  assert.throws(
    () => makeProofViewModel(capability(), unexpected, CAPABILITY_SHA256),
    /unexpected checks/,
  );
});

test('unsafe evidence paths are rejected', () => {
  const unsafe = capability();
  unsafe.claims = [
    {
      ...unsafe.claims[0],
      evidenceFiles: ['../private.txt'],
    },
  ];
  assert.throws(
    () => makeProofViewModel(unsafe, proofRun(), CAPABILITY_SHA256),
    /unsafe evidence path/,
  );
});

test('tampered capability bytes and invalid artifact types fail closed', () => {
  assert.throws(
    () => makeProofViewModel(capability(), proofRun(), 'f'.repeat(64)),
    /hash does not match/,
  );
  const invalid = proofRun();
  invalid.artifactType = 'social-proof';
  assert.throws(
    () => makeProofViewModel(capability(), invalid, CAPABILITY_SHA256),
    /artifact type is invalid/,
  );
});
