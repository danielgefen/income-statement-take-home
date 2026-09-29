import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:net';
import { once } from 'node:events';
import { spawn } from 'node:child_process';

test('an occupied port produces an actionable startup error rather than a secondary crash', async t => {
  const occupied = createServer().listen(0, '127.0.0.1');
  t.after(() => new Promise(resolve => occupied.close(resolve)));
  await once(occupied, 'listening');
  const child = spawn(process.execPath, ['server/index.js'], {
    cwd: new URL('../', import.meta.url),
    env: { ...process.env, PORT: String(occupied.address().port) },
  });
  t.after(() => child.kill());
  let stderr = '';
  child.stderr.setEncoding('utf8').on('data', chunk => { stderr += chunk; });
  const [code] = await once(child, 'close');
  assert.equal(code, 1);
  assert.match(stderr, /Unable to start server:.*EADDRINUSE/);
  assert.doesNotMatch(stderr, /TypeError/);
});
