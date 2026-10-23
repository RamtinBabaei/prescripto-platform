import { createInterface } from 'node:readline/promises';
import { scryptSync, randomBytes, randomUUID } from 'node:crypto';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
const rl = createInterface({ input: process.stdin, output: process.stdout });
const name = (await rl.question('Full name: ')).trim();
const email = (await rl.question('Email: ')).trim().toLowerCase();
const role = (await rl.question('Role (admin/doctor): ')).trim();
const doctorId =
  role === 'doctor' ? (await rl.question('Doctor profile ID (for example doc1): ')).trim() : '';
const remote =
  (await rl.question('Use live database? Type yes, otherwise local: ')).trim() === 'yes';
rl.close();
if (!process.stdin.isTTY) throw Error('Run this command in an interactive terminal.');
process.stdout.write('Password (at least 12 characters): ');
process.stdin.setRawMode(true);
process.stdin.resume();
let password = '';
await new Promise((resolve, reject) => {
  function input(chunk) {
    for (const char of chunk.toString()) {
      if (char === '\u0003') {
        process.stdin.off('data', input);
        reject(Error('Cancelled'));
        return;
      }
      if (char === '\r' || char === '\n') {
        process.stdin.off('data', input);
        resolve();
        return;
      }
      if (char === '\u007f') {
        password = password.slice(0, -1);
        process.stdout.write('\b \b');
      } else if (char >= ' ') {
        password += char;
        process.stdout.write('*');
      }
    }
  }
  process.stdin.on('data', input);
}).finally(() => {
  process.stdin.setRawMode(false);
  process.stdin.pause();
  process.stdout.write('\n');
});
if (
  name.length < 2 ||
  !/^\S+@\S+\.\S+$/.test(email) ||
  !['admin', 'doctor'].includes(role) ||
  password.length < 12
)
  throw Error('Invalid account details.');
const salt = randomBytes(16).toString('hex');
const hash =
  'scrypt:' + salt + ':' + scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 }).toString('hex');
password = '';
const quote = (v) => "'" + v.replaceAll("'", "''") + "'";
const id = randomUUID();
let sql = `INSERT INTO users(id,name,email,password_hash,role) VALUES(${[id, name, email, hash, role].map(quote).join(',')});`;
if (role === 'doctor') {
  if (!doctorId) throw Error('Doctor ID required');
  sql += `UPDATE doctors SET user_id=${quote(id)} WHERE id=${quote(doctorId)} AND user_id IS NULL;`;
}
const dir = await mkdtemp(join(tmpdir(), 'prescripto-staff-'));
const file = join(dir, 'staff.sql');
try {
  await writeFile(file, sql, { mode: 0o600 });
  const result = spawnSync(
    process.execPath,
    [
      'node_modules/wrangler/bin/wrangler.js',
      'd1',
      'execute',
      'prescripto-db',
      remote ? '--remote' : '--local',
      '--file',
      file,
    ],
    { stdio: 'inherit' },
  );
  if (result.status !== 0) throw Error('Account provisioning failed.');
  console.log('Staff account provisioned. Sign in at /login and open /staff.');
} finally {
  await rm(dir, { recursive: true, force: true });
}
