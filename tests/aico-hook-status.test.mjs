// @verifies spec-ft-terminal-native-hook-gate-bridge::TASK-HOOK-001-2::REQ-002
// @verifies spec-ft-terminal-native-hook-gate-bridge::TASK-HOOK-001-2::REQ-006

import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { dispatchHookStatus } from '../scripts/aico-hook-status.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SCRIPT_PATH = path.resolve(__dirname, '../scripts/aico-hook-status.mjs');

test('REQ-006: dispatchHookStatus gracefully handles offline server without throwing', async () => {
  // Use a port where no server is listening
  const offlinePort = 59876;
  const result = await dispatchHookStatus('waiting_for_input', {
    toolCall: { name: 'ask_question' },
    conversationId: 'test-conv-1',
  }, offlinePort);

  assert.strictEqual(result.decision, 'allow');
  assert.strictEqual(result.statusCode, null);
});

test('REQ-002: dispatchHookStatus delivers payload to active HTTP server', async () => {
  let receivedPayload = null;
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      receivedPayload = JSON.parse(body);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok' }));
    });
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;

  try {
    const result = await dispatchHookStatus('waiting_for_input', {
      toolCall: { name: 'ask_question' },
      conversationId: 'test-conv-abc',
    }, port);

    assert.strictEqual(result.decision, 'allow');
    assert.strictEqual(result.statusCode, 200);
    assert.deepStrictEqual(receivedPayload, {
      state: 'waiting_for_input',
      reason: 'Waiting for input (ask_question)',
      tab_id: 'test-conv-abc',
    });
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('REQ-006: CLI invocation runs cleanly via stdin and exits with code 0', () => {
  const stdinInput = JSON.stringify({
    toolCall: { name: 'ask_question' },
    conversationId: 'test-conv-cli',
  });

  const stdout = execFileSync('node', [SCRIPT_PATH, 'waiting_for_input'], {
    input: stdinInput,
    encoding: 'utf8',
    env: { ...process.env, AICO_PORT: '59877' }, // offline port
  });

  const parsed = JSON.parse(stdout);
  assert.strictEqual(parsed.decision, 'allow');
});
