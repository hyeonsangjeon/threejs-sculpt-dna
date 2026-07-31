import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { REQUIRED_CHECK_IDS } from './proof-model.mjs';

const sourceDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(sourceDir, '../..');
const distDir = path.join(sourceDir, 'dist');
const files = [
  'index.html',
  'style.css',
  'proof-lab.js',
  'proof-model.mjs',
];

await rm(distDir, { recursive: true, force: true });
await mkdir(distDir, { recursive: true });
await Promise.all(
  files.map((file) => cp(path.join(sourceDir, file), path.join(distDir, file))),
);
await cp(
  path.join(rootDir, 'capability-proof.json'),
  path.join(distDir, 'capability-proof.json'),
);

const capabilityText = await readFile(
  path.join(rootDir, 'capability-proof.json'),
  'utf8',
);
const capability = JSON.parse(capabilityText);
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const placeholder = {
  schemaVersion: '1.0',
  artifactType: 'threejs-sculpt-dna-proof-run',
  release: capability.release,
  repository: capability.repository,
  commit: 'working-tree',
  generatedAt: null,
  startedAt: null,
  offline: true,
  environment: {
    python: 'not-run',
    implementation: 'not-run',
    platform: 'not-run',
    machine: 'not-run',
  },
  inputs: {
    capabilityProofSha256: sha256(capabilityText),
    scriptPolicySha256: sha256(
      await readFile(path.join(rootDir, 'script-policy.json')),
    ),
    pluginManifestSha256: sha256(
      await readFile(path.join(rootDir, 'plugin.json')),
    ),
  },
  ok: false,
  summary: {
    status: 'pending',
    passed: 0,
    failed: 0,
    total: REQUIRED_CHECK_IDS.length,
    durationMs: 0,
  },
  checks: REQUIRED_CHECK_IDS.map((id) => ({
    id,
    label: id.replaceAll('-', ' '),
    status: 'pending',
    exitCode: null,
    timedOut: false,
    durationMs: 0,
    stdout: {
      preview: '',
      truncated: false,
      characters: 0,
      bytes: 0,
      sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    },
    stderr: {
      preview: '',
      truncated: false,
      characters: 0,
      bytes: 0,
      sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    },
  })),
  limitations: [
    'This local build has not run the repository proof suite yet.',
    'Passing contracts are not a visual-quality benchmark.',
    'Stars and other attention metrics are excluded from quality evidence.',
  ],
};
await writeFile(
  path.join(distDir, 'proof-run.json'),
  `${JSON.stringify(placeholder, null, 2)}\n`,
  'utf8',
);

console.log(`Built Proof Lab with ${capability.claims.length} capability claims.`);
