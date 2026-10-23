import { describe, it, expect } from 'vitest';
import { availableSlots, isValidSlot, registerSchema, doctorSchema } from '../worker/domain';
import { hashPassword, verifyPassword } from '../worker/auth';
describe('scheduling and validation', () => {
  it('exposes exactly seven upcoming days of 30-minute UTC consultations', () => {
    const now = new Date('2026-10-23T13:15:00Z');
    const slots = availableSlots(now);
    expect(slots).toHaveLength(112);
    expect(slots[0]).toBe('2026-10-24T09:00:00.000Z');
    expect(slots.at(-1)).toBe('2026-10-30T16:30:00.000Z');
    expect(new Set(slots).size).toBe(112);
  });
  it('rejects past, distant and off-grid times', () => {
    const now = new Date('2026-10-23T13:00:00Z');
    for (const s of [
      '2026-10-22T09:00:00.000Z',
      '2026-10-24T09:15:00.000Z',
      '2026-11-24T09:00:00.000Z',
    ])
      expect(isValidSlot(s, now)).toBe(false);
  });
  it('validates credentials and normalizes email', () => {
    expect(
      registerSchema.parse({
        name: 'Test User',
        email: 'Test@Example.com',
        password: 'secure-password',
      }).email,
    ).toBe('test@example.com');
    expect(registerSchema.safeParse({ name: 'x', email: 'bad', password: 'short' }).success).toBe(
      false,
    );
  });
  it('rejects arbitrary third-party image URLs', () => {
    expect(
      doctorSchema.safeParse({
        name: 'Dr. Test',
        speciality: 'General physician',
        degree: 'MD',
        experience: 4,
        about: 'Experienced physician with patient focused care.',
        fee: 40,
        image: 'https://evil.example/image.svg',
        address: 'Sample clinic',
        available: 1,
      }).success,
    ).toBe(false);
  });
  it('uses salted password hashes and constant-time verification', () => {
    const a = hashPassword('a-long-password');
    const b = hashPassword('a-long-password');
    expect(a).not.toBe(b);
    expect(verifyPassword('a-long-password', a)).toBe(true);
    expect(verifyPassword('wrong-password', a)).toBe(false);
  });
});
