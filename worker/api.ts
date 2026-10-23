import { z } from 'zod';
import { timingSafeEqual, createHmac } from 'node:crypto';
import {
  registerSchema,
  loginSchema,
  profileSchema,
  bookingSchema,
  doctorSchema,
  availableSlots,
  isValidSlot,
} from './domain';
import { hashPassword, verifyPassword, digest, sessionCookie } from './auth';
import type { User } from '../src/types';
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
const json = (data: unknown, status = 200, headers: HeadersInit = {}) =>
  Response.json(data, { status, headers: { 'Cache-Control': 'no-store', ...headers } });
async function readBody(r: Request, max = 12000) {
  const reader = r.body?.getReader();
  if (!reader) return '';
  let size = 0;
  const chunks: Uint8Array[] = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) {
      await reader.cancel();
      throw new HttpError(413, 'Request too large');
    }
    chunks.push(value);
  }
  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.length;
  }
  return new TextDecoder().decode(body);
}
async function parse<T>(r: Request, schema: z.ZodType<T>): Promise<T> {
  if (!r.headers.get('content-type')?.includes('application/json'))
    throw new HttpError(415, 'Expected application/json');
  const data = await readBody(r);
  return schema.parse(JSON.parse(data));
}
export async function getUser(r: Request, env: Env): Promise<User | null> {
  const token = r.headers.get('cookie')?.match(/(?:^|;\s*)prescripto_session=([^;]+)/)?.[1];
  if (!token) return null;
  return env.DB.prepare(
    'SELECT u.id,u.name,u.email,u.role,u.phone,u.address,u.gender,u.dob FROM users u JOIN sessions s ON s.user_id=u.id WHERE s.token_hash=? AND s.expires_at>?',
  )
    .bind(await digest(token), Date.now())
    .first<User>();
}
async function auth(r: Request, env: Env, roles: string[] = []) {
  const u = await getUser(r, env);
  if (!u) throw new HttpError(401, 'Please sign in to continue');
  if (roles.length && !roles.includes(u.role))
    throw new HttpError(403, 'You do not have access to this action');
  return u;
}
async function limit(env: Env, key: string, max: number) {
  const now = Date.now();
  const row = await env.DB.prepare(
    'INSERT INTO rate_limits(key,count,expires_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN expires_at<? THEN 1 ELSE count+1 END,expires_at=CASE WHEN expires_at<? THEN excluded.expires_at ELSE expires_at END RETURNING count',
  )
    .bind(key, now + 900000, now, now)
    .first<{ count: number }>();
  if (row && row.count > max)
    throw new HttpError(429, 'Too many attempts. Please try again in 15 minutes.');
}
async function audit(env: Env, actor: string, action: string, entity: string) {
  await env.DB.prepare('INSERT INTO audit_log(id,actor_id,action,entity_id) VALUES(?,?,?,?)')
    .bind(crypto.randomUUID(), actor, action, entity)
    .run();
}
export async function api(r: Request, env: Env): Promise<Response> {
  const url = new URL(r.url),
    p = url.pathname,
    m = r.method;
  try {
    if (!['GET', 'HEAD'].includes(m) && p != '/api/payments/webhook') {
      if (r.headers.get('origin') && r.headers.get('origin') !== url.origin)
        throw new HttpError(403, 'Cross-origin request rejected');
      if (r.headers.get('sec-fetch-site') === 'cross-site')
        throw new HttpError(403, 'Cross-site request rejected');
    }
    if (p === '/api/health' && m === 'GET') {
      await env.DB.prepare('SELECT 1').first();
      return json({ status: 'ok', database: 'connected', mode: env.APP_MODE });
    }
    if (p === '/api/doctors' && m === 'GET') {
      return json(
        (
          await env.DB.prepare(
            'SELECT id,name,speciality,degree,experience,about,fee,image,address,available FROM doctors ORDER BY rowid',
          ).all()
        ).results,
      );
    }
    const slots = p.match(/^\/api\/doctors\/([^/]+)\/slots$/);
    if (slots && m === 'GET') {
      const d = await env.DB.prepare('SELECT available FROM doctors WHERE id=?')
        .bind(slots[1])
        .first<{ available: number }>();
      if (!d) throw new HttpError(404, 'Doctor not found');
      const taken = (
        await env.DB.prepare(
          "SELECT slot FROM appointments WHERE doctor_id=? AND status!='cancelled' AND slot>?",
        )
          .bind(slots[1], new Date().toISOString())
          .all<{ slot: string }>()
      ).results;
      return json({
        timezone: 'UTC',
        slots: d.available ? availableSlots().filter((s) => !taken.some((t) => t.slot === s)) : [],
      });
    }
    if ((p === '/api/auth/register' || p === '/api/auth/login') && m === 'POST') {
      await limit(env, `auth:${r.headers.get('cf-connecting-ip') || 'local'}`, 20);
      const registration = p.endsWith('register');
      const data = await parse(r, registration ? registerSchema : loginSchema);
      let id: string;
      if (registration) {
        id = crypto.randomUUID();
        try {
          await env.DB.prepare('INSERT INTO users(id,name,email,password_hash) VALUES(?,?,?,?)')
            .bind(id, 'name' in data ? data.name : '', data.email, hashPassword(data.password))
            .run();
        } catch (e) {
          if (String(e).includes('UNIQUE'))
            throw new HttpError(409, 'An account with this email already exists');
          throw e;
        }
      } else {
        const row = await env.DB.prepare('SELECT id,password_hash FROM users WHERE email=?')
          .bind(data.email)
          .first<{ id: string; password_hash: string }>();
        if (!row || !verifyPassword(data.password, row.password_hash))
          throw new HttpError(401, 'Email or password is incorrect');
        id = row.id;
      }
      const token = crypto.randomUUID() + crypto.randomUUID();
      await env.DB.batch([
        env.DB.prepare('DELETE FROM sessions WHERE expires_at<?').bind(Date.now()),
        env.DB.prepare('INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,?)').bind(
          await digest(token),
          id,
          Date.now() + 604800000,
        ),
      ]);
      return json({ ok: true }, registration ? 201 : 200, {
        'Set-Cookie': sessionCookie(token, url.protocol === 'https:'),
      });
    }
    if (p === '/api/auth/logout' && m === 'POST') {
      const token = r.headers.get('cookie')?.match(/prescripto_session=([^;]+)/)?.[1];
      if (token)
        await env.DB.prepare('DELETE FROM sessions WHERE token_hash=?')
          .bind(await digest(token))
          .run();
      return json({ ok: true }, 200, {
        'Set-Cookie': sessionCookie('', url.protocol === 'https:', true),
      });
    }
    if (p === '/api/me' && m === 'GET') return json(await getUser(r, env));
    if (p === '/api/me' && m === 'PATCH') {
      const u = await auth(r, env);
      const d = await parse(r, profileSchema);
      await env.DB.prepare('UPDATE users SET name=?,phone=?,address=?,gender=?,dob=? WHERE id=?')
        .bind(d.name, d.phone, d.address, d.gender, d.dob, u.id)
        .run();
      return json({ ok: true });
    }
    if (p === '/api/appointments' && m === 'GET') {
      const u = await auth(r, env);
      let where = 'a.patient_id=?',
        id = u.id;
      if (u.role === 'admin') where = '1=1';
      if (u.role === 'doctor') {
        where = 'd.user_id=?';
        id = u.id;
      }
      const statement = env.DB.prepare(
        `SELECT a.*,d.name doctor_name,d.image,d.speciality,d.address,u.name patient_name FROM appointments a JOIN doctors d ON a.doctor_id=d.id JOIN users u ON a.patient_id=u.id WHERE ${where} ORDER BY a.slot DESC LIMIT 500`,
      );
      return json((await (u.role === 'admin' ? statement : statement.bind(id)).all()).results);
    }
    if (p === '/api/appointments' && m === 'POST') {
      const u = await auth(r, env, ['patient']);
      await limit(env, `book:${u.id}`, 25);
      const d = await parse(r, bookingSchema);
      if (!isValidSlot(d.slot))
        throw new HttpError(400, 'Select a valid upcoming appointment slot');
      const id = crypto.randomUUID();
      try {
        const result = await env.DB.prepare(
          'INSERT INTO appointments(id,patient_id,doctor_id,slot,fee) SELECT ?,?,id,?,fee FROM doctors WHERE id=? AND available=1',
        )
          .bind(id, u.id, d.slot, d.doctorId)
          .run();
        if (!result.meta.changes) throw new HttpError(409, 'Doctor is not available');
      } catch (e) {
        if (String(e).includes('UNIQUE'))
          throw new HttpError(409, 'This time is already booked. Choose another slot.');
        throw e;
      }
      await audit(env, u.id, 'appointment.booked', id);
      return json({ id }, 201);
    }
    const action = p.match(/^\/api\/appointments\/([^/]+)\/(cancel|complete|checkout)$/);
    if (action && m === 'POST') {
      const u = await auth(r, env);
      const a = await env.DB.prepare(
        'SELECT a.*,d.user_id doctor_user FROM appointments a JOIN doctors d ON d.id=a.doctor_id WHERE a.id=?',
      )
        .bind(action[1])
        .first<{
          id: string;
          patient_id: string;
          doctor_user: string;
          status: string;
          fee: number;
          payment: string;
          slot: string;
        }>();
      if (!a) throw new HttpError(404, 'Appointment not found');
      const owner = a.patient_id === u.id,
        staff = u.role === 'admin' || (u.role === 'doctor' && a.doctor_user === u.id);
      if (!owner && !staff) throw new HttpError(403, 'You do not have access to this appointment');
      if (a.status !== 'booked') throw new HttpError(409, 'This appointment is no longer active');
      if (action[2] === 'checkout') {
        if (!owner) throw new HttpError(403, 'Only the patient can pay');
        if (a.payment === 'paid') throw new HttpError(409, 'Already paid');
        if (!env.STRIPE_SECRET_KEY)
          throw new HttpError(503, 'Online payments are not configured. Pay at the clinic.');
        const locked = await env.DB.prepare(
          "UPDATE appointments SET payment='pending' WHERE id=? AND status='booked' AND payment='clinic'",
        )
          .bind(a.id)
          .run();
        if (!locked.meta.changes)
          throw new HttpError(
            409,
            'A payment is already in progress. Contact the clinic if it was interrupted.',
          );
        const body = new URLSearchParams({
          mode: 'payment',
          success_url: `${url.origin}/appointments?payment=success`,
          cancel_url: `${url.origin}/appointments?payment=cancelled`,
          client_reference_id: a.id,
          'metadata[appointment_id]': a.id,
          'line_items[0][price_data][currency]': 'usd',
          'line_items[0][price_data][unit_amount]': String(a.fee * 100),
          'line_items[0][price_data][product_data][name]': 'Medical appointment',
          'line_items[0][quantity]': '1',
          expires_at: String(Math.floor(Date.now() / 1000) + 1800),
        });
        let response: Response;
        try {
          response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
              'Idempotency-Key': `appointment-${a.id}-${Math.floor(Date.now() / 1800000)}`,
            },
            body,
          });
        } catch {
          await env.DB.prepare(
            "UPDATE appointments SET payment='clinic' WHERE id=? AND payment='pending' AND stripe_session IS NULL",
          )
            .bind(a.id)
            .run();
          throw new HttpError(502, 'Payment service is unavailable');
        }
        const checkout = (await response.json()) as { url?: string; id?: string };
        if (!response.ok || !checkout.url || !checkout.id) {
          await env.DB.prepare(
            "UPDATE appointments SET payment='clinic' WHERE id=? AND payment='pending' AND stripe_session IS NULL",
          )
            .bind(a.id)
            .run();
          throw new HttpError(502, 'Payment service is unavailable');
        }
        await env.DB.prepare(
          "UPDATE appointments SET payment='pending',stripe_session=? WHERE id=?",
        )
          .bind(checkout.id, a.id)
          .run();
        return json({ url: checkout.url });
      }
      if (action[2] === 'complete' && !staff)
        throw new HttpError(403, 'Only clinic staff can complete appointments');
      if (action[2] === 'complete' && a.slot > new Date().toISOString())
        throw new HttpError(409, 'An appointment can be completed after its start time');
      if (action[2] === 'cancel' && a.payment !== 'clinic')
        throw new HttpError(
          409,
          'Contact the clinic to cancel a paid or pending-payment appointment',
        );
      const status = action[2] === 'cancel' ? 'cancelled' : 'completed';
      const changed = await env.DB.prepare(
        "UPDATE appointments SET status=? WHERE id=? AND status='booked' AND (?='completed' OR payment='clinic')",
      )
        .bind(status, a.id, status)
        .run();
      if (!changed.meta.changes)
        throw new HttpError(409, 'Appointment changed. Please refresh and try again.');
      await audit(env, u.id, `appointment.${status}`, a.id);
      return json({ ok: true });
    }
    if (p === '/api/config' && m === 'GET')
      return json({ onlinePayments: !!env.STRIPE_SECRET_KEY, mode: env.APP_MODE });
    if (p === '/api/payments/webhook' && m === 'POST') {
      if (!env.STRIPE_WEBHOOK_SECRET) throw new HttpError(503, 'Webhook not configured');
      const raw = await readBody(r, 100000);
      const signature = r.headers.get('stripe-signature') || '';
      const t = signature.match(/(?:^|,)t=(\d+)/)?.[1],
        values = [...signature.matchAll(/(?:^|,)v1=([a-f0-9]+)/g)].map((v) => v[1]);
      if (!t || Math.abs(Date.now() / 1000 - Number(t)) > 300)
        throw new HttpError(400, 'Invalid webhook timestamp');
      const expected = createHmac('sha256', env.STRIPE_WEBHOOK_SECRET)
        .update(`${t}.${raw}`)
        .digest();
      if (
        !values.some(
          (v) =>
            Buffer.from(v, 'hex').length === expected.length &&
            timingSafeEqual(Buffer.from(v, 'hex'), expected),
        )
      )
        throw new HttpError(400, 'Invalid signature');
      const event = JSON.parse(raw) as {
        id: string;
        type: string;
        data: {
          object: { id: string; payment_status: string; metadata: { appointment_id: string } };
        };
      };
      if (
        event.type === 'checkout.session.completed' &&
        event.data.object.payment_status === 'paid'
      ) {
        await env.DB.batch([
          env.DB.prepare('INSERT OR IGNORE INTO webhook_events(id) VALUES(?)').bind(event.id),
          env.DB.prepare(
            "UPDATE appointments SET payment='paid' WHERE id=? AND stripe_session=?",
          ).bind(event.data.object.metadata.appointment_id, event.data.object.id),
        ]);
      }
      if (event.type === 'checkout.session.expired') {
        await env.DB.prepare(
          "UPDATE appointments SET payment='clinic',stripe_session=NULL WHERE stripe_session=? AND payment='pending'",
        )
          .bind(event.data.object.id)
          .run();
      }
      return json({ received: true });
    }
    if (p === '/api/staff/doctor' && m === 'GET') {
      const u = await auth(r, env, ['doctor']);
      return json(await env.DB.prepare('SELECT * FROM doctors WHERE user_id=?').bind(u.id).first());
    }
    if (p === '/api/staff/doctor' && m === 'PATCH') {
      const u = await auth(r, env, ['doctor']);
      const d = await parse(
        r,
        doctorSchema.pick({ about: true, fee: true, address: true, available: true }),
      );
      await env.DB.prepare('UPDATE doctors SET about=?,fee=?,address=?,available=? WHERE user_id=?')
        .bind(d.about, d.fee, d.address, d.available, u.id)
        .run();
      await audit(env, u.id, 'doctor.updated', u.id);
      return json({ ok: true });
    }
    if (p === '/api/admin/summary' && m === 'GET') {
      await auth(r, env, ['admin']);
      return json(
        await env.DB.prepare(
          "SELECT (SELECT count(*) FROM doctors) doctors,(SELECT count(*) FROM users WHERE role='patient') patients,(SELECT count(*) FROM appointments WHERE status='booked') upcoming,(SELECT coalesce(sum(fee),0) FROM appointments WHERE payment='paid') revenue",
        ).first(),
      );
    }
    if (p === '/api/admin/patients' && m === 'GET') {
      await auth(r, env, ['admin']);
      return json(
        (
          await env.DB.prepare(
            "SELECT id,name,email,created_at FROM users WHERE role='patient' ORDER BY created_at DESC LIMIT 200",
          ).all()
        ).results,
      );
    }
    if (p === '/api/admin/doctors' && m === 'POST') {
      const u = await auth(r, env, ['admin']);
      const d = await parse(r, doctorSchema);
      const id = crypto.randomUUID();
      await env.DB.prepare(
        'INSERT INTO doctors(id,name,speciality,degree,experience,about,fee,image,address,available) VALUES(?,?,?,?,?,?,?,?,?,?)',
      )
        .bind(
          id,
          d.name,
          d.speciality,
          d.degree,
          d.experience,
          d.about,
          d.fee,
          d.image,
          d.address,
          d.available,
        )
        .run();
      await audit(env, u.id, 'doctor.created', id);
      return json({ id }, 201);
    }
    const edit = p.match(/^\/api\/admin\/doctors\/([^/]+)$/);
    if (edit && m === 'PATCH') {
      const u = await auth(r, env, ['admin']);
      const d = await parse(r, doctorSchema);
      const res = await env.DB.prepare(
        'UPDATE doctors SET name=?,speciality=?,degree=?,experience=?,about=?,fee=?,image=?,address=?,available=? WHERE id=?',
      )
        .bind(
          d.name,
          d.speciality,
          d.degree,
          d.experience,
          d.about,
          d.fee,
          d.image,
          d.address,
          d.available,
          edit[1],
        )
        .run();
      if (!res.meta.changes) throw new HttpError(404, 'Doctor not found');
      await audit(env, u.id, 'doctor.updated', edit[1]);
      return json({ ok: true });
    }
    throw new HttpError(404, 'API route not found');
  } catch (error) {
    if (error instanceof z.ZodError)
      return json({ error: error.issues[0]?.message || 'Invalid input' }, 400);
    if (error instanceof SyntaxError) return json({ error: 'Invalid JSON body' }, 400);
    if (error instanceof HttpError) return json({ error: error.message }, error.status);
    console.error(JSON.stringify({ event: 'request.failed', path: p, error: String(error) }));
    return json({ error: 'Something went wrong. Please try again.' }, 500);
  }
}
