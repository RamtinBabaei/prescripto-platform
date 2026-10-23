import { spawn } from 'node:child_process';
const input = process.argv.slice(2);
const value = (flag) => {
  const i = input.indexOf(flag);
  return i >= 0 ? input[i + 1] : undefined;
};
const args = [
  'dev',
  '--ip',
  value('--host') || value('--ip') || '0.0.0.0',
  '--port',
  value('--port') || '4173',
];
const child = spawn(process.execPath, ['node_modules/wrangler/bin/wrangler.js', ...args], {
  stdio: 'inherit',
});
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
child.on('exit', (code) => process.exit(code || 0));
