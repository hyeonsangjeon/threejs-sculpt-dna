import { createHash } from 'node:crypto';
import {
  access,
  mkdir,
  open,
  readFile,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';


const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const heroDir = path.resolve(scriptDir, '..');
const repoRoot = path.resolve(heroDir, '..', '..');
const assetsDir = path.join(repoRoot, 'assets');
const evidenceDir = path.join(heroDir, 'evidence');
const framesDir = path.join(heroDir, `.capture-frames-${process.pid}`);
const captureLockPath = path.join(heroDir, '.capture.lock');
const gifFrameCount = 24;
const gifFps = 6;


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


function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? heroDir,
    encoding: 'utf8',
    stdio: options.quiet ? 'pipe' : 'inherit',
  });
  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(' ')} failed: ${result.stderr || result.stdout || result.status}`,
    );
  }
}


export async function allocateEphemeralPort(host = '127.0.0.1') {
  const reservation = createServer();
  await new Promise((resolve, reject) => {
    reservation.once('error', reject);
    reservation.listen(0, host, resolve);
  });
  const address = reservation.address();
  const port = typeof address === 'object' && address ? address.port : null;
  await new Promise((resolve, reject) => reservation.close((error) => (
    error ? reject(error) : resolve()
  )));
  if (!Number.isInteger(port)) {
    throw new Error('Could not allocate an ephemeral capture port.');
  }
  return port;
}


export async function waitForServer(url, server, serverOutput = () => '') {
  let settled = false;
  let onExit;
  const exited = new Promise((_, reject) => {
    onExit = (code, signal) => {
      reject(new Error(
        `Vite exited before capture readiness (code=${code}, signal=${signal}): ${serverOutput()}`,
      ));
    };
    server.once('exit', onExit);
  });
  const ready = (async () => {
    for (let attempt = 0; attempt < 600 && !settled; attempt += 1) {
      try {
        const response = await fetch(url, { cache: 'no-store' });
        if (response.ok) return;
      } catch {
        // The isolated Vite server is still starting.
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    if (!settled) throw new Error(`Timed out waiting for ${url}`);
  })();
  try {
    await Promise.race([ready, exited]);
  } finally {
    settled = true;
    server.removeListener('exit', onExit);
  }
}


async function waitForHero(page) {
  await page.waitForFunction(() => window.__REPOLIS_READY__ === true, {
    timeout: 120_000,
  });
}


async function sha256(filePath) {
  const content = await readFile(filePath);
  return createHash('sha256').update(content).digest('hex');
}


async function captureStage(page, baseUrl, stage, sourceName) {
  const pngPath = path.join(framesDir, `${stage}.png`);
  await page.goto(
    `${baseUrl}/?stage=${encodeURIComponent(stage)}&variant=0&motion=0&ui=0&capture=1&time=1.25`,
    { waitUntil: 'networkidle0' },
  );
  await waitForHero(page);
  await page.screenshot({ path: pngPath });
  const outputPath = path.join(evidenceDir, `${sourceName}.webp`);
  run('cwebp', ['-quiet', '-q', '84', pngPath, '-o', outputPath], { quiet: true });
  const comparisonPng = path.join(framesDir, `${stage}-comparison.png`);
  run(
    'python3',
    [
      path.join(repoRoot, 'scripts', 'make_visual_comparison_sheet.py'),
      '--reference',
      path.join(assetsDir, 'repolis-tree-reference.jpeg'),
      '--render',
      pngPath,
      '--out',
      comparisonPng,
      '--json',
    ],
    { cwd: repoRoot, quiet: true },
  );
  run(
    'cwebp',
    [
      '-quiet',
      '-q',
      '82',
      comparisonPng,
      '-o',
      path.join(evidenceDir, `${sourceName}-comparison.webp`),
    ],
    { quiet: true },
  );
}


function processIsRunning(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error.code !== 'ESRCH';
  }
}


async function acquireCaptureLock() {
  try {
    const handle = await open(captureLockPath, 'wx');
    try {
      await handle.writeFile(`${JSON.stringify({
        pid: process.pid,
        startedAt: new Date().toISOString(),
      })}\n`);
      const lockStat = await handle.stat();
      return { handle, device: lockStat.dev, inode: lockStat.ino };
    } catch (error) {
      try {
        await handle.close();
      } finally {
        await rm(captureLockPath, { force: true });
      }
      throw error;
    }
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
    let owner;
    try {
      owner = JSON.parse(await readFile(captureLockPath, 'utf8'));
    } catch {
      throw new Error(
        `Capture lock ${captureLockPath} is malformed; remove it only after verifying no capture is running.`,
      );
    }
    if (Number.isInteger(owner?.pid) && processIsRunning(owner.pid)) {
      throw new Error(
        `Another capture (PID ${owner.pid}) owns ${captureLockPath}.`,
      );
    }
    throw new Error(
      `Stale capture lock from PID ${owner?.pid ?? 'unknown'} at ${captureLockPath}; `
        + 'verify no capture is running, then remove the lock explicitly.',
    );
  }
}


async function releaseCaptureLock(lock) {
  try {
    await lock.handle.close();
  } finally {
    try {
      const current = await stat(captureLockPath);
      if (current.dev === lock.device && current.ino === lock.inode) {
        await rm(captureLockPath, { force: true });
      }
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
}


export async function stopServer(server, timeoutMs = 5000) {
  if (!server || server.exitCode !== null || server.signalCode !== null) return;
  const closed = new Promise((resolve) => server.once('close', resolve));
  server.kill('SIGTERM');
  let timeoutId;
  const stopped = await Promise.race([
    closed.then(() => true),
    new Promise((resolve) => {
      timeoutId = setTimeout(() => resolve(false), timeoutMs);
    }),
  ]);
  clearTimeout(timeoutId);
  if (!stopped && server.exitCode === null && server.signalCode === null) {
    server.kill('SIGKILL');
    await closed;
  }
}


async function main() {
  const chromePath = await findChrome();
  const captureLock = await acquireCaptureLock();
  let server;
  let browser;
  try {
    await rm(framesDir, { recursive: true, force: true });
    await mkdir(framesDir, { recursive: true });
    await mkdir(evidenceDir, { recursive: true });
    const port = await allocateEphemeralPort();
    const baseUrl = `http://127.0.0.1:${port}`;
    let serverOutput = '';
    server = spawn(
      process.execPath,
      [
        path.join(heroDir, 'node_modules', 'vite', 'bin', 'vite.js'),
        '--host',
        '127.0.0.1',
        '--port',
        String(port),
        '--strictPort',
      ],
      {
        cwd: heroDir,
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false,
      },
    );
    for (const stream of [server.stdout, server.stderr]) {
      stream.on('data', (chunk) => {
        serverOutput = `${serverOutput}${chunk}`.slice(-8000);
      });
    }
    await waitForServer(baseUrl, server, () => serverOutput);
    const gitProbe = await fetch(`${baseUrl}/.git/HEAD`, { cache: 'no-store' });
    const gitProbeBody = await gitProbe.text();
    if (/^ref: refs\//m.test(gitProbeBody) || /^[0-9a-f]{40}$/m.test(gitProbeBody)) {
      throw new Error('Local server exposed .git metadata.');
    }
    browser = await puppeteer.launch({
      executablePath: chromePath,
      headless: true,
      args: ['--no-sandbox', '--disable-dev-shm-usage'],
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 675, deviceScaleFactor: 1 });

    await page.goto(`${baseUrl}/?stage=full&variant=0&motion=0&capture=1&time=1.25`, {
      waitUntil: 'networkidle0',
    });
    await waitForHero(page);
    const stats = await page.evaluate(() => window.__REPOLIS_HERO__.stats);
    const heroRawPng = path.join(framesDir, 'hero-ui-raw.png');
    await page.screenshot({ path: heroRawPng });
    run(
      process.env.FFMPEG_BIN ?? 'ffmpeg',
      [
        '-hide_banner',
        '-loglevel',
        'error',
        '-y',
        '-i',
        heroRawPng,
        '-frames:v',
        '1',
        '-map_metadata',
        '-1',
        path.join(assetsDir, 'repolis-tree-hero.png'),
      ],
      { quiet: true },
    );

    await page.goto(`${baseUrl}/?stage=full&variant=0&motion=0&ui=0&capture=1&time=1.25`, {
      waitUntil: 'networkidle0',
    });
    await waitForHero(page);
    for (let index = 0; index < gifFrameCount; index += 1) {
      const angle = -0.35 + index * Math.PI * 2 / gifFrameCount;
      await page.evaluate((value) => window.__setHeroAngle(value), angle);
      await new Promise((resolve) => setTimeout(resolve, 30));
      await page.screenshot({
        path: path.join(framesDir, `frame-${String(index).padStart(2, '0')}.png`),
      });
    }
    run(
      process.env.FFMPEG_BIN ?? 'ffmpeg',
      [
        '-hide_banner',
        '-loglevel',
        'error',
        '-y',
        '-framerate',
        String(gifFps),
        '-i',
        path.join(framesDir, 'frame-%02d.png'),
        '-filter_complex',
        `fps=${gifFps},scale=960:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=192[p];[s1][p]paletteuse=dither=bayer:bayer_scale=3`,
        '-loop',
        '0',
        path.join(assetsDir, 'repolis-tree-hero.gif'),
      ],
      { quiet: true },
    );

    const stages = [
      ['blockout', 'blockout'],
      ['structural-pass', 'structural-pass'],
      ['form-refinement', 'form-refinement'],
      ['material-pass', 'material-pass'],
      ['surface-pass', 'surface-pass'],
    ];
    for (const [stage, sourceName] of stages) {
      await captureStage(page, baseUrl, stage, sourceName);
    }
    await page.goto(`${baseUrl}/?stage=full&variant=0&motion=0&ui=0&capture=1&time=1.25`, {
      waitUntil: 'networkidle0',
    });
    await waitForHero(page);
    const finalPng = path.join(framesDir, 'final.png');
    await page.screenshot({ path: finalPng });
    run('cwebp', ['-quiet', '-q', '86', finalPng, '-o', path.join(evidenceDir, 'final.webp')], { quiet: true });
    const finalComparison = path.join(framesDir, 'final-comparison.png');
    run(
      'python3',
      [
        path.join(repoRoot, 'scripts', 'make_visual_comparison_sheet.py'),
        '--reference',
        path.join(assetsDir, 'repolis-tree-reference.jpeg'),
        '--render',
        finalPng,
        '--out',
        finalComparison,
        '--json',
      ],
      { cwd: repoRoot, quiet: true },
    );
    run(
      'cwebp',
      ['-quiet', '-q', '84', finalComparison, '-o', path.join(evidenceDir, 'final-comparison.webp')],
      { quiet: true },
    );

    const sources = [
      'index.html',
      'main.js',
      'style.css',
      'repolis-output/createRepolisHero.js',
      'repolis-output/repolis-hero-profile.json',
      '../repolis-tree/object-sculpt-spec.json',
      'package.json',
      'package-lock.json',
      'scripts/capture.mjs',
      'scripts/capture-isolation.test.mjs',
    ];
    const outputs = [
      '../../assets/repolis-tree-hero.png',
      '../../assets/repolis-tree-hero.gif',
      ...[
        'blockout',
        'structural-pass',
        'form-refinement',
        'material-pass',
        'surface-pass',
        'final',
      ].flatMap((name) => [
        `evidence/${name}.webp`,
        `evidence/${name}-comparison.webp`,
      ]),
    ];
    const manifest = {
      schemaVersion: '1.0',
      capture: {
        seed: 20260711,
        variant: 'golden-canopy',
        viewport: [1200, 675],
        frames: gifFrameCount,
        fps: gifFps,
        rotationSeconds: gifFrameCount / gifFps,
        deterministic: true,
        canonicalElapsed: 1.25,
        chrome: path.basename(chromePath),
        localGitMetadataExposed: false,
        isolatedLoopbackServer: true,
        portAllocation: 'ephemeral-os-assigned',
      },
      runtimeStats: stats,
      sourceSha256: Object.fromEntries(
        await Promise.all(
          sources.map(async (relative) => [
            relative,
            await sha256(path.resolve(heroDir, relative)),
          ]),
        ),
      ),
      outputSha256: Object.fromEntries(
        await Promise.all(
          outputs.map(async (relative) => [
            relative,
            await sha256(path.resolve(heroDir, relative)),
          ]),
        ),
      ),
    };
    await writeFile(
      path.join(heroDir, 'artifact-manifest.json'),
      `${JSON.stringify(manifest, null, 2)}\n`,
      'utf8',
    );
  } finally {
    try {
      await browser?.close();
    } finally {
      try {
        await stopServer(server);
      } finally {
        try {
          await rm(framesDir, { recursive: true, force: true });
        } finally {
          await releaseCaptureLock(captureLock);
        }
      }
    }
  }
}


if (
  process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
