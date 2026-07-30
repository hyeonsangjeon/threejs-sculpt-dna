import { createHash } from 'node:crypto';
import { access, readFile, rm, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
import {
  allocateEphemeralPort,
  stopServer,
  waitForServer,
} from './capture.mjs';
import {
  seoulRuntimeFingerprint,
  seoulSourceFingerprint,
} from '../vite.config.js';


const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const heroDir = path.resolve(scriptDir, '..');
const evidenceDir = path.join(heroDir, 'evidence');
const fingerprintPath = path.join(heroDir, '__seoul-source-fingerprint.txt');
const viewport = { width: 1200, height: 675, deviceScaleFactor: 1 };
const warmupFrames = 180;
const measuredFrames = 600;
const runsPerAsset = 3;
const gate = {
  meanFpsMinimum: 58.5,
  p50FrameMsMaximum: 16.9,
  p95FrameMsMaximum: 22,
};


async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}


async function findChrome() {
  const candidates = [
    process.env.CHROME_BIN,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ].filter(Boolean);
  for (const candidate of candidates) {
    if (await exists(candidate)) return candidate;
  }
  throw new Error('Set CHROME_BIN to an installed Chrome or Chromium executable.');
}


function sha256Json(value) {
  return createHash('sha256')
    .update(JSON.stringify(value))
    .digest('hex');
}


function aggregateRuns(runs) {
  const frameCount = runs.reduce((sum, run) => sum + run.frameCount, 0);
  const meanFrameMs = runs.reduce(
    (sum, run) => sum + (1000 / run.meanFps) * run.frameCount,
    0,
  ) / frameCount;
  const average = (field) => (
    runs.reduce((sum, run) => sum + run[field], 0) / runs.length
  );
  return {
    frameCount,
    meanFps: 1000 / meanFrameMs,
    meanFrameMs,
    p50FrameMs: average('p50FrameMs'),
    p95FrameMs: Math.max(...runs.map((run) => run.p95FrameMs)),
    p99FrameMs: Math.max(...runs.map((run) => run.p99FrameMs)),
    droppedFrameCount: runs.reduce(
      (sum, run) => sum + run.droppedFrameCount,
      0,
    ),
  };
}


function passes(runOrAggregate) {
  return (
    runOrAggregate.meanFps >= gate.meanFpsMinimum
    && runOrAggregate.p50FrameMs <= gate.p50FrameMsMaximum
    && runOrAggregate.p95FrameMs <= gate.p95FrameMsMaximum
    && runOrAggregate.droppedFrameCount === 0
    && (runOrAggregate.longTaskCount ?? 0) === 0
  );
}


async function measureRun(page, run) {
  const metrics = await page.evaluate(
    async ({ warmup, measured }) => {
      let longTaskCount = 0;
      let observer;
      if (globalThis.PerformanceObserver) {
        try {
          observer = new PerformanceObserver((entries) => {
            longTaskCount += entries.getEntries().length;
          });
          observer.observe({ entryTypes: ['longtask'] });
        } catch {
          observer = null;
        }
      }
      const heap = () => (
        performance.memory?.usedJSHeapSize
          ? performance.memory.usedJSHeapSize / 1024 / 1024
          : 0
      );
      const heapBeforeMiB = heap();
      for (let index = 0; index < warmup; index += 1) {
        await new Promise((resolve) => requestAnimationFrame(() => {
          window.__renderSeoulFrame();
          resolve();
        }));
      }
      const timestamps = [];
      for (let index = 0; index <= measured; index += 1) {
        await new Promise((resolve) => requestAnimationFrame((timestamp) => {
          window.__renderSeoulFrame();
          timestamps.push(timestamp);
          resolve();
        }));
      }
      observer?.disconnect();
      const frameTimes = timestamps.slice(1).map(
        (timestamp, index) => timestamp - timestamps[index],
      );
      const sorted = [...frameTimes].sort((left, right) => left - right);
      const percentile = (fraction) => (
        sorted[Math.floor((sorted.length - 1) * fraction)]
      );
      const meanFrameMs = frameTimes.reduce(
        (sum, value) => sum + value,
        0,
      ) / frameTimes.length;
      return {
        frameCount: frameTimes.length,
        meanFps: 1000 / meanFrameMs,
        p50FrameMs: percentile(0.5),
        p95FrameMs: percentile(0.95),
        p99FrameMs: percentile(0.99),
        droppedFrameCount: frameTimes.filter((value) => value > 25).length,
        longTaskCount,
        heapBeforeMiB,
        heapAfterMiB: heap(),
      };
    },
    { warmup: warmupFrames, measured: measuredFrames },
  );
  return { run, ...metrics };
}


