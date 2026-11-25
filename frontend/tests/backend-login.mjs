import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { resolve } from 'node:path';

const username = process.env.QA_USERNAME;
const password = process.env.QA_PASSWORD;
if (!username || !password) {
  console.error('Set QA_USERNAME and QA_PASSWORD to check the real backend login.');
  process.exit(2);
}

const server = spawn(resolve('src-tauri/bin/SpilMcpServer.exe'), [], {
  cwd: resolve('src-tauri/bin'),
  stdio: ['pipe', 'pipe', 'ignore'],
});
const lines = createInterface({ input: server.stdout });
const pending = new Map();
lines.on('line', line => {
  try {
    const response = JSON.parse(line);
    pending.get(response.id)?.(response);
    pending.delete(response.id);
  } catch { /* Ignore non-protocol output. */ }
});
let nextId = 0;
function request(method, params) {
  const id = ++nextId;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`${method} timed out`));
    }, 15_000);
    pending.set(id, response => {
      clearTimeout(timer);
      resolve(response);
    });
    server.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`);
  });
}

try {
  const init = await request('initialize', {
    protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'qa-login-check', version: '1.0.0' },
  });
  if (init.error) throw new Error('MCP initialization failed');
  server.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' })}\n`);
  const result = await request('tools/call', { name: 'login', arguments: { username, password } });
  const payload = result.result?.structuredContent ?? result.result?.content?.[0]?.text;
  const data = typeof payload === 'string' ? JSON.parse(payload) : payload;
  if (result.error || result.result?.isError || data?.success !== true) {
    const reason = data?.message ?? result.error?.message ?? 'No success response from backend';
    throw new Error(`Real backend login failed: ${reason}`);
  }
  console.log(`Real backend login passed for ${data.username} (${data.role}).`);
  for (const name of ['get_inventory', 'get_orders', 'get_users']) {
    const read = await request('tools/call', {
      name,
      arguments: { sessionToken: data.sessionToken },
    });
    if (read.error || read.result?.isError) throw new Error(`${name} failed after login`);
    console.log(`${name} passed.`);
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  server.kill();
}
