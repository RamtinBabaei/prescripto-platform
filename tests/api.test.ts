import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { readFile } from 'node:fs/promises';
import { hashPassword } from '../worker/auth';
let mf: Miniflare;
let patientCookie = '',
  otherCookie = '',
  adminCookie = '',
  doctorCookie = '',
  bookingId = '',
  slot = '';
async function call(
  path: string,
  method = 'GET',
  body?: unknown,
  cookie = '',
  origin = 'http://localhost',
) {
  const response = await mf.dispatchFetch('http://localhost/api' + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(cookie ? { cookie } : {}),
      ...(method !== 'GET' ? { Origin: origin } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { response, data: (await response.json()) as Record<string, unknown> };
}
beforeAll(async () => {
  mf = new Miniflare(
    convertV4MiniflareOptions({
      modules: true,
      scriptPath: '.deploy/worker.mjs',
      compatibilityDate: '2026-10-23',
      compatibilityFlags: ['nodejs_compat'],
      d1Databases: ['DB'],
      bindings: { APP_MODE: 'test' },
    }),
  );
  const db = await mf.getD1Database('DB');
  const sql = await readFile('db/migrations/0001_initial.sql', 'utf8');
  for (const s of sql
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean))
    await db.prepare(s).run();
  const seed = await readFile('db/seed.sql', 'utf8');
  for (const s of seed
    .replace(/^--.*$/gm, '')
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean))
    await db.prepare(s).run();
  for (const [id, role] of [
    ['staff-admin', 'admin'],
    ['staff-doctor', 'doctor'],
  ])
    await db
      .prepare('INSERT INTO users(id,name,email,password_hash,role) VALUES(?,?,?,?,?)')
      .bind(id, 'Test ' + role, role + '@test.example', hashPassword('Staff-password-123'), role)
      .run();
  await db.prepare("UPDATE doctors SET user_id='staff-doctor' WHERE id='doc1'").run();
}, 30000);
afterAll(async () => {
  await mf?.dispose();
});
describe('full API integration against real workerd and D1', () => {
  it('serves a healthy API and production frontend with security headers', async () => {
    const a = await call('/health');
    expect(a.response.status).toBe(200);
    expect(a.data.database).toBe('connected');
    const page = await mf.dispatchFetch('http://localhost/', {
      headers: { 'Accept-Encoding': 'identity' },
    });
    expect(page.status).toBe(200);
    expect(page.headers.get('content-security-policy')).toContain("frame-ancestors 'none'");
    expect(await page.text()).toContain('Prescripto');
  });
  it('registers two patients, sets HttpOnly cookies, ignores role escalation', async () => {
    for (const [email, key] of [
      ['patient@test.example', 'first'],
      ['other@test.example', 'second'],
    ]) {
      const result = await call('/auth/register', 'POST', {
        name: 'Test Patient',
        email,
        password: 'Patient-password-123',
        role: 'admin',
      });
      expect(result.response.status).toBe(201);
      const cookie = result.response.headers.get('set-cookie') || '';
      expect(cookie).toContain('HttpOnly');
      if (key === 'first') patientCookie = cookie.split(';')[0];
      else otherCookie = cookie.split(';')[0];
    }
    const me = await call('/me', 'GET', undefined, patientCookie);
    expect(me.data.role).toBe('patient');
  });
  it('rejects duplicate registrations and incorrect credentials', async () => {
    expect(
      (
        await call('/auth/register', 'POST', {
          name: 'Duplicate',
          email: 'patient@test.example',
          password: 'Patient-password-123',
        })
      ).response.status,
    ).toBe(409);
    expect(
      (
        await call('/auth/login', 'POST', {
          email: 'patient@test.example',
          password: 'wrong-password',
        })
      ).response.status,
    ).toBe(401);
  });
  it('persists profile updates and validates dates', async () => {
    const profile = {
      name: 'Updated Patient',
      phone: '12345',
      address: 'Sample address',
      gender: 'Other',
      dob: '2000-01-01',
    };
    expect((await call('/me', 'PATCH', profile, patientCookie)).response.status).toBe(200);
    expect((await call('/me', 'GET', undefined, patientCookie)).data.name).toBe('Updated Patient');
    expect(
      (await call('/me', 'PATCH', { ...profile, dob: '9999-12-01' }, patientCookie)).response
        .status,
    ).toBe(400);
  });
  it('requires authentication and blocks cross-origin mutations', async () => {
    expect((await call('/appointments', 'GET')).response.status).toBe(401);
    expect(
      (await call('/me', 'PATCH', {}, patientCookie, 'https://evil.example')).response.status,
    ).toBe(403);
    expect((await call('/admin/summary', 'GET', undefined, patientCookie)).response.status).toBe(
      403,
    );
  });
  it('returns doctors, upcoming slots and rejects off-grid bookings', async () => {
    const doctors = await call('/doctors');
    expect(Array.isArray(doctors.data)).toBe(true);
    expect((doctors.data as unknown as unknown[]).length).toBe(15);
    const slots = await call('/doctors/doc1/slots');
    slot = (slots.data.slots as string[])[0];
    expect(slot).toBeTruthy();
    expect(
      (
        await call(
          '/appointments',
          'POST',
          { doctorId: 'doc1', slot: '2020-01-01T09:00:00.000Z' },
          patientCookie,
        )
      ).response.status,
    ).toBe(400);
  });
  it('books an appointment and prevents a concurrent double booking', async () => {
    const results = await Promise.all([
      call('/appointments', 'POST', { doctorId: 'doc1', slot }, patientCookie),
      call('/appointments', 'POST', { doctorId: 'doc1', slot }, otherCookie),
    ]);
    expect(results.map((r) => r.response.status).sort()).toEqual([201, 409]);
    const index = results.findIndex((r) => r.response.status === 201);
    bookingId = String(results[index].data.id);
    if (index === 1) [patientCookie, otherCookie] = [otherCookie, patientCookie];
    const slots = await call('/doctors/doc1/slots');
    expect(slots.data.slots).not.toContain(slot);
  });
  it('blocks access to other patients and prevents double appointments for one patient', async () => {
    expect(
      (await call('/appointments/' + bookingId + '/cancel', 'POST', undefined, otherCookie))
        .response.status,
    ).toBe(403);
    expect(
      (await call('/appointments', 'POST', { doctorId: 'doc2', slot }, patientCookie)).response
        .status,
    ).toBe(409);
    const list = await call('/appointments', 'GET', undefined, otherCookie);
    expect(list.data).toEqual([]);
  });
  it('does not fake payment success without payment provider configuration', async () => {
    const config = await call('/config');
    expect(config.data.onlinePayments).toBe(false);
    expect(
      (await call('/appointments/' + bookingId + '/checkout', 'POST', undefined, patientCookie))
        .response.status,
    ).toBe(503);
  });
  it('authorizes staff and prevents premature completion', async () => {
    for (const role of ['admin', 'doctor']) {
      const result = await call('/auth/login', 'POST', {
        email: role + '@test.example',
        password: 'Staff-password-123',
      });
      expect(result.response.status).toBe(200);
      const cookie = (result.response.headers.get('set-cookie') || '').split(';')[0];
      if (role === 'admin') adminCookie = cookie;
      else doctorCookie = cookie;
    }
    expect((await call('/admin/summary', 'GET', undefined, adminCookie)).response.status).toBe(200);
    expect((await call('/admin/summary', 'GET', undefined, doctorCookie)).response.status).toBe(
      403,
    );
    expect(
      (await call('/appointments/' + bookingId + '/complete', 'POST', undefined, doctorCookie))
        .response.status,
    ).toBe(409);
  });
  it('updates doctor availability and rejects new bookings for unavailable providers', async () => {
    const d = await call('/staff/doctor', 'GET', undefined, doctorCookie);
    const body = { about: d.data.about, fee: 75, address: d.data.address, available: 0 };
    expect((await call('/staff/doctor', 'PATCH', body, doctorCookie)).response.status).toBe(200);
    expect((await call('/doctors/doc1/slots')).data.slots).toEqual([]);
    expect(
      (await call('/appointments', 'POST', { doctorId: 'doc1', slot }, otherCookie)).response
        .status,
    ).toBe(409);
    expect(
      (await call('/staff/doctor', 'PATCH', { ...body, available: 1 }, doctorCookie)).response
        .status,
    ).toBe(200);
  });
  it('cancels safely and makes the slot available again', async () => {
    expect(
      (await call('/appointments/' + bookingId + '/cancel', 'POST', undefined, patientCookie))
        .response.status,
    ).toBe(200);
    expect((await call('/doctors/doc1/slots')).data.slots).toContain(slot);
    expect(
      (await call('/appointments/' + bookingId + '/cancel', 'POST', undefined, patientCookie))
        .response.status,
    ).toBe(409);
  });
  it('admin creates and edits doctors with server validation', async () => {
    const body = {
      name: 'Dr. Test Specialist',
      speciality: 'Neurologist',
      degree: 'MD',
      experience: 8,
      about: 'A patient-centered physician with extensive clinical experience.',
      fee: 120,
      image: '/assets/doc3.webp',
      address: '12 Sample Clinic Road',
      available: 1,
    };
    const created = await call('/admin/doctors', 'POST', body, adminCookie);
    expect(created.response.status).toBe(201);
    expect(
      (await call('/admin/doctors/' + created.data.id, 'PATCH', { ...body, fee: 130 }, adminCookie))
        .response.status,
    ).toBe(200);
    expect(
      (await call('/admin/doctors', 'POST', { ...body, fee: -10 }, adminCookie)).response.status,
    ).toBe(400);
  });
  it('supports completed appointments, staff isolation and patient listing', async () => {
    const db = await mf.getD1Database('DB');
    const me = await call('/me', 'GET', undefined, patientCookie);
    await db
      .prepare(
        "INSERT INTO appointments(id,patient_id,doctor_id,slot,fee) VALUES('past-appointment',?,'doc1','2020-01-01T09:00:00.000Z',50)",
      )
      .bind(me.data.id)
      .run();
    expect(
      (await call('/appointments/past-appointment/complete', 'POST', undefined, doctorCookie))
        .response.status,
    ).toBe(200);
    expect((await call('/admin/patients', 'GET', undefined, adminCookie)).response.status).toBe(
      200,
    );
    const own = await call('/appointments', 'GET', undefined, doctorCookie);
    expect(
      (own.data as unknown as { doctor_id: string }[]).every((a) => a.doctor_id === 'doc1'),
    ).toBe(true);
  });
  it('revokes sessions on logout', async () => {
    expect((await call('/auth/logout', 'POST', undefined, patientCookie)).response.status).toBe(
      200,
    );
    expect((await call('/me', 'GET', undefined, patientCookie)).data).toBe(null);
  });
});
