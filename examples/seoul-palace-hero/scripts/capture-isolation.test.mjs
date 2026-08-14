import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';
import {
  allocateEphemeralPort,
  stopServer,
  verifySourceFingerprint,
  waitForServer,
} from './capture.mjs';
import {
  seoulRuntimeFingerprint,
  seoulSourceFingerprint,
} from '../vite.config.js';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const heroDir = path.resolve(scriptDir, '..');
const repoRoot = path.resolve(heroDir, '..', '..');

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

test('allocates a loopback ephemeral port', async () => {
  const port = await allocateEphemeralPort();
  assert.equal(Number.isInteger(port), true);
  assert.equal(port > 0, true);
});

test('rejects stale capture fingerprints', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response('served-fingerprint\n', { status: 200 });
  try {
    await assert.rejects(
      verifySourceFingerprint('http://127.0.0.1:1', 'expected-fingerprint'),
      /fingerprint mismatch/,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('fails when the isolated server exits before readiness', async () => {
  const listeners = new Map();
  const server = {
    once(event, listener) {
      listeners.set(event, listener);
      queueMicrotask(() => listener(1, null));
    },
    removeListener(event) {
      listeners.delete(event);
    },
  };
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('not ready'); };
  try {
    await assert.rejects(
      waitForServer('http://127.0.0.1:1', server, () => 'isolated failure'),
      /exited before capture readiness/,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('does not signal or wait for an already exited server', async () => {
  const server = new EventEmitter();
  server.exitCode = 1;
  server.signalCode = null;
  server.kill = () => {
    throw new Error('already exited server must not be signalled');
  };
  await stopServer(server, 1);
});

test('verifies the dev-only runtime rebind against a production build', async () => {
  const rebindPath = path.join(
    heroDir,
    'evidence',
    'runtime-identity-rebind.json',
  );
  const rebind = JSON.parse(await readFile(rebindPath, 'utf8'));
  const currentSource = await seoulSourceFingerprint();
  const currentRuntime = await seoulRuntimeFingerprint();
  assert.equal(rebind.currentRuntimeFingerprint, currentRuntime);
  assert.equal(
    rebind.lockfileSha256.after,
    sha256(await readFile(path.join(heroDir, 'package-lock.json'))),
  );
  assert.deepEqual(rebind.dependency, {
    name: 'nanoid',
    scope: 'dev-only',
    from: '3.3.16',
    to: '3.3.18',
  });

  await build({
    root: heroDir,
    configFile: path.join(heroDir, 'vite.config.js'),
    logLevel: 'silent',
  });

  const distDir = path.join(heroDir, 'dist');
  const javascript = rebind.equivalence.javascript;
  assert.deepEqual(
    {
      beforeFile: javascript.beforeFile,
      beforeSha256: javascript.beforeSha256,
      normalizedBeforeSha256: javascript.normalizedBeforeSha256,
    },
    {
      beforeFile: 'assets/index-B76AzwwI.js',
      beforeSha256: '69ec66ea179a8be9627d0f45f2ab4ac67980a6330234730a4c11edab06f7dae0',
      normalizedBeforeSha256: 'e7cf5037eb89400f7d35bb02a6dfa29de199234ade1da1379184f876b0042441',
    },
  );
  const javascriptBytes = await readFile(
    path.join(distDir, javascript.afterFile),
  );
  assert.equal(sha256(javascriptBytes), javascript.afterSha256);
  const normalizedJavascript = javascriptBytes.toString('utf8')
    .replaceAll(currentSource, '<SOURCE_FINGERPRINT>')
    .replaceAll(currentRuntime, '<RUNTIME_FINGERPRINT>');
  assert.equal(
    sha256(normalizedJavascript),
    javascript.normalizedAfterSha256,
  );
  assert.equal(
    javascript.normalizedBeforeSha256,
    javascript.normalizedAfterSha256,
  );

  const html = rebind.equivalence.html;
  assert.deepEqual(
    {
      beforeSha256: html.beforeSha256,
      normalizedBeforeSha256: html.normalizedBeforeSha256,
    },
    {
      beforeSha256: '6f7b095ba27a3b78d89d2d9a8af222b7ed24ad80102a2fa18b8fc490ff99bb51',
      normalizedBeforeSha256: 'd6888ec57e7230070ac46996fd148f10012723e65ce53dc891f22e335b83138b',
    },
  );
  const htmlBytes = await readFile(path.join(distDir, 'index.html'));
  assert.equal(sha256(htmlBytes), html.afterSha256);
  const normalizedHtml = htmlBytes.toString('utf8').replace(
    /index-[A-Za-z0-9_-]+\.js/g,
    'index-BUNDLE.js',
  );
  assert.equal(sha256(normalizedHtml), html.normalizedAfterSha256);
  assert.equal(html.normalizedBeforeSha256, html.normalizedAfterSha256);

  const distFiles = new Set(
    (await readdir(path.join(distDir, 'assets'))).map(
      (name) => `assets/${name}`,
    ),
  );
  const staticFiles = rebind.equivalence.staticFiles;
  assert.deepEqual(
    Object.fromEntries(
      Object.entries(staticFiles).map(([relative, hashes]) => [
        relative,
        hashes.beforeSha256,
      ]),
    ),
    {
      'assets/index-a5NIEgYr.css':
        '48b1532d93634e07cd04701602b0fe713348bececbeacdaee26d9b4755b0dd8d',
      'assets/seoul-challenge-reference-DXp23U6T.jpeg':
        'c227a3ac8958b14cf64e7e95b0943f9cdc1ab9455beca2b9ab8fb1f6d0931290',
    },
  );
  assert.deepEqual(
    [...distFiles].sort(),
    [javascript.afterFile, ...Object.keys(staticFiles)].sort(),
  );
  for (const [relative, hashes] of Object.entries(
    staticFiles,
  )) {
    assert.equal(distFiles.has(relative), true);
    assert.equal(hashes.beforeSha256, hashes.afterSha256);
    assert.equal(
      sha256(await readFile(path.join(distDir, relative))),
      hashes.afterSha256,
    );
  }

  assert.equal(
    sha256(await readFile(path.join(repoRoot, 'assets', 'seoul-challenge-reference.jpeg'))),
    staticFiles[
      'assets/seoul-challenge-reference-DXp23U6T.jpeg'
    ].afterSha256,
  );
});
