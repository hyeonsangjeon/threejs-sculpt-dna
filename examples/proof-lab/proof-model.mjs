const REQUIRED_CHECK_IDS = [
  'executable-policy',
  'capability-contract',
  'first-clone-doctor',
  'python-compile',
  'python-contracts',
  'release-evidence',
];

const CLAIM_LABELS = {
  'modular-v4-modeling-kernel': 'Modular modeling kernel',
  'procedural-geometry-breadth': 'Procedural geometry breadth',
  'region-aware-reference-pbr': 'Region-aware PBR',
  'schema-compatibility': 'Schema compatibility',
  'deterministic-asset-families': 'Deterministic asset families',
  'evidence-and-review-integrity': 'Evidence and review integrity',
  'action-ready-host-integration': 'Action-ready integration',
  'first-clone-trust': 'First-clone trust',
  'production-flagships': 'Production flagships',
  'self-contained-proof-run': 'Self-contained proof run',
};

const SOURCE_ROOT = 'https://github.com/hyeonsangjeon/threejs-sculpt-dna/blob/main/';

function assertObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value;
}

function assertString(value, label) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value;
}

function assertSha256(value, label) {
  if (typeof value !== 'string' || !/^[0-9a-f]{64}$/.test(value)) {
    throw new Error(`${label} must be a lowercase SHA-256 digest`);
  }
  return value;
}

function proofState(proofRun, checks) {
  if (proofRun.summary?.status === 'pending') return 'pending';
  const passed = checks.every((check) => check.status === 'pass');
  return proofRun.ok === true && proofRun.offline === true && passed
    ? 'pass'
    : 'fail';
}

export function makeProofViewModel(
  capabilityInput,
  runInput,
  capabilitySha256,
) {
  const capability = assertObject(capabilityInput, 'capability proof');
  const proofRun = assertObject(runInput, 'proof run');
  if (
    capability.schemaVersion !== '1.0'
    || capability.artifactType !== 'threejs-sculpt-dna-capability-proof'
  ) {
    throw new Error('capability proof schema or artifact type is invalid');
  }
  if (
    proofRun.schemaVersion !== '1.0'
    || proofRun.artifactType !== 'threejs-sculpt-dna-proof-run'
  ) {
    throw new Error('proof run schema or artifact type is invalid');
  }
  const inputs = assertObject(proofRun.inputs, 'proof run inputs');
  const declaredCapabilitySha256 = assertSha256(
    inputs.capabilityProofSha256,
    'capability proof input',
  );
  if (
    assertSha256(capabilitySha256, 'loaded capability proof')
    !== declaredCapabilitySha256
  ) {
    throw new Error('capability proof hash does not match the verified input');
  }
  const release = assertString(capability.release, 'capability release');
  if (proofRun.release !== release) {
    throw new Error(
      `release mismatch: capability ${release}, proof run ${String(proofRun.release)}`,
    );
  }

  if (!Array.isArray(proofRun.checks)) {
    throw new Error('proof run checks must be an array');
  }
  const byId = new Map();
  for (const check of proofRun.checks) {
    assertObject(check, 'proof check');
    const id = assertString(check.id, 'proof check id');
    if (byId.has(id)) throw new Error(`duplicate proof check ${id}`);
    byId.set(id, check);
  }
  const checks = REQUIRED_CHECK_IDS.map((id) => {
    const check = byId.get(id);
    if (!check) throw new Error(`missing proof check ${id}`);
    if (!['pass', 'fail', 'pending'].includes(check.status)) {
      throw new Error(`invalid status for proof check ${id}`);
    }
    return {
      id,
      label: assertString(check.label, `proof check ${id} label`),
      status: check.status,
      durationMs: Number.isFinite(check.durationMs) ? check.durationMs : null,
    };
  });
  if (byId.size !== REQUIRED_CHECK_IDS.length) {
    throw new Error('proof run contains unexpected checks');
  }

  if (!Array.isArray(capability.claims) || capability.claims.length === 0) {
    throw new Error('capability claims must be a non-empty array');
  }
  const claimIds = new Set();
  const claims = capability.claims.map((claim, index) => {
    assertObject(claim, `claim ${index}`);
    const id = assertString(claim.id, `claim ${index} id`);
    if (claimIds.has(id)) throw new Error(`duplicate capability claim ${id}`);
    claimIds.add(id);
    if (!Array.isArray(claim.evidenceFiles) || claim.evidenceFiles.length === 0) {
      throw new Error(`claim ${id} must link evidence`);
    }
    return {
      id,
      label: CLAIM_LABELS[id] ?? id.replaceAll('-', ' '),
      statement: assertString(claim.statement, `claim ${id} statement`),
      evidence: claim.evidenceFiles.map((path) => {
        const safePath = assertString(path, `claim ${id} evidence path`);
        if (safePath.startsWith('/') || safePath.includes('..')) {
          throw new Error(`claim ${id} has unsafe evidence path`);
        }
        return {
          path: safePath,
          url: `${SOURCE_ROOT}${safePath.split('/').map(encodeURIComponent).join('/')}`,
        };
      }),
    };
  });

  const capabilityLimitations = Array.isArray(capability.scope?.doesNotProve)
    ? capability.scope.doesNotProve
    : [];
  const runLimitations = Array.isArray(proofRun.limitations)
    ? proofRun.limitations
    : [];
  const declaredLimitations = capabilityLimitations.length >= 3
    ? capabilityLimitations
    : runLimitations;
  const limitations = declaredLimitations.filter((item, index, values) => (
    typeof item === 'string' && item.length > 0 && values.indexOf(item) === index
  ));
  if (limitations.length < 3) {
    throw new Error('proof surface must publish at least three limitations');
  }

  const commit = assertString(proofRun.commit, 'proof run commit');
  if (commit !== 'working-tree' && !/^[0-9a-f]{40}$/.test(commit)) {
    throw new Error('proof run commit is invalid');
  }
  return {
    release,
    state: proofState(proofRun, checks),
    checks,
    claims,
    commit,
    generatedAt: proofRun.generatedAt ?? null,
    offline: proofRun.offline === true,
    limitations,
  };
}

export { REQUIRED_CHECK_IDS };