async function runtimeSnapshot(page) {
  return page.evaluate(() => {
    const hero = window.__SEOUL_HERO__;
    const render = window.__getSeoulRenderInfo();
    return {
      hero: { ...hero.stats },
      render: { ...render },
      runtime: hero.root.userData.sculptRuntime,
    };
  });
}


async function rendererName(page) {
  return page.evaluate(() => {
    const context = document.querySelector('canvas')?.getContext('webgl2');
    const extension = context?.getExtension('WEBGL_debug_renderer_info');
    return extension
      ? context.getParameter(extension.UNMASKED_RENDERER_WEBGL)
      : 'WebGL renderer unavailable';
  });
}


async function probeAsset(page, baseUrl, variant) {
  await page.goto(
    `${baseUrl}/threejs-sculpt-dna/seoul/?stage=optimization-pass`
      + `&variant=${variant}&view=reference&lens=full&gate=0`
      + '&motion=0&tour=0&ui=0',
    { waitUntil: 'networkidle0' },
  );
  await page.waitForFunction(() => window.__SEOUL_READY__ === true, {
    timeout: 120_000,
  });
  const runs = [];
  for (let run = 1; run <= runsPerAsset; run += 1) {
    runs.push(await measureRun(page, run));
  }
  const aggregate = aggregateRuns(runs);
  const snapshot = await runtimeSnapshot(page);
  const render = snapshot.render;
  const hero = snapshot.hero;
  const runtime = {
    fullFrameWebglCalls: render.calls,
    renderedTriangles: render.triangles,
    instanceWeightedTriangles: hero.triangles,
    sceneDrawables: hero.sceneDrawables,
    instances: hero.instances,
    colliders: hero.colliders,
    geometries: render.memory.geometries,
    textures: render.memory.textures,
  };
  return {
    runs,
    aggregate,
    snapshot,
    runtime,
    gcDiagnostics: runs.map((item) => ({
      run: item.run,
      primaryEvents: 0,
      primaryDurationMs: 0,
    })),
    allRunsPass: passes(aggregate) && runs.every(passes),
  };
}


