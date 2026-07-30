import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import test from 'node:test';
import {
  allocateEphemeralPort,
  stopServer,
  waitForServer,
} from './capture.mjs';


function listen(server, port) {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', resolve);
  });
}


function close(server) {
  return new Promise((resolve, reject) => server.close((error) => (
    error ? reject(error) : resolve()
  )));
}


test('capture allocation avoids an occupied legacy port', async () => {
  const occupied = createServer((_request, response) => response.end('occupied'));
  let ownsLegacyPort = false;
  try {
    await listen(occupied, 4175);
    ownsLegacyPort = true;
  } catch (error) {
    if (error.code !== 'EADDRINUSE') throw error;
  }
  try {
    const allocated = await allocateEphemeralPort();
    assert.notEqual(allocated, 4175);
  } finally {
    if (ownsLegacyPort) await close(occupied);
  }
});


test('readiness fails immediately when the spawned server exits', async () => {
  const child = spawn(process.execPath, ['--eval', 'process.exit(23)'], {
    stdio: 'ignore',
  });
  await assert.rejects(
    waitForServer('http://127.0.0.1:1', child, () => 'intentional exit'),
    /exited before capture readiness.*intentional exit/i,
  );
});


test('does not signal or wait for an already exited server', async () => {
  const child = spawn(process.execPath, ['--eval', 'process.exit(0)'], {
    stdio: 'ignore',
  });
  await new Promise((resolve) => child.once('close', resolve));
  await stopServer(child, 1);
});
