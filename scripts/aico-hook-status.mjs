#!/usr/bin/env node

/**
 * aico-hook-status.mjs
 *
 * Antigravity lifecycle hook script that relays agent status changes (e.g. ask_question
 * interactive modal invocation) to aico-server to trigger blue waiting circle (🔵) in
 * browser document title and terminal tab indicators.
 */

// @implements spec-ft-terminal-native-hook-gate-bridge::TASK-HOOK-001-2::REQ-002
// @implements spec-ft-terminal-native-hook-gate-bridge::TASK-HOOK-001-2::REQ-006

import http from 'node:http';

export async function dispatchHookStatus(targetState = 'working', stdinJson = '{}', portOverride = null) {
  let payload = {};
  try {
    if (typeof stdinJson === 'string' && stdinJson.trim()) {
      payload = JSON.parse(stdinJson);
    } else if (typeof stdinJson === 'object' && stdinJson !== null) {
      payload = stdinJson;
    }
  } catch {
    // Ignore JSON parse failure
  }

  const reason = payload.toolCall?.name
    ? `Waiting for input (${payload.toolCall.name})`
    : targetState === 'waiting_for_input'
      ? 'Waiting for user input'
      : targetState === 'finished'
        ? 'Finished — ready for prompt'
        : 'LLM is working';

  const reqBody = JSON.stringify({
    state: targetState,
    reason,
    tab_id: payload.conversationId || undefined,
  });

  const port = portOverride || (process.env.AICO_PORT ? parseInt(process.env.AICO_PORT, 10) : 4242);

  const postPromise = new Promise((resolve) => {
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path: '/api/v1/terminal/ai-status',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(reqBody),
        },
        timeout: 250,
      },
      (res) => {
        res.resume();
        resolve(res.statusCode);
      }
    );

    req.on('error', () => {
      resolve(null);
    });

    req.on('timeout', () => {
      req.destroy();
      resolve(null);
    });

    req.write(reqBody);
    req.end();
  });

  const statusCode = await Promise.race([
    postPromise,
    new Promise((resolve) => setTimeout(() => resolve(null), 300)),
  ]);

  return { decision: 'allow', statusCode };
}

function readStdin(timeoutMs = 50) {
  return new Promise((resolve) => {
    let data = '';
    const timer = setTimeout(() => {
      resolve(data);
    }, timeoutMs);

    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      data += chunk;
    });
    process.stdin.on('end', () => {
      clearTimeout(timer);
      resolve(data);
    });
    process.stdin.on('error', () => {
      clearTimeout(timer);
      resolve(data);
    });
    process.stdin.resume();
  });
}

async function main() {
  const targetState = process.argv[2] || 'working';
  const stdinData = await readStdin(50);
  await dispatchHookStatus(targetState, stdinData);
  if (targetState === 'waiting_for_input') {
    process.stdout.write(JSON.stringify({ decision: 'allow' }));
  } else {
    process.stdout.write(JSON.stringify({}));
  }
  process.exit(0);
}

const isDirectRun = Boolean(process.argv[1] && process.argv[1].endsWith('aico-hook-status.mjs'));
if (isDirectRun) {
  main().catch(() => {
    process.stdout.write(JSON.stringify({}));
    process.exit(0);
  });
}