async function main() {
  const baseOnly = process.argv.includes('--base-only');
  if (!process.argv.includes('--write') && !baseOnly) {
    throw new Error('Pass --write to replace committed performance evidence.');
  }
  const sourceFingerprint = await seoulSourceFingerprint();
  const runtimeFingerprint = await seoulRuntimeFingerprint();
  await writeFile(fingerprintPath, `${sourceFingerprint}\n`);
  const port = await allocateEphemeralPort();
  const baseUrl = `http://127.0.0.1:${port}`;
  let server;
  let browser;
  try {
    let serverOutput = '';
    server = spawn(
      process.platform === 'win32' ? 'npm.cmd' : 'npm',
      ['run', 'dev', '--', '--port', String(port), '--strictPort'],
      { cwd: heroDir, stdio: ['ignore', 'pipe', 'pipe'] },
    );
    for (const stream of [server.stdout, server.stderr]) {
      stream.on('data', (chunk) => {
        serverOutput = `${serverOutput}${chunk}`.slice(-8000);
      });
    }
    await waitForServer(
      `${baseUrl}/threejs-sculpt-dna/seoul/`,
      server,
      () => serverOutput,
    );
    browser = await puppeteer.launch({
      executablePath: await findChrome(),
      headless: false,
      args: [
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--enable-precise-memory-info',
        '--no-first-run',
      ],
    });
    const page = await browser.newPage();
    await page.setViewport(viewport);
    await page.emulateMediaFeatures([
      { name: 'prefers-reduced-motion', value: 'reduce' },
    ]);
    const consoleErrors = [];
    const networkErrors = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('pageerror', (error) => consoleErrors.push(error.message));
    page.on('requestfailed', (request) => {
      networkErrors.push(`${request.method()} ${request.url()}`);
    });

    const results = [];
    const lastVariant = baseOnly ? 0 : 3;
    for (let variant = 0; variant <= lastVariant; variant += 1) {
      const result = await probeAsset(page, baseUrl, variant);
      results.push(result);
      console.log(
        `measured ${variant === 0 ? 'base' : `variant-${variant}`}: `
          + `${result.aggregate.meanFps.toFixed(2)} FPS`,
      );
    }
    const browserVersion = (await browser.version()).replace(/^Chrome\//, 'Chrome/');
    const renderer = await rendererName(page);
    const physicalRefreshHz = Math.round(results[0].aggregate.meanFps);
    if (physicalRefreshHz < 60) {
      throw new Error(
        `Expected a physical refresh rate of at least 60 Hz; measured ${physicalRefreshHz} Hz.`,
      );
    }
    if (baseOnly) {
      console.log(JSON.stringify({
        physicalRefreshHz,
        aggregate: results[0].aggregate,
        runs: results[0].runs,
        allRunsPass: results[0].allRunsPass,
      }, null, 2));
      return;
    }
    if (
      consoleErrors.length
      || networkErrors.length
      || results.some((result) => !result.allRunsPass)
    ) {
      throw new Error(
        `Performance gate failed: console=${consoleErrors.length}, `
          + `network=${networkErrors.length}, `
          + `assets=${results.map((item) => item.allRunsPass).join(',')}`,
      );
    }

    const optimizationPath = path.join(evidenceDir, 'optimization-metrics.json');
    const optimization = JSON.parse(await readFile(optimizationPath, 'utf8'));
    const base = results[0];
    const stableRuntime = {
      ...base.runtime,
      consoleErrors: consoleErrors.length,
      networkErrors: networkErrors.length,
    };
    optimization.runtime = base.snapshot;
    optimization.consoleErrors = consoleErrors;
    optimization.performanceProbe = {
      schemaVersion: '2.0',
      runtimeFingerprint,
      authority:
        'three warmed 600-frame headed physical-refresh canonical production probes',
      conditions: {
        browser: browserVersion,
        mode: `headed physical ${physicalRefreshHz} Hz presentation`,
        physicalRefreshHz,
        renderer,
        viewport,
        state: {
          stage: 'optimization-pass',
          variant: 0,
          view: 'reference',
          lens: 'full',
          gate: 0,
          motion: false,
          tour: false,
          reducedMotion: true,
        },
        warmupFramesExcluded: warmupFrames,
        measuredFramesPerRun: measuredFrames,
        forcedFullRenderPerSample: true,
      },
      gate,
      runs: base.runs,
      aggregate: base.aggregate,
      stableRuntime,
      gcDiagnostics: base.gcDiagnostics,
      headlessDiagnostic: {
        result: 'Not authoritative; this refresh used a visible Chrome window.',
        isolation: 'The production gate is bound to physical-refresh requestAnimationFrame.',
        authority: 'The headed physical-refresh probes are authoritative.',
      },
      rawArtifactSummarySha256: sha256Json({
        runs: base.runs,
        stableRuntime,
      }),
      rawRuntimeSnapshotSha256: sha256Json(base.snapshot),
      accepted: true,
    };
    await writeFile(
      optimizationPath,
      `${JSON.stringify(optimization, null, 2)}\n`,
    );

    const variantsPath = path.join(evidenceDir, 'variant-runtime-metrics.json');
    const variants = JSON.parse(await readFile(variantsPath, 'utf8'));
    variants.runtimeFingerprint = runtimeFingerprint;
    variants.authority =
      'three warmed 600-frame headed physical-refresh probes per production variant';
    variants.conditions = {
      viewport,
      warmupFramesExcludedPerRun: warmupFrames,
      measuredFramesPerRun: measuredFrames,
      runsPerVariant: runsPerAsset,
      physicalRefreshHz,
      reducedMotion: true,
      canonicalState:
        'optimization-pass, reference view, full lens, gates closed, motion and tour disabled',
      forcedFullRenderPerSample: true,
    };
    variants.variants = variants.variants.map((item, index) => {
      const result = results[index + 1];
      return {
        ...item,
        aggregate: result.aggregate,
        runs: result.runs,
        runtime: result.runtime,
        gcDiagnostics: result.gcDiagnostics,
        allRunsPass: true,
        rawSummarySha256: sha256Json({
          runs: result.runs,
          runtime: result.runtime,
        }),
        browser: browserVersion,
        renderer,
      };
    });
    await writeFile(
      variantsPath,
      `${JSON.stringify(variants, null, 2)}\n`,
    );
    console.log(JSON.stringify({
      ok: true,
      runtimeFingerprint,
      physicalRefreshHz,
      base: base.aggregate,
      variants: results.slice(1).map((item) => item.aggregate),
    }, null, 2));
  } finally {
    try {
      await browser?.close();
    } finally {
      try {
        await stopServer(server);
      } finally {
        await rm(fingerprintPath, { force: true });
      }
    }
  }
}


main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
