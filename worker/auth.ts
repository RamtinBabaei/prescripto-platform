import { scryptSync, timingSafeEqual, randomBytes } from 'node:crypto';
export function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  return `scrypt:${salt}:${scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 }).toString('hex')}`;
}
export function verifyPassword(password: string, stored: string) {
  const [version, salt, hash] = stored.split(':');
  if (version !== 'scrypt' || !salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 });
  const expected = Buffer.from(hash, 'hex');
  return expected.length === candidate.length && timingSafeEqual(expected, candidate);
}
export async function digest(value: string) {
  return Buffer.from(
    await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)),
  ).toString('hex');
}
export function sessionCookie(token: string, secure: boolean, clear = false) {
  return `prescripto_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${clear ? 0 : 604800}${secure ? '; Secure' : ''}`;
}
